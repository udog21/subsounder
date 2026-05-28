import type { ExtractionSignal } from './extract'

export interface ExistingSubscription {
  id: string
  provider_name: string | null
  provider_domain: string | null
  billed_by_name: string | null
  billed_by_domain: string | null
  display_name: string
  product: string | null
  plan_name: string | null
  instance: string | null
  last_observed_content_date: string | null
  status: string
}

export interface SubscriptionUpsert {
  pod_id: string
  display_name: string
  provider_name: string | null
  provider_domain: string | null
  billed_by_name: string | null
  billed_by_domain: string | null
  product: string | null
  plan_name: string | null
  instance: string | null
  last_observed_content_date: string | null
  last_source_type: string
  source: string
  confidence: number
  status: string
}

export interface CycleInsert {
  signal_type: string
  amount: number | null
  currency: string | null
  billing_cadence: string | null
  period_start: string | null
  next_renewal_at: string | null
  cancel_by_at: string | null
}

export interface MatchResult {
  action: 'insert' | 'update' | 'skip'
  matched_id?: string
  subscriptionPayload: SubscriptionUpsert
  cyclePayload: CycleInsert
}

const MATCH_THRESHOLD = 60

function normalizeText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreMatch(signal: ExtractionSignal, existing: ExistingSubscription): number {
  let score = 0

  if (
    signal.provider_domain &&
    existing.provider_domain &&
    signal.provider_domain.toLowerCase() === existing.provider_domain.toLowerCase()
  ) {
    score += 40
  }

  if (
    signal.billed_by_domain &&
    existing.billed_by_domain &&
    signal.billed_by_domain.toLowerCase() === existing.billed_by_domain.toLowerCase()
  ) {
    score += 35
  }

  const signalName = normalizeText(signal.provider_name)
  const existingName = normalizeText(existing.display_name)
  if (signalName && existingName) {
    if (signalName === existingName) {
      score += 25
    } else if (signalName.includes(existingName) || existingName.includes(signalName)) {
      score += 15
    }
  }

  // product: layer below provider. Mismatch is a strong "distinct product within
  // same provider" signal (e.g. Adobe Photoshop vs Adobe Lightroom). Asymmetric
  // null handling — signal-has/existing-null leans toward "new structured row,
  // not enrichment"; existing-has/signal-null is permitted as bare-signal coverage.
  const signalProduct = normalizeText(signal.product)
  const existingProduct = normalizeText(existing.product)
  if (signalProduct && existingProduct) {
    if (signalProduct === existingProduct) score += 15
    else score -= 25
  } else if (signalProduct && !existingProduct) {
    score -= 10
  }

  // instance: identity layer. Mismatch is almost always a different subscription
  // (lightbox.house vs busyskipper.bot at the same registrar). Strongest penalty.
  const signalInstance = normalizeText(signal.instance)
  const existingInstance = normalizeText(existing.instance)
  if (signalInstance && existingInstance) {
    if (signalInstance === existingInstance) score += 15
    else score -= 40
  } else if (signalInstance && !existingInstance) {
    score -= 15
  }

  // plan_name: mutable tier. Match boosts but mismatch carries no penalty —
  // plan changes (Basic → Premium) update in place, they do not fork.
  const signalPlan = normalizeText(signal.plan_name)
  const existingPlan = normalizeText(existing.plan_name)
  if (signalPlan && existingPlan && signalPlan === existingPlan) {
    score += 5
  }

  return score
}

function deriveStatus(signalType: string): string {
  if (signalType === 'cancellation_confirm') return 'cancelled'
  if (signalType === 'trial_start') return 'trial'
  return 'active'
}

function buildSubscriptionPayload(signal: ExtractionSignal, podId: string): SubscriptionUpsert {
  return {
    pod_id: podId,
    display_name: signal.provider_name ?? signal.billed_by_name ?? 'Unknown',
    provider_name: signal.provider_name,
    provider_domain: signal.provider_domain,
    billed_by_name: signal.billed_by_name,
    billed_by_domain: signal.billed_by_domain,
    product: signal.product,
    plan_name: signal.plan_name,
    instance: signal.instance,
    last_observed_content_date: signal.event_date,
    last_source_type: 'inbound_receipt',
    source: 'parser',
    confidence: signal.confidence,
    status: deriveStatus(signal.signal_type),
  }
}

