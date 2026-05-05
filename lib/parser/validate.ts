import type { ExtractionResult, ExtractionSignal } from './extract'

const VALID_CLASSIFICATIONS = [
  'subscription',
  'maybe_subscription',
  'not_subscription',
  'spam',
] as const

const VALID_SIGNAL_TYPES = [
  'renewal_notice',
  'receipt',
  'charge',
  'trial_start',
  'trial_ending',
  'subscription_confirm',
  'cancellation_confirm',
  'price_change',
] as const

const VALID_CADENCES = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'annual',
  'one_time',
] as const

export type ParserRunStatus = 'success' | 'partial' | 'no_signal' | 'error'

export interface ValidationResult {
  valid: ExtractionResult
  errors: string[]
  parser_run_status: ParserRunStatus
}

function clamp(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function normalizeDate(d: string | null | undefined): string | null {
  if (!d) return null
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function validateSignal(signal: ExtractionSignal, errors: string[]): void {
  if (!VALID_SIGNAL_TYPES.includes(signal.signal_type as typeof VALID_SIGNAL_TYPES[number])) {
    errors.push(`invalid_signal_type: ${signal.signal_type}`)
  }

  signal.confidence = clamp(signal.confidence)

  if (
    signal.billing_cadence !== null &&
    signal.billing_cadence !== undefined &&
    !VALID_CADENCES.includes(signal.billing_cadence as typeof VALID_CADENCES[number])
  ) {
    errors.push(`invalid_billing_cadence: ${signal.billing_cadence}`)
    signal.billing_cadence = null
  }

  const origEventDate = signal.event_date
  signal.event_date = normalizeDate(signal.event_date)
  if (origEventDate && !signal.event_date) errors.push(`invalid_event_date: ${origEventDate}`)

  const origNextRenewal = signal.next_renewal_at
  signal.next_renewal_at = normalizeDate(signal.next_renewal_at)
  if (origNextRenewal && !signal.next_renewal_at)
    errors.push(`invalid_next_renewal_at: ${origNextRenewal}`)

  const origCancelBy = signal.cancel_by_at
  signal.cancel_by_at = normalizeDate(signal.cancel_by_at)
  if (origCancelBy && !signal.cancel_by_at) errors.push(`invalid_cancel_by_at: ${origCancelBy}`)
}

export function validate(raw: ExtractionResult): ValidationResult {
  const errors: string[] = []

  if (!VALID_CLASSIFICATIONS.includes(raw.classification as typeof VALID_CLASSIFICATIONS[number])) {
    errors.push(`invalid_classification: ${raw.classification}`)
    raw.classification = 'not_subscription'
  }

  raw.confidence = clamp(raw.confidence)

  if (!Array.isArray(raw.top_evidence)) {
    raw.top_evidence = []
    errors.push('top_evidence_not_array')
  }

  if (!Array.isArray(raw.signals)) {
    raw.signals = []
    errors.push('signals_not_array')
  } else {
    for (const signal of raw.signals) {
      validateSignal(signal, errors)
    }
  }

  const isSubscriptionSignal =
    raw.classification === 'subscription' || raw.classification === 'maybe_subscription'

  let parser_run_status: ParserRunStatus
  if (!isSubscriptionSignal) {
    parser_run_status = 'no_signal'
  } else if (errors.length > 0) {
    parser_run_status = 'partial'
  } else {
    parser_run_status = 'success'
  }

  return { valid: raw, errors, parser_run_status }
}
