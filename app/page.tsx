import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import CopyButton from './components/CopyButton'

type Subscription = {
  id: string
  display_name: string
  provider_domain: string | null
  amount: number | null
  currency: string | null
  billing_cadence: string | null
  next_renewal_at: string | null
  trial_ends_at: string | null
  cancel_by_at: string | null
  status: string
  cancellation_url: string | null
  cancellation_difficulty: number | null
  canceled_at: string | null
}

const cadenceLabels: Record<string, string> = {
  daily: '/day',
  weekly: '/week',
  monthly: '/month',
  quarterly: '/quarter',
  annual: '/year',
  one_time: ' (one-time)',
}

function formatAmount(amount: number | null, currency: string | null, cadence: string | null): string {
  if (!amount) return '—'
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return formatted + (cadence ? (cadenceLabels[cadence] || '') : '')
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function toMonthly(amount: number, cadence: string): number {
  switch (cadence) {
    case 'daily': return amount * 30
    case 'weekly': return amount * 4.33
    case 'monthly': return amount
    case 'quarterly': return amount / 3
    case 'annual': return amount / 12
    default: return 0
  }
}

function annualEquivalent(subs: Subscription[]): number {
  return subs.reduce((sum, s) => {
    if (!s.amount || !s.billing_cadence || s.currency !== 'USD') return sum
    return sum + toMonthly(s.amount, s.billing_cadence) * 12
  }, 0)
}

// Estimates savings from switching monthly-billed subs to annual.
// Typical SaaS annual pricing: pay 10 months, get 12 (~17% off).
function annualSavingsPotential(subs: Subscription[]): number {
  return subs.reduce((sum, s) => {
    if (!s.amount || s.billing_cadence !== 'monthly' || s.currency !== 'USD') return sum
    return sum + s.amount * 2
  }, 0)
}

function formatRenewalDate(dateStr: string | null): { relative: string; absolute: string; overdue: boolean } | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const diffDays = Math.round((date.getTime() - Date.now()) / 86_400_000)

  let relative: string
  const overdue = diffDays < 0
  if (overdue) relative = 'overdue'
  else if (diffDays === 0) relative = 'today'
  else if (diffDays === 1) relative = 'tomorrow'
  else relative = `in ${diffDays} days`

  const absolute = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(date)

  return { relative, absolute, overdue }
}

function DifficultyDots({ difficulty }: { difficulty: number | null }) {
  if (!difficulty) return null
  const color = difficulty <= 2 ? '#4ade80' : difficulty === 3 ? '#fbbf24' : '#f87171'
  const label = difficulty <= 2 ? 'Easy to cancel' : difficulty === 3 ? 'Moderate' : 'Difficult to cancel'
  return (
    <span style={{ fontSize: '12px', color: '#666666' }}>
      <span style={{ color, letterSpacing: '-1px' }}>
        {'●'.repeat(difficulty)}{'○'.repeat(5 - difficulty)}
      </span>
      {' '}{label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    active:    { bg: '#0f2a1a', text: '#4ade80', label: 'Active' },
    cancelled: { bg: '#1f1f1f', text: '#777777', label: 'Cancelled' },
    trial:     { bg: '#2a1f08', text: '#fbbf24', label: 'Trial' },
  }
  const s = map[status] ?? map.active
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      background: s.bg,
      color: s.text,
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    }}>
      {s.label}
    </span>
  )
}

function TrialCountdown({ cancel_by_at, trial_ends_at }: { cancel_by_at: string | null; trial_ends_at: string | null }) {
  const deadline = cancel_by_at || trial_ends_at
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
  const color = days <= 3 ? '#f87171' : days <= 7 ? '#fbbf24' : '#666666'
  const label = cancel_by_at ? 'Cancel by' : 'Trial ends'
  const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(deadline))
  const daysText = days <= 0 ? 'today' : days === 1 ? '1 day left' : `${days} days left`
  return (
    <span style={{ fontSize: '12px', color }}>
      {label} {date} · {daysText}
    </span>
  )
}

