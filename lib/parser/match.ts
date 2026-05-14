import type { ExtractionSignal } from './extract'

export interface ExistingSubscription {
  id: string
  provider_name: string | null
  provider_domain: string | null
  billed_by_name: string | null
  billed_by_domain: string | null
  display_name: string
  plan_name: string | null
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
  plan_name: string | null
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

function normalizeName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreMatch(signal: ExtractionSignal, existing: ExistingSubscription): number {
  let score = 0

  if (
    signal.merchant_domain &&
    existing.provider_domain &&
    signal.merchant_domain.toLowerCase() === existing.provider_domain.toLowerCase()
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

  const signalName = normalizeName(signal.merchant_name)
  const existingName = normalizeName(existing.display_name)
  if (signalName && existingName) {
    if (signalName === existingName) {
      score += 25
    } else if (signalName.includes(existingName) || existingName.includes(signalName)) {
      score += 15
    }
  }

  if (
    signal.plan_name &&
    existing.plan_name &&
    normalizeName(signal.plan_name) === normalizeName(existing.plan_name)
  ) {
    score += 15
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
    display_name: signal.merchant_name ?? signal.billed_by_name ?? 'Unknown',
    provider_name: signal.merchant_name,
    provider_domain: signal.merchant_domain,
    billed_by_name: signal.billed_by_name,
    billed_by_domain: signal.billed_by_domain,
    plan_name: signal.plan_name,
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
      provider_name: signal.merchant_name ?? existing.provider_name,
      provider_domain: signal.merchant_domain ?? existing.provider_domain,
      billed_by_name: signal.billed_by_name ?? existing.billed_by_name,
      billed_by_domain: signal.billed_by_domain ?? existing.billed_by_domain,
      plan_name: signal.plan_name ?? existing.plan_name,
      last_observed_content_date: signal.event_date ?? existing.last_observed_content_date,
    }
  }

  // Older signal: only fill fields currently null on the existing record
  return {
    ...base,
    provider_name: existing.provider_name ?? signal.merchant_name,
    provider_domain: existing.provider_domain ?? signal.merchant_domain,
    billed_by_name: existing.billed_by_name ?? signal.billed_by_name,
    billed_by_domain: existing.billed_by_domain ?? signal.billed_by_domain,
    plan_name: existing.plan_name ?? signal.plan_name,
    last_observed_content_date: existing.last_observed_content_date ?? signal.event_date,
  }
}

function buildCyclePayload(signal: ExtractionSignal): CycleInsert {
  return {
    signal_type: signal.signal_type,
    amount: signal.signal_type === 'trial_start' ? 0 : signal.amount,
    currency: signal.currency,
    billing_cadence: signal.billing_cadence,
    period_start: signal.event_date,
    next_renewal_at: signal.next_renewal_at,
    cancel_by_at: signal.cancel_by_at,
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
