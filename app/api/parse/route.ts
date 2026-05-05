import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { normalize } from '@/lib/parser/normalize'
import { extract } from '@/lib/parser/extract'
import { validate } from '@/lib/parser/validate'
import { match, type ExistingSubscription } from '@/lib/parser/match'
import { sendNewSubscriptionEmail } from '@/lib/email'

const PARSER_NAME = 'gpt4o-mini-v1'
const PARSER_VERSION = '1.0.0'
const MODEL_NAME = 'gpt-4o-mini'
const PROMPT_VERSION = '1.0.0'

export async function POST(req: NextRequest) {
  try {
    // 1. Validate secret header
    const parseSecret = process.env.PARSE_SECRET
    if (!parseSecret || req.headers.get('x-parse-secret') !== parseSecret) {
      return NextResponse.json({ status: 'failed', message: 'unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as { receipt_id?: string; pod_id?: string }
    const { receipt_id, pod_id } = body
    if (!receipt_id || !pod_id) {
      return NextResponse.json({ status: 'failed', message: 'missing_fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 2. Fetch receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('inbound_receipts')
      .select('*')
      .eq('id', receipt_id)
      .maybeSingle()

    if (receiptError || !receipt) {
      return NextResponse.json({ status: 'failed', message: 'receipt_not_found' }, { status: 404 })
    }

    // 3. Idempotency guard
    if (
      receipt.parser_status === 'parsed' ||
      receipt.parser_status === 'ignored' ||
      receipt.last_parser_run_id
    ) {
      return NextResponse.json({ status: 'skipped', reason: 'already_processed' })
    }

    // 4. Normalize → input_hash
    const { normalized_text, input_hash, input_excerpt } = normalize({
      bodyText: receipt.body_text ?? undefined,
      bodyHtml: receipt.body_html ?? undefined,
      subject: receipt.subject ?? undefined,
      fromEmail: receipt.from_email ?? undefined,
      fromDomain: receipt.from_domain ?? undefined,
      toEmail: receipt.to_email ?? undefined,
    })

    // 5. Idempotency on parser_runs
    const { data: existingRun } = await supabase
      .from('parser_runs')
      .select('id')
      .eq('inbound_receipt_id', receipt_id)
      .eq('parser_name', PARSER_NAME)
      .eq('input_hash', input_hash)
      .maybeSingle()

    if (existingRun) {
      return NextResponse.json({ status: 'skipped', reason: 'duplicate_run' })
    }

    // 6. Call GPT-4 mini
    let extraction
    try {
      extraction = await extract(normalized_text)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'extraction_failed'
      await supabase.from('parser_runs').insert({
        pod_id,
        profile_id: receipt.profile_id,
        inbound_receipt_id: receipt_id,
        parser_name: PARSER_NAME,
        parser_version: PARSER_VERSION,
        model_name: MODEL_NAME,
        prompt_version: PROMPT_VERSION,
        status: 'error',
        input_hash,
        input_excerpt,
        error_code: 'extraction_failed',
        error_detail: errMsg,
      })
      await supabase
        .from('inbound_receipts')
        .update({ parser_status: 'error', error_code: 'extraction_failed', error_detail: errMsg })
        .eq('id', receipt_id)
      return NextResponse.json({ status: 'error', message: errMsg }, { status: 500 })
    }

    // 7. Validate extract → suggest parser_run_status
    const { valid, errors: validationErrors, parser_run_status } = validate(extraction)

    // 8. Insert parser_runs row
    const { data: parserRun, error: runInsertError } = await supabase
      .from('parser_runs')
      .insert({
        pod_id,
        profile_id: receipt.profile_id,
        inbound_receipt_id: receipt_id,
        parser_name: PARSER_NAME,
        parser_version: PARSER_VERSION,
        model_name: MODEL_NAME,
        prompt_version: PROMPT_VERSION,
        status: parser_run_status,
        classification: valid.classification,
        confidence: valid.confidence,
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
      return NextResponse.json(
        { status: 'failed', message: 'parser_run_insert_failed', detail: runInsertError?.message },
        { status: 500 },
      )
    }

    const parserRunId = parserRun.id

    // Fetch existing subscriptions for matching
    const { data: existingSubscriptions } = await supabase
      .from('subscriptions')
      .select(
        'id, provider_name, provider_domain, billed_by_name, billed_by_domain, display_name, plan_name, amount, currency, last_observed_content_date, billing_cadence, next_renewal_at, cancel_by_at, status',
      )
      .eq('pod_id', pod_id)

    const subs: ExistingSubscription[] = existingSubscriptions ?? []

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('pod_id', pod_id)
      .maybeSingle()
    const profileEmail = profile?.email ?? null

    let soundingsWritten = 0
    let subscriptionsInserted = 0
    let subscriptionsUpdated = 0
    let subscriptionsSkipped = 0
    let firstResolvedSubscriptionId: string | null = null

    // 9. For each signal
    for (const signal of valid.signals) {
      // a. Insert soundings_log row
      const { data: sounding, error: soundingError } = await supabase
        .from('soundings_log')
        .insert({
          parser_run_id: parserRunId,
          pod_id,
          inbound_receipt_id: receipt_id,
          signal_type: signal.signal_type,
          merchant_name: signal.merchant_name,
          merchant_domain: signal.merchant_domain,
          billed_by_name: signal.billed_by_name,
          billed_by_domain: signal.billed_by_domain,
          plan_name: signal.plan_name,
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

      if (soundingError || !sounding) continue
      soundingsWritten++

      // b. Score against existing subscriptions
      const matchResult = match(signal, subs, pod_id)
      let resolvedSubscriptionId: string | null = null

      if (matchResult.action === 'insert') {
        // c. Insert new subscription
        const { data: newSub, error: subInsertError } = await supabase
          .from('subscriptions')
          .insert(matchResult.payload)
          .select('id')
          .single()

        if (!subInsertError && newSub) {
          resolvedSubscriptionId = newSub.id
          subscriptionsInserted++
          // Add to local subs cache so subsequent signals in this run can match against it
          subs.push({
            id: newSub.id,
            provider_name: matchResult.payload.provider_name,
            provider_domain: matchResult.payload.provider_domain,
            billed_by_name: matchResult.payload.billed_by_name,
            billed_by_domain: matchResult.payload.billed_by_domain,
            display_name: matchResult.payload.display_name,
            plan_name: matchResult.payload.plan_name,
            amount: matchResult.payload.amount,
            currency: matchResult.payload.currency,
            last_observed_content_date: matchResult.payload.last_observed_content_date,
            billing_cadence: matchResult.payload.billing_cadence,
            next_renewal_at: matchResult.payload.next_renewal_at,
            cancel_by_at: matchResult.payload.cancel_by_at,
            status: matchResult.payload.status,
          })
        }
      } else if (matchResult.action === 'update' && matchResult.matched_id) {
        // c. Update existing subscription
        const { error: subUpdateError } = await supabase
          .from('subscriptions')
          .update(matchResult.payload)
          .eq('id', matchResult.matched_id)

        if (!subUpdateError) {
          resolvedSubscriptionId = matchResult.matched_id
          subscriptionsUpdated++
          const idx = subs.findIndex((s) => s.id === matchResult.matched_id)
          if (idx >= 0) {
            subs[idx] = { ...subs[idx], ...matchResult.payload, id: matchResult.matched_id }
          }
        }
      } else {
        subscriptionsSkipped++
      }

      if (resolvedSubscriptionId && !firstResolvedSubscriptionId) {
        firstResolvedSubscriptionId = resolvedSubscriptionId
      }

      // d. Update soundings_log with outcome
      await supabase
        .from('soundings_log')
        .update({
          resolved_subscription_id: resolvedSubscriptionId,
          write_action: matchResult.action,
        })
        .eq('id', sounding.id)

      // e. Send "new subscription" notification email
      if (matchResult.action === 'insert' && profileEmail) {
        sendNewSubscriptionEmail(profileEmail, {
          display_name: matchResult.payload.display_name,
          amount: matchResult.payload.amount,
          currency: matchResult.payload.currency,
          billing_cadence: matchResult.payload.billing_cadence,
          next_renewal_at: matchResult.payload.next_renewal_at,
          cancellation_url: null,
        }).catch((err) => console.error('[parse] new subscription email failed:', err))
      }
    }

    // 10. Update parser_runs.actions
    await supabase
      .from('parser_runs')
      .update({
        actions: {
          soundings_written: soundingsWritten,
          subscriptions_inserted: subscriptionsInserted,
          subscriptions_updated: subscriptionsUpdated,
          subscriptions_skipped: subscriptionsSkipped,
        },
      })
      .eq('id', parserRunId)

    // 11. Update inbound_receipts
    const writeDecision =
      subscriptionsInserted > 0
        ? 'inserted'
        : subscriptionsUpdated > 0
          ? 'updated'
          : subscriptionsSkipped > 0
            ? 'skipped'
            : 'no_signal'

    await supabase
      .from('inbound_receipts')
      .update({
        parser_status: parser_run_status === 'error' ? 'error' : 'parsed',
        last_parser_run_id: parserRunId,
        resolved_subscription_id: firstResolvedSubscriptionId,
        write_decision: writeDecision,
        write_reason: parser_run_status,
        processed_at: new Date().toISOString(),
      })
      .eq('id', receipt_id)

    return NextResponse.json({
      status: 'ok',
      parser_run_id: parserRunId,
      classification: valid.classification,
      soundings_written: soundingsWritten,
      subscriptions_inserted: subscriptionsInserted,
      subscriptions_updated: subscriptionsUpdated,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unexpected_error'
    return NextResponse.json({ status: 'failed', message }, { status: 500 })
  }
}