function SubscriptionCard({ sub, dimmed }: { sub: Subscription; dimmed?: boolean }) {
  const renewal = formatRenewalDate(sub.next_renewal_at)
  const cancelSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(sub.display_name + ' cancel subscription')}`
  const annualHint = !dimmed && sub.billing_cadence === 'monthly' && sub.amount
    ? `~${formatCurrency(sub.amount * 10)}/yr with annual plan`
    : null

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #2a2a2a',
      borderRadius: '8px',
      padding: '16px 20px',
      opacity: dimmed ? 0.45 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        {/* Left: favicon + name + domain */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          {sub.provider_domain ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://www.google.com/s2/favicons?domain=${sub.provider_domain}&sz=32`}
              alt=""
              width={20}
              height={20}
              style={{ borderRadius: '3px', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 20, height: 20, borderRadius: '3px', background: '#2a2a2a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', color: '#888888', flexShrink: 0,
            }}>
              {sub.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: '500', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sub.display_name}
            </div>
            {sub.provider_domain && (
              <div style={{ fontSize: '12px', color: '#555555', marginTop: '1px' }}>
                {sub.provider_domain}
              </div>
            )}
          </div>
        </div>

        {/* Right: amount + annual hint + badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
          <div style={{ fontWeight: '500', fontSize: '15px' }}>
            {formatAmount(sub.amount, sub.currency, sub.billing_cadence)}
          </div>
          {annualHint && (
            <div style={{ fontSize: '11px', color: '#555555' }}>
              {annualHint}
            </div>
          )}
          <StatusBadge status={sub.status} />
        </div>
      </div>

      {/* Bottom: renewal + trial countdown + difficulty + cancel link */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #1e1e1e',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {renewal ? (
            <span style={{ fontSize: '13px', color: renewal.overdue ? '#f87171' : '#888888' }}>
              {renewal.relative} · {renewal.absolute}
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: '#444444' }}>No renewal date</span>
          )}
          {sub.status === 'trial' && (
            <TrialCountdown cancel_by_at={sub.cancel_by_at} trial_ends_at={sub.trial_ends_at} />
          )}
          <DifficultyDots difficulty={sub.cancellation_difficulty} />
        </div>

        <div>
          {sub.cancellation_url ? (
            <a
              href={sub.cancellation_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '13px',
                color: '#cccccc',
                padding: '4px 10px',
                border: '1px solid #3a3a3a',
                borderRadius: '4px',
                display: 'inline-block',
              }}
            >
              Cancel →
            </a>
          ) : (
            <a
              href={cancelSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '13px',
                color: '#555555',
                padding: '4px 10px',
                border: '1px solid #2a2a2a',
                borderRadius: '4px',
                display: 'inline-block',
              }}
            >
              How to cancel
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const svc = createServiceClient()

  const { data: profile } = await svc
    .from('profiles')
    .select('pod_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const [podResult, subsResult] = await Promise.all([
    svc.from('pods').select('alias_email').eq('id', profile.pod_id).single(),
    svc
      .from('subscriptions')
      .select('id, display_name, provider_domain, amount, currency, billing_cadence, next_renewal_at, trial_ends_at, cancel_by_at, status, cancellation_url, cancellation_difficulty, canceled_at')
      .eq('pod_id', profile.pod_id)
      .order('next_renewal_at', { ascending: true }),
  ])

  const aliasEmail = podResult.data?.alias_email ?? null
  const subscriptions: Subscription[] = (subsResult.data ?? []) as Subscription[]

  const active = subscriptions.filter(s => s.status !== 'cancelled')
  const cancelled = subscriptions.filter(s => s.status === 'cancelled')

  const monthlyBurn = active.reduce((sum, s) => {
    if (!s.amount || !s.billing_cadence || s.currency !== 'USD') return sum
    return sum + toMonthly(s.amount, s.billing_cadence)
  }, 0)

  const annualBurn = annualEquivalent(active)
  const savingsPotential = annualSavingsPotential(active)
  const hasNonUsd = active.some(s => s.amount && s.currency && s.currency !== 'USD')
  const currencyLabel = hasNonUsd ? ' (USD)' : ''

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '16px', flexWrap: 'wrap', marginBottom: '16px',
          }}>
            <h1 style={{ fontSize: '28px', fontWeight: '600' }}>Your Subscriptions</h1>
            {(monthlyBurn > 0 || annualBurn > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                {monthlyBurn > 0 && (
                  <span style={{ fontSize: '16px', fontWeight: '500', color: '#cccccc' }}>
                    {formatCurrency(monthlyBurn)}/mo{currencyLabel}
                  </span>
                )}
                {annualBurn > 0 && (
                  <span style={{ fontSize: '13px', color: '#666666' }}>
                    {formatCurrency(annualBurn)}/yr{currencyLabel}
                  </span>
                )}
                {savingsPotential > 0 && (
                  <span style={{ fontSize: '11px', color: '#4a7c5a', marginTop: '2px' }}>
                    Switch to annual · save ~{formatCurrency(savingsPotential)}/yr (est.)
                  </span>
                )}
              </div>
            )}
          </div>

          {aliasEmail && (
            <div style={{
              background: '#111111',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#555555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Forward subscription emails to
                </div>
                <div style={{ fontSize: '14px', fontFamily: 'monospace', color: '#cccccc' }}>
                  {aliasEmail}
                </div>
              </div>
              <CopyButton text={aliasEmail} />
            </div>
          )}
        </div>

        {/* Empty state */}
        {subscriptions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 20px', color: '#444444' }}>
            <div style={{ fontSize: '16px', marginBottom: '10px', color: '#666666' }}>
              No subscriptions found yet.
            </div>
            {aliasEmail && (
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                Forward any subscription receipt to{' '}
                <span style={{ fontFamily: 'monospace', color: '#888888' }}>{aliasEmail}</span>
                {' '}to get started.
              </div>
            )}
          </div>
        )}

        {/* Active subscriptions */}
        {active.length > 0 && (
          <div style={{ marginBottom: cancelled.length > 0 ? '40px' : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {active.map(sub => (
                <SubscriptionCard key={sub.id} sub={sub} />
              ))}
            </div>
          </div>
        )}

        {/* Cancelled subscriptions */}
        {cancelled.length > 0 && (
          <div>
            <div style={{
              fontSize: '11px', color: '#444444', marginBottom: '12px',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Cancelled
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cancelled.map(sub => (
                <SubscriptionCard key={sub.id} sub={sub} dimmed />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}