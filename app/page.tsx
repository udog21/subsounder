import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import CopyButton from './components/CopyButton'
import styles from './page.module.css'

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
    <span className={styles.difficultyDots}>
      <span className={styles.difficultyMarks} style={{ color }}>
        {'●'.repeat(difficulty)}{'○'.repeat(5 - difficulty)}
      </span>
      {' '}{label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const labelMap: Record<string, string> = {
    active: 'Active', cancelled: 'Cancelled', trial: 'Trial',
  }
  const classMap: Record<string, string> = {
    active: styles.badgeActive,
    cancelled: styles.badgeCancelled,
    trial: styles.badgeTrial,
  }
  return (
    <span className={`${styles.badge} ${classMap[status] ?? styles.badgeActive}`}>
      {labelMap[status] ?? 'Active'}
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
    <span className={styles.trialCountdown} style={{ color }}>
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
    <div className={`${styles.card} ${dimmed ? styles.cardDimmed : ''}`}>
      <div className={styles.cardTop}>
        <div className={styles.cardLeft}>
          {sub.provider_domain ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://www.google.com/s2/favicons?domain=${sub.provider_domain}&sz=32`}
              alt=""
              width={20}
              height={20}
              className={styles.favicon}
            />
          ) : (
            <div className={styles.faviconFallback}>
              {sub.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.nameBlock}>
            <div className={styles.displayName}>{sub.display_name}</div>
            {sub.provider_domain && (
              <div className={styles.domain}>{sub.provider_domain}</div>
            )}
          </div>
        </div>

        <div className={styles.cardRight}>
          <div className={styles.amount}>
            {formatAmount(sub.amount, sub.currency, sub.billing_cadence)}
          </div>
          {annualHint && <div className={styles.annualHint}>{annualHint}</div>}
          <StatusBadge status={sub.status} />
        </div>
      </div>

      <div className={styles.cardBottom}>
        <div className={styles.cardBottomLeft}>
          {renewal ? (
            <span className={`${styles.renewal} ${renewal.overdue ? styles.renewalOverdue : ''}`}>
              {renewal.relative} · {renewal.absolute}
            </span>
          ) : (
            <span className={styles.noRenewal}>No renewal date</span>
          )}
          {sub.status === 'trial' && (
            <TrialCountdown cancel_by_at={sub.cancel_by_at} trial_ends_at={sub.trial_ends_at} />
          )}
          <DifficultyDots difficulty={sub.cancellation_difficulty} />
        </div>

        <div>
          {sub.cancellation_url ? (
            <a href={sub.cancellation_url} target="_blank" rel="noopener noreferrer" className={styles.cancelLink}>
              Cancel →
            </a>
          ) : (
            <a href={cancelSearchUrl} target="_blank" rel="noopener noreferrer" className={styles.howToCancelLink}>
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
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>Your Subscriptions</h1>
            {(monthlyBurn > 0 || annualBurn > 0) && (
              <div className={styles.burns}>
                {monthlyBurn > 0 && (
                  <span className={styles.burnMonthly}>{formatCurrency(monthlyBurn)}/mo{currencyLabel}</span>
                )}
                {annualBurn > 0 && (
                  <span className={styles.burnAnnual}>{formatCurrency(annualBurn)}/yr{currencyLabel}</span>
                )}
                {savingsPotential > 0 && (
                  <span className={styles.burnSavings}>
                    Switch to annual · save ~{formatCurrency(savingsPotential)}/yr (est.)
                  </span>
                )}
              </div>
            )}
          </div>

          {aliasEmail && (
            <div className={styles.aliasRow}>
              <div>
                <div className={styles.aliasLabel}>Forward subscription emails to</div>
                <div className={styles.aliasText}>{aliasEmail}</div>
              </div>
              <CopyButton text={aliasEmail} />
            </div>
          )}
        </div>

        {subscriptions.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No subscriptions found yet.</div>
            {aliasEmail && (
              <div className={styles.emptyBody}>
                Forward any subscription receipt to{' '}
                <span className={styles.emptyAlias}>{aliasEmail}</span>
                {' '}to get started.
              </div>
            )}
          </div>
        )}

        {active.length > 0 && (
          <div className={styles.activeSection}>
            <div className={styles.list}>
              {active.map(sub => (
                <SubscriptionCard key={sub.id} sub={sub} />
              ))}
            </div>
          </div>
        )}

        {cancelled.length > 0 && (
          <div>
            <div className={styles.cancelledLabel}>Cancelled</div>
            <div className={styles.list}>
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
