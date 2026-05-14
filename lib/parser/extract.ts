import OpenAI from 'openai'

export interface ExtractionSignal {
  signal_type:
    | 'renewal_notice'
    | 'receipt'
    | 'charge'
    | 'trial_start'
    | 'trial_ending'
    | 'subscription_confirm'
    | 'cancellation_confirm'
    | 'price_change'
  merchant_name: string | null
  merchant_domain: string | null
  billed_by_name: string | null
  billed_by_domain: string | null
  plan_name: string | null
  amount: number | null
  currency: string | null
  billing_cadence: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'one_time' | null
  event_date: string | null
  next_renewal_at: string | null
  cancel_by_at: string | null
  confidence: number
  evidence: string | null
}

export interface ExtractionResult {
  classification: 'subscription' | 'maybe_subscription' | 'not_subscription' | 'spam'
  confidence: number
  top_evidence: string[]
  signals: ExtractionSignal[]
}

const SIGNAL_SCHEMA = {
  type: 'object',
  properties: {
    signal_type: {
      type: 'string',
      enum: [
        'renewal_notice',
        'receipt',
        'charge',
        'trial_start',
        'trial_ending',
        'subscription_confirm',
        'cancellation_confirm',
        'price_change',
      ],
    },
    merchant_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    merchant_domain: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    billed_by_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    billed_by_domain: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    plan_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    amount: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    currency: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    billing_cadence: {
      anyOf: [
        {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'one_time'],
        },
        { type: 'null' },
      ],
    },
    event_date: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    next_renewal_at: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    cancel_by_at: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    confidence: { type: 'number' },
    evidence: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
  required: [
    'signal_type',
    'merchant_name',
    'merchant_domain',
    'billed_by_name',
    'billed_by_domain',
    'plan_name',
    'amount',
    'currency',
    'billing_cadence',
    'event_date',
    'next_renewal_at',
    'cancel_by_at',
    'confidence',
    'evidence',
  ],
  additionalProperties: false,
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    classification: {
      type: 'string',
      enum: ['subscription', 'maybe_subscription', 'not_subscription', 'spam'],
    },
    confidence: { type: 'number' },
    top_evidence: { type: 'array', items: { type: 'string' } },
    signals: { type: 'array', items: SIGNAL_SCHEMA },
  },
  required: ['classification', 'confidence', 'top_evidence', 'signals'],
  additionalProperties: false,
}

// Fallback used when no active prompt is found in prompt_templates
const FALLBACK_SYSTEM_PROMPT = `You are a subscription email parser. Extract billing and subscription signals from forwarded emails.

Classify the email and extract any subscription signals:
- "subscription" = clear subscription service email (renewal, receipt, charge, trial notice)
- "maybe_subscription" = likely subscription but insufficient data to be certain
- "not_subscription" = clearly not a subscription email (shipping, news, etc.)
- "spam" = unsolicited promotional email with no real subscription signal

For "not_subscription" and "spam": return signals = []

Field rules:
- event_date = the date of this specific email's event (charge date, renewal notice date, etc.) in ISO 8601
- merchant_domain = root domain of the service (e.g. "netflix.com"), not the sender email domain
- billed_by_domain = billing entity's domain (e.g. "apple.com" if billed through Apple)
- amount = numeric only, no currency symbols
- currency = ISO 4217 three-letter code (USD, EUR, GBP, etc.)
- All dates must be ISO 8601 (YYYY-MM-DD or full datetime with timezone)`

export async function extract(
  normalizedText: string,
  systemPrompt?: string,
  modelHint?: string,
): Promise<ExtractionResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await openai.chat.completions.create({
    model: modelHint ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt ?? FALLBACK_SYSTEM_PROMPT },
      { role: 'user', content: normalizedText },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'extraction',
        strict: true,
        schema: EXTRACTION_SCHEMA,
      },
    },
    temperature: 0,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('empty_response_from_openai')

  return JSON.parse(content) as ExtractionResult
}