function buildUpdateSubscriptionPayload(
  signal: ExtractionSignal,
  existing: ExistingSubscription,
  podId: string,
): SubscriptionUpsert {
  const signalTs = signal.event_date ? new Date(signal.event_date).getTime() : 0
  const existingTs = existing.last_observed_content_date
    ? new Date(existing.last_observed_content_date).getTime()
    : 0
  const isNewer = signalTs > existingTs

  const base = buildSubscriptionPayload(signal, podId)

  if (isNewer) {
    return {
      ...base,
      provider_name: signal.provider_name ?? existing.provider_name,
      provider_domain: signal.provider_domain ?? existing.provider_domain,
      billed_by_name: signal.billed_by_name ?? existing.billed_by_name,
      billed_by_domain: signal.billed_by_domain ?? existing.billed_by_domain,
      product: signal.product ?? existing.product,
      plan_name: signal.plan_name ?? existing.plan_name,
      instance: signal.instance ?? existing.instance,
      last_observed_content_date: signal.event_date ?? existing.last_observed_content_date,
    }
  }

  // Older signal: only fill fields currently null on the existing record. #7
  // out-of-order guard — a January receipt forwarded in May must not overwrite
  // the May renewal_at that landed earlier.
  return {
    ...base,
    provider_name: existing.provider_name ?? signal.provider_name,
    provider_domain: existing.provider_domain ?? signal.provider_domain,
    billed_by_name: existing.billed_by_name ?? signal.billed_by_name,
    billed_by_domain: existing.billed_by_domain ?? signal.billed_by_domain,
    product: existing.product ?? signal.product,
    plan_name: existing.plan_name ?? signal.plan_name,
    instance: existing.instance ?? signal.instance,
    last_observed_content_date: existing.last_observed_content_date ?? signal.event_date,
  }
}

function advanceByCadence(iso: string, cadence: string): string {
  const d = new Date(iso)
  if (cadence === 'weekly') d.setUTCDate(d.getUTCDate() + 7)
  else if (cadence === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1)
  else if (cadence === 'quarterly') d.setUTCMonth(d.getUTCMonth() + 3)
  else if (cadence === 'annual') d.setUTCFullYear(d.getUTCFullYear() + 1)
  else if (cadence === 'daily') d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString()
}

// #7: stale-renewal-notice reconciliation. When we receive a renewal_notice or
// receipt whose stated next_renewal_at is already in the past (the email was
// forwarded weeks or months after the renewal occurred), project forward by
// cadence so the catalog shows a current cycle, not a stale historical one.
// #71: cancel_by_at must roll forward in lockstep — leaving it at the original
// (now-past) date produces false "cancel by yesterday!" UI urgency.
function reconcileCycleDates(
  next_renewal_at: string | null,
  cancel_by_at: string | null,
  cadence: string | null,
): { next_renewal_at: string | null; cancel_by_at: string | null } {
  if (!next_renewal_at || !cadence) return { next_renewal_at, cancel_by_at }
  if (cadence === 'one_time') return { next_renewal_at, cancel_by_at }
  const now = Date.now()
  let renewal = next_renewal_at
  let cancel = cancel_by_at
  for (let i = 0; i < 60; i++) {
    if (new Date(renewal).getTime() > now) return { next_renewal_at: renewal, cancel_by_at: cancel }
    renewal = advanceByCadence(renewal, cadence)
    if (cancel) cancel = advanceByCadence(cancel, cadence)
  }
  return { next_renewal_at: renewal, cancel_by_at: cancel }
}

function buildCyclePayload(signal: ExtractionSignal): CycleInsert {
  const reconciled = reconcileCycleDates(
    signal.next_renewal_at,
    signal.cancel_by_at,
    signal.billing_cadence,
  )
  return {
    signal_type: signal.signal_type,
    amount: signal.signal_type === 'trial_start' ? 0 : signal.amount,
    currency: signal.currency,
    billing_cadence: signal.billing_cadence,
    period_start: signal.event_date,
    next_renewal_at: reconciled.next_renewal_at,
    cancel_by_at: reconciled.cancel_by_at,
  }
}

export function match(
  signal: ExtractionSignal,
  existingSubscriptions: ExistingSubscription[],
  podId: string,
): MatchResult {
  let bestScore = 0
  let bestMatch: ExistingSubscription | null = null

  for (const existing of existingSubscriptions) {
    const score = scoreMatch(signal, existing)
    if (score > bestScore) {
      bestScore = score
      bestMatch = existing
    }
  }

  const cyclePayload = buildCyclePayload(signal)

  if (bestMatch && bestScore >= MATCH_THRESHOLD) {
    return {
      action: 'update',
      matched_id: bestMatch.id,
      subscriptionPayload: buildUpdateSubscriptionPayload(signal, bestMatch, podId),
      cyclePayload,
    }
  }

  return { action: 'insert', subscriptionPayload: buildSubscriptionPayload(signal, podId), cyclePayload }
}
