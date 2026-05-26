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
  provider_name: string | null
  provider_domain: string | null
  product: string | null
  plan_name: string | null
  instance: string | null
  billed_by_name: string | null
  billed_by_domain: string | null
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
    provider_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    provider_domain: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    product: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    plan_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    instance: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    billed_by_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    billed_by_domain: { anyOf: [{ type: 'string' }, { type: 'null' }] },
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
    'provider_name',
    'provider_domain',
    'product',
    'plan_name',
    'instance',
    'billed_by_name',
    'billed_by_domain',
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

const FALLBACK_SYSTEM_PROMPT = `You are a subscription email parser. Extract billing and subscription signals from forwarded emails.

Classify the email and extract any subscription signals:
- "subscription" = clear subscription service email (renewal, receipt, charge, trial notice)
- "maybe_subscription" = likely subscription but insufficient data to be certain
- "not_subscription" = clearly not a subscription email (shipping, news, etc.)
- "spam" = unsolicited promotional email with no real subscription signal

For "not_subscription" and "spam": return signals = []

Identity layers — fill all four:
- provider_name = the brand/company that bills the user
- product = the service line within the provider (null if the provider IS the product)
- plan_name = the tier within the product (mutable)
- instance = the immutable per-instance identity (e.g. domain at a registrar)`

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
