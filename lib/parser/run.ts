import { createServiceClient } from '@/lib/supabase/service'
import { normalize } from './normalize'
import { extract } from './extract'
import { validate } from './validate'
import { match, type ExistingSubscription } from './match'
import { sendNewSubscriptionEmail } from '@/lib/email'

const PARSER_NAME = 'gpt4o-mini-v1'
const PARSER_VERSION = '1.0.0'
const PROMPT_VERSION_FALLBACK = '1'

export type RunParseResult = {
  status: 'ok' | 'skipped' | 'failed' | 'error'
  message?: string
  detail?: string
  reason?: string
  parser_run_id?: string
  classification?: string
  needs_review?: boolean
  soundings_written?: number
  subscriptions_inserted?: number
  subscriptions_updated?: number
}

export async function runParse(receipt_id: string, pod_id: string): Promise<RunParseResult> {
  try {
    const supabase = createServiceClient()

    const { data: promptRow } = await supabase
      .from('prompt_templates')
      .select('version, system_prompt, model_hint, variables_schema')
      .eq('agent_name', 'email_extractor')
      .eq('is_active', true)
      .maybeSingle()

    const thresholds = (promptRow?.variables_schema as Record<string, Record<string, number>> | null)
      ?.thresholds ?? {}
    const needsReviewBelow: number = thresholds.needs_review_below ?? 0.65
    const promptVersion = promptRow?.version?.toString() ?? PROMPT_VERSION_FALLBACK
    const modelName = promptRow?.model_hint ?? 'gpt-4o-mini'

    const { data: receipt, error: receiptError } = await supabase
      .from('inbound_receipts')
      .select('*')
      .eq('id', receipt_id)
      .maybeSingle()

    if (receiptError || !receipt) {
      return { status: 'failed', message: 'receipt_not_found' }
    }

    if (
      receipt.parser_status === 'parsed' ||
      receipt.parser_status === 'ignored' ||
      receipt.last_parser_run_id
    ) {
      return { status: 'skipped', reason: 'already_processed' }
    }

    // Gmail's auto-forwarder rewrites From: to e.g. `inbound.subsounder.com@gmail.com`
    // — the original recipient lives in the localpart, not the domain. Substring-match
    // on from_email catches that loopback (see #29).
    const fromEmail = (receipt.from_email ?? '').toLowerCase()
    if (fromEmail.includes('subsounder.com')) {
      await supabase
        .from('inbound_receipts')
        .update({
          parser_status: 'ignored',
          write_decision: 'skipped',
          write_reason: 'self_sender_loopback',
          processed_at: new Date().toISOString(),
        })
        .eq('id', receipt_id)
      return { status: 'skipped', reason: 'self_sender_loopback' }
    }

    const { normalized_text, input_hash, input_excerpt } = normalize({
      bodyText: receipt.body_text ?? undefined,
      bodyHtml: receipt.body_html ?? undefined,
      subject: receipt.subject ?? undefined,
      fromEmail: receipt.from_email ?? undefined,
      fromDomain: receipt.from_domain ?? undefined,
      toEmail: receipt.to_email ?? undefined,
    })

    const { data: existingRun } = await supabase
      .from('parser_runs')
      .select('id')
      .eq('inbound_receipt_id', receipt_id)
      .eq('parser_name', PARSER_NAME)
      .eq('input_hash', input_hash)
      .maybeSingle()

    if (existingRun) {
      return { status: 'skipped', reason: 'duplicate_run' }
    }

    let extraction
    try {
      const today = new Date().toISOString().slice(0, 10)
      const renderedPrompt = promptRow?.system_prompt?.replace(/\{\{TODAY\}\}/g, today)
      extraction = await extract(normalized_text, renderedPrompt, promptRow?.model_hint ?? undefined)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'extraction_failed'
      await supabase.from('parser_runs').insert({
        pod_id,
        profile_id: receipt.profile_id,
        inbound_receipt_id: receipt_id,
        parser_name: PARSER_NAME,
        parser_version: PARSER_VERSION,
        model_name: modelName,
        prompt_version: promptVersion,
        status: 'error',
        needs_review: true,
        input_hash,
        input_excerpt,
        error_code: 'extraction_failed',
        error_detail: errMsg,
      })
      await supabase
        .from('inbound_receipts')
        .update({ parser_status: 'error', error_code: 'extraction_failed', error_detail: errMsg })
        .eq('id', receipt_id)
      return { status: 'error', message: errMsg }
    }

    const { valid, errors: validationErrors, parser_run_status } = validate(extraction)

    const needsReview =
      parser_run_status === 'error' ||
      valid.classification === 'maybe_subscription' ||
      (parser_run_status !== 'no_signal' && valid.confidence < needsReviewBelow)

    const { data: parserRun, error: runInsertError } = await supabase
      .from('parser_runs')
      .insert({
        pod_id,
        profile_id: receipt.profile_id,
        inbound_receipt_id: receipt_id,
        parser_name: PARSER_NAME,
        parser_version: PARSER_VERSION,
        model_name: modelName,
        prompt_version: promptVersion,
        status: parser_run_status,
        classification: valid.classification,
        confidence: valid.confidence,
        needs_review: needsReview,
        input_hash,
        input_excerpt,
        output_json: valid,
        ...(validationErrors.length > 0
          ? { error_detail: validationErrors.join('; ') }
          : {}),
      })
      .select('id')
      .single()

    if (runInsertError || !parserRun) {
      return { status: 'failed', message: 'parser_run_insert_failed', detail: runInsertError?.message }
    }

    const parserRunId = parserRun.id

    const [{ data: existingSubscriptions }, { data: profile }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select(
          'id, provider_name, provider_domain, billed_by_name, billed_by_domain, display_name, product, plan_name, instance, last_observed_content_date, status',
        )
        .eq('pod_id', pod_id)
        .eq('deleted_by_user', false),
      supabase.from('profiles').select('email').eq('pod_id', pod_id).maybeSingle(),
    ])

    const subs: ExistingSubscription[] = existingSubscriptions ?? []
    const profileEmail = profile?.email ?? null

    let soundingsWritten = 0
    let subscriptionsInserted = 0
    let subscriptionsUpdated = 0
    let subscriptionsSkipped = 0
    let firstResolvedSubscriptionId: string | null = null
    let emailsSent = 0
    let emailsFailed = 0
    const emailErrors: string[] = []
    const writeErrors: string[] = []

    for (const signal of valid.signals) {
      const { data: sounding, error: soundingError } = await supabase
        .from('soundings_log')
        .insert({
          parser_run_id: parserRunId,
          pod_id,
          inbound_receipt_id: receipt_id,
          signal_type: signal.signal_type,
          provider_name: signal.provider_name,
          provider_domain: signal.provider_domain,
          product: signal.product,
          plan_name: signal.plan_name,
          instance: signal.instance,
          billed_by_name: signal.billed_by_name,
          billed_by_domain: signal.billed_by_domain,
          amount: signal.amount,
          currency: signal.currency,
          billing_cadence: signal.billing_cadence,
          event_date: signal.event_date,
          next_renewal_at: signal.next_renewal_at,
          cancel_by_at: signal.cancel_by_at,
          confidence: signal.confidence,
          evidence: signal.evidence,
          raw_extract: signal,
        })
        .select('id')
        .single()

      if (soundingError) {
        writeErrors.push(`sounding_insert_failed: ${soundingError.message}`)
        console.error('[run-parse] sounding insert error:', soundingError)
        continue
      }
      if (!sounding) continue
      soundingsWritten++

      const matchResult = match(signal, subs, pod_id)

      let productId: string | null = null
      let cancellationUrl: string | null = null
      let cancellationDifficulty: number | null = null

      if (signal.provider_domain) {
        const domain = signal.provider_domain.toLowerCase()
        // For multi-product providers (Adobe Photoshop vs Adobe Lightroom), the
        // signal's `product` discriminates. For single-product providers (Spotify,
        // Netflix), product is null and we fall back to provider_name so we still
        // find or create the right products row.
        const productName = signal.product ?? signal.provider_name ?? domain
        const { data: product } = await supabase
          .from('products')
          .select('id, cancellation_url, cancellation_difficulty')
          .eq('website', domain)
          .ilike('name', productName)
          .maybeSingle()

        if (product) {
          productId = product.id
          cancellationUrl = product.cancellation_url
          cancellationDifficulty = product.cancellation_difficulty
        } else {
          const { data: newProduct, error: productInsertError } = await supabase
            .from('products')
            .insert({
              name: productName,
              provider_name: signal.provider_name ?? domain,
              website: domain,
              enrichment_status: 'pending',
            })
            .select('id')
            .single()
          if (productInsertError) {
            writeErrors.push(`product_insert_failed: ${productInsertError.message}`)
            console.error('[run-parse] product insert error:', productInsertError)
          }
          if (newProduct) productId = newProduct.id
        }
      }

      const subPayload = {
        ...matchResult.subscriptionPayload,
        ...(productId != null ? { product_id: productId } : {}),
        ...(cancellationUrl != null ? { cancellation_url: cancellationUrl } : {}),
        ...(cancellationDifficulty != null ? { cancellation_difficulty: cancellationDifficulty } : {}),
      }

      let resolvedSubscriptionId: string | null = null

      if (matchResult.action === 'insert') {
        const { data: newSub, error: subInsertError } = await supabase
          .from('subscriptions')
          .insert(subPayload)
          .select('id')
          .single()

        if (subInsertError) {
          writeErrors.push(`sub_insert_failed: ${subInsertError.message}`)
          console.error('[run-parse] subscription insert error:', subInsertError, 'payload:', subPayload)
        } else if (newSub) {
          resolvedSubscriptionId = newSub.id
          subscriptionsInserted++
          subs.push({
            id: newSub.id,
            provider_name: matchResult.subscriptionPayload.provider_name,
            provider_domain: matchResult.subscriptionPayload.provider_domain,
            billed_by_name: matchResult.subscriptionPayload.billed_by_name,
            billed_by_domain: matchResult.subscriptionPayload.billed_by_domain,
            display_name: matchResult.subscriptionPayload.display_name,
            product: matchResult.subscriptionPayload.product,
            plan_name: matchResult.subscriptionPayload.plan_name,
            instance: matchResult.subscriptionPayload.instance,
            last_observed_content_date: matchResult.subscriptionPayload.last_observed_content_date,
            status: matchResult.subscriptionPayload.status,
          })
        }
      } else if (matchResult.action === 'update' && matchResult.matched_id) {
        const { error: subUpdateError } = await supabase
          .from('subscriptions')
          .update(subPayload)
          .eq('id', matchResult.matched_id)

        if (subUpdateError) {
          writeErrors.push(`sub_update_failed: ${subUpdateError.message}`)
          console.error('[run-parse] subscription update error:', subUpdateError, 'payload:', subPayload)
        } else {
          resolvedSubscriptionId = matchResult.matched_id
          subscriptionsUpdated++
          const idx = subs.findIndex((s) => s.id === matchResult.matched_id)
          if (idx >= 0) {
            subs[idx] = { ...subs[idx], ...matchResult.subscriptionPayload, id: matchResult.matched_id }
          }
        }
      } else {
        subscriptionsSkipped++
      }

      if (resolvedSubscriptionId) {
        const { data: newCycle, error: cycleInsertError } = await supabase
          .from('subscription_cycles')
          .insert({
            subscription_id: resolvedSubscriptionId,
            ...matchResult.cyclePayload,
            source_sounding_id: sounding.id,
          })
          .select('id')
          .single()

        if (cycleInsertError) {
          writeErrors.push(`cycle_insert_failed: ${cycleInsertError.message}`)
          console.error('[run-parse] cycle insert error:', cycleInsertError)
        }

        if (newCycle) {
          // #7 cycle-promotion guard: don't promote a cycle whose next_renewal_at
          // is older than the existing current cycle's. The Google Home triple-
          // forward bug surfaced because a higher-confidence stale cycle was
          // overwriting a properly-future one. We prefer the future date over
          // raw confidence in this tiebreak.
          const { data: currentSub } = await supabase
            .from('subscriptions')
            .select('current_cycle_id')
            .eq('id', resolvedSubscriptionId)
            .single()

          let promote = true
          if (currentSub?.current_cycle_id && currentSub.current_cycle_id !== newCycle.id) {
            const { data: existingCycle } = await supabase
              .from('subscription_cycles')
              .select('next_renewal_at')
              .eq('id', currentSub.current_cycle_id)
              .maybeSingle()

            const newRenewal = matchResult.cyclePayload.next_renewal_at
            const existingRenewal = existingCycle?.next_renewal_at ?? null

            if (existingRenewal && newRenewal) {
              promote = new Date(newRenewal).getTime() >= new Date(existingRenewal).getTime()
            } else if (existingRenewal && !newRenewal) {
              promote = false
            }
          }

          if (promote) {
            await supabase
              .from('subscriptions')
              .update({ current_cycle_id: newCycle.id })
              .eq('id', resolvedSubscriptionId)
          }
        }
      }

      if (resolvedSubscriptionId && !firstResolvedSubscriptionId) {
        firstResolvedSubscriptionId = resolvedSubscriptionId
      }

      await supabase
        .from('soundings_log')
        .update({
          resolved_subscription_id: resolvedSubscriptionId,
          write_action: matchResult.action,
        })
        .eq('id', sounding.id)

      if (matchResult.action === 'insert' && profileEmail && resolvedSubscriptionId) {
        try {
          await sendNewSubscriptionEmail(profileEmail, {
            display_name: matchResult.subscriptionPayload.display_name,
            amount: matchResult.cyclePayload.amount,
            currency: matchResult.cyclePayload.currency,
            billing_cadence: matchResult.cyclePayload.billing_cadence,
            next_renewal_at: matchResult.cyclePayload.next_renewal_at,
            cancellation_url: cancellationUrl,
          })
          emailsSent++
        } catch (err) {
          emailsFailed++
          const msg = err instanceof Error ? err.message : String(err)
          emailErrors.push(msg)
          console.error('[run-parse] new subscription email failed:', msg)
        }
      }
    }

    await supabase
      .from('parser_runs')
      .update({
        actions: {
          soundings_written: soundingsWritten,
          subscriptions_inserted: subscriptionsInserted,
          subscriptions_updated: subscriptionsUpdated,
          subscriptions_skipped: subscriptionsSkipped,
          emails_sent: emailsSent,
          emails_failed: emailsFailed,
          ...(emailErrors.length > 0 ? { email_errors: emailErrors } : {}),
          ...(writeErrors.length > 0 ? { write_errors: writeErrors } : {}),
        },
        ...(writeErrors.length > 0
          ? { error_detail: writeErrors.join('; ') }
          : {}),
      })
      .eq('id', parserRunId)

    const writeDecision =
      subscriptionsInserted > 0
        ? 'inserted'
        : subscriptionsUpdated > 0
          ? 'updated'
          : subscriptionsSkipped > 0
            ? 'skipped'
            : 'no_signal'

    const hasWriteErrors = writeErrors.length > 0

    await supabase
      .from('inbound_receipts')
      .update({
        parser_status: parser_run_status === 'error' || hasWriteErrors ? 'error' : 'parsed',
        last_parser_run_id: parserRunId,
        resolved_subscription_id: firstResolvedSubscriptionId,
        write_decision: writeDecision,
        write_reason: parser_run_status,
        processed_at: new Date().toISOString(),
        ...(hasWriteErrors
          ? { error_code: 'write_failed', error_detail: writeErrors.join('; ') }
          : {}),
      })
      .eq('id', receipt_id)

    return {
      status: 'ok',
      parser_run_id: parserRunId,
      classification: valid.classification,
      needs_review: needsReview,
      soundings_written: soundingsWritten,
      subscriptions_inserted: subscriptionsInserted,
      subscriptions_updated: subscriptionsUpdated,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unexpected_error'
    return { status: 'failed', message }
  }
}
