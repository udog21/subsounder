const FROM = 'SubSounder <sys-bot@subsounder.com>'
const SENDING_DOMAIN = 'subsounder.com'
const MAILGUN_API_BASE = 'https://api.mailgun.net/v3'

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return ''
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'
  return `${symbol}${amount.toFixed(2)}`
}

function formatCadence(cadence: string | null): string {
  switch (cadence) {
    case 'monthly':   return '/month'
    case 'annual':    return '/year'
    case 'weekly':    return '/week'
    case 'quarterly': return '/quarter'
    case 'daily':     return '/day'
    default:          return ''
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return 'unknown'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function cancelDifficulty(difficulty: number | null): string {
  if (difficulty == null) return ''
  if (difficulty <= 2) return 'Easy'
  if (difficulty === 3) return 'Moderate'
  return 'Difficult'
}

const dashboardBase = 'https://app.subsounder.com'

async function send(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY
  if (!apiKey) {
    throw new Error('MAILGUN_API_KEY not configured')
  }

  const body = new URLSearchParams({ from: FROM, to, subject, text })

  const res = await fetch(`${MAILGUN_API_BASE}/${SENDING_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Mailgun send failed (${res.status}): ${errBody}`)
  }
}

export async function sendNewSubscriptionEmail(
  to: string,
  subscription: {
    display_name: string
    amount: number | null
    currency: string | null
    billing_cadence: string | null
    next_renewal_at: string | null
    cancellation_url: string | null
  },
): Promise<void> {
  const amountStr = formatAmount(subscription.amount, subscription.currency)
  const cadenceStr = formatCadence(subscription.billing_cadence)

  const lines: string[] = [
    `We found your ${subscription.display_name} subscription.`,
    '',
    ...(amountStr ? [`Amount: ${amountStr}${cadenceStr}`] : []),
    `Next renewal: ${formatDate(subscription.next_renewal_at)}`,
    ...(subscription.cancellation_url ? [`Cancel here: ${subscription.cancellation_url}`] : []),
    '',
    `View your subscriptions: ${dashboardBase}`,
  ]

  await send(to, `We found your ${subscription.display_name} subscription`, lines.join('\n'))
}

export async function sendRenewalReminderEmail(
  to: string,
  subscription: {
    display_name: string
    amount: number | null
    currency: string | null
    billing_cadence: string | null
    next_renewal_at: string | null
    cancellation_url: string | null
    cancellation_difficulty: number | null
  },
  daysUntilRenewal: number,
): Promise<void> {
  const amountStr = formatAmount(subscription.amount, subscription.currency)
  const dayLabel = daysUntilRenewal === 1 ? '1 day' : `${daysUntilRenewal} days`
  const difficulty = cancelDifficulty(subscription.cancellation_difficulty)

  const subject = amountStr
    ? `${subscription.display_name} renews in ${dayLabel} — ${amountStr}`
    : `${subscription.display_name} renews in ${dayLabel}`

  const lines: string[] = [
    `${subscription.display_name} renews in ${dayLabel}.`,
    '',
    ...(amountStr ? [`Amount: ${amountStr}`] : []),
    `Renewal date: ${formatDate(subscription.next_renewal_at)}`,
    ...(difficulty ? [`Cancellation: ${difficulty}`] : []),
    ...(subscription.cancellation_url ? [`Cancel here: ${subscription.cancellation_url}`] : []),
    '',
    `View your subscriptions: ${dashboardBase}`,
  ]

  await send(to, subject, lines.join('\n'))
}

export async function sendAdminReviewDigest(
  to: string,
  runs: Array<{
    id: string
    created_at: string
    classification: string | null
    confidence: number | null
    status: string
    from_domain: string | null
    subject: string | null
  }>,
): Promise<void> {
  if (runs.length === 0) return

  const count = runs.length
  const lines: string[] = [
    `${count} parser run${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} your review:`,
    '',
    ...runs.map(
      (r) =>
        `• ${r.subject ?? '(no subject)'} — ${r.from_domain ?? 'unknown sender'}\n` +
        `  classification: ${r.classification ?? 'n/a'}, confidence: ${r.confidence ?? 'n/a'}, status: ${r.status}\n` +
        `  id: ${r.id}`,
    ),
    '',
    'Set reviewed_at in the parser_runs table to clear these.',
  ]

  await send(
    to,
    `SubSounder: ${count} parse run${count === 1 ? '' : 's'} need review`,
    lines.join('\n'),
  )
}
