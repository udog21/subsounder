import type { ExtractionSignal } from './extract'

export interface ExistingSubscription {
  id: string
  provider_name: string | null
  provider_domain: string | null
  billed_by_name: string | null
  billed_by_domain: string | null
  display_name: string
  plan_name: string | null
  amount: number | null
  currency: string | null
  billing_cadence: string | null
  next_renewal_at: string | null
  cancel_by_at: string | null
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
  amount: number | null
  currency: string | null
  billing_cadence: string | null
  next_renewal_at: string | null
  cancel_by_at: string | null
  last_observed_content_date: string | null
  last_source_type: string
  source: string
  confidence: number
  status: string
}

export interface MatchResult {
  action: 'insert' | 'update' | 'skip'
  matched_id?: string
  payload: SubscriptionUpsert
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

  if (
    signal.amount !== null &&
    existing.amount !== null &&
    Math.abs(signal.amount - existing.amount) < 0.01 &&
    signal.currency &&
    existing.currency &&
    signal.currency.toUpperCase() === existing.currency.toUpperCase()
  ) {
    score += 10
  }

  return score
}

function buildBasePayload(signal: ExtractionSignal, podId: string): SubscriptionUpsert {
  return {
    pod_id: podId,
    display_name: signal.merchant_name ?? signal.billed_by_name ?? 'Unknown',
    provider_name: signal.merchant_name,
    provider_domain: signal.merchant_domain,
    billed_by_name: signal.billed_by_name,
    billed_by_domain: signal.billed_by_domain,
    plan_name: signal.plan_name,
    amount: signal.amount,
    currency: signal.currency,
    billing_cadence: signal.billing_cadence,
    next_renewal_at: signal.next_renewal_at,
    cancel_by_at: signal.cancel_by_at,
    last_observed_content_date: signal.event_date,
    last_source_type: 'inbound_receipt',
    source: 'parser',
    confidence: signal.confidence,
    status: signal.signal_type === 'cancellation_confirm' ? 'cancelled' : 'active',
  }
}

function buildUpdatePayload(
  signal: ExtractionSignal,
  existing: ExistingSubscription,
  podId: string,
): SubscriptionUpsert {
  const signalTs = signal.event_date ? new Date(signal.event_date).getTime() : 0
  const existingTs = existing.last_observed_content_date
    ? new Date(existing.last_observed_content_date).getTime()
    : 0
  const isNewer = signalTs > existingTs

  const base = buildBasePayload(signal, podId)

  if (isNewer) {
    return {
      ...base,
      provider_name: signal.merchant_name ?? existing.provider_name,
      provider_domain: signal.merchant_domain ?? existing.provider_domain,
      billed_by_name: signal.billed_by_name ?? existing.billed_by_name,
      billed_by_domain: signal.billed_by_domain ?? existing.billed_by_domain,
      plan_name: signal.plan_name ?? existing.plan_name,
      amount: signal.amount ?? existing.amount,
      currency: signal.currency ?? existing.currency,
      billing_cadence: signal.billing_cadence ?? existing.billing_cadence,
      next_renewal_at: signal.next_renewal_at ?? existing.next_renewal_at,
      cancel_by_at: signal.cancel_by_at ?? existing.cancel_by_at,
      last_observed_content_date: signal.event_date ?? existing.last_observed_content_date,
    }
  }

  // Older signal: only fill fields that are currently null on the existing record
  return {
    ...base,
    provider_name: existing.provider_name ?? signal.merchant_name,
    provider_domain: existing.provider_domain ?? signal.merchant_domain,
    billed_by_name: existing.billed_by_name ?? signal.billed_by_name,
    billed_by_domain: existing.billed_by_domain ?? signal.billed_by_domain,
    plan_name: existing.plan_name ?? signal.plan_name,
    amount: existing.amount ?? signal.amount,
    currency: existing.currency ?? signal.currency,
    billing_cadence: existing.billing_cadence ?? signal.billing_cadence,
    next_renewal_at: existing.next_renewal_at ?? signal.next_renewal_at,
    cancel_by_at: existing.cancel_by_at ?? signal.cancel_by_at,
    last_observed_content_date: existing.last_observed_content_date ?? signal.event_date,
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

  if (bestMatch && bestScore >= MATCH_THRESHOLD) {
    return {
      action: 'update',
      matched_id: bestMatch.id,
      payload: buildUpdatePayload(signal, bestMatch, podId),
    }
  }

  return { action: 'insert', payload: buildBasePayload(signal, podId) }
}
