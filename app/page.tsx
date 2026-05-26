import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import CopyButton from './components/CopyButton'
import SubscriptionCard, { type Subscription } from './components/SubscriptionCard'
import { type SourceReceipt, buildGmailUrl } from './components/ViewSourcePanel'
import styles from './page.module.css'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function toMonthly(amount: number, cadence: string): number {
  switch (cadence) {
    case 'daily':     return amount * 30
    case 'weekly':    return amount * 4.33
    case 'monthly':   return amount
    case 'quarterly': return amount / 3
    case 'annual':    return amount / 12
    default:          return 0
  }
}

function annualEquivalent(subs: Subscription[]): number {
  return subs.reduce((sum, s) => {
    if (!s.amount || !s.billing_cadence || s.currency !== 'USD') return sum
    return sum + toMonthly(s.amount, s.billing_cadence) * 12
  }, 0)
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
      .select(
        'id, provider_name, provider_domain, product, plan_name, instance, status, cancellation_url, cancellation_difficulty, canceled_at, cycle:subscription_cycles!subscriptions_current_cycle_id_fkey(amount, currency, billing_cadence, next_renewal_at, cancel_by_at, period_end)',
      )
      .eq('pod_id', profile.pod_id)
      .eq('deleted_by_user', false),
  ])

  const aliasEmail = podResult.data?.alias_email ?? null

  const raw = subsResult.data ?? []
  const subscriptions: Subscription[] = raw
    .map((s) => {
      const cycle = Array.isArray(s.cycle) ? s.cycle[0] : s.cycle
      return {
        id: s.id,
        provider_name: s.provider_name ?? null,
        provider_domain: s.provider_domain ?? null,
        product: s.product ?? null,
        plan_name: s.plan_name ?? null,
        instance: s.instance ?? null,
        status: s.status,
        cancellation_url: s.cancellation_url ?? null,
        cancellation_difficulty: s.cancellation_difficulty ?? null,
        canceled_at: s.canceled_at ?? null,
        amount: cycle?.amount ?? null,
        currency: cycle?.currency ?? null,
        billing_cadence: cycle?.billing_cadence ?? null,
        next_renewal_at: cycle?.next_renewal_at ?? null,
        cancel_by_at: cycle?.cancel_by_at ?? null,
        trial_ends_at: cycle?.period_end ?? null,
      }
    })
    .sort((a, b) => {
      if (!a.next_renewal_at) return 1
      if (!b.next_renewal_at) return -1
      return new Date(a.next_renewal_at).getTime() - new Date(b.next_renewal_at).getTime()
    })

  const cancelled = subscriptions.filter((s) => s.status === 'cancelled')
  const uncancelled = subscriptions.filter((s) => s.status !== 'cancelled')
  const active = uncancelled.filter((s) => s.amount != null)
  const needsReview = uncancelled.filter((s) => s.amount == null)

  const annualBurn = annualEquivalent(active)
  const hasNonUsd = active.some((s) => s.amount && s.currency && s.currency !== 'USD')
  const currencyLabel = hasNonUsd ? ' (USD)' : ''

  const receiptsBySubId = new Map<string, SourceReceipt[]>()
  if (needsReview.length > 0) {
    const nrIds = needsReview.map((s) => s.id)
    const { data: soundingRows } = await svc
      .from('soundings_log')
      .select(
        'resolved_subscription_id, inbound_receipt:inbound_receipts!soundings_log_inbound_receipt_id_fkey(id, message_id, subject, from_email, received_at)',
      )
      .eq('pod_id', profile.pod_id)
      .in('resolved_subscription_id', nrIds)
      .order('created_at', { ascending: false })

    for (const row of soundingRows ?? []) {
      const subId = row.resolved_subscription_id as string | null
      if (!subId) continue
      const r = Array.isArray(row.inbound_receipt) ? row.inbound_receipt[0] : row.inbound_receipt
      if (!r) continue
      const messageId = (r.message_id as string | null) ?? null
      const fromEmail = (r.from_email as string | null) ?? null
      const receipt: SourceReceipt = {
        id: r.id as string,
        message_id: messageId,
        subject: (r.subject as string | null) ?? null,
        from_email: fromEmail,
        received_at: r.received_at as string,
        gmail_url: buildGmailUrl(messageId, user.email ?? null),
      }
      const arr = receiptsBySubId.get(subId)
      if (arr) {
        if (!arr.some((x) => x.id === receipt.id)) arr.push(receipt)
      } else {
        receiptsBySubId.set(subId, [receipt])
      }
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>Your Subscriptions</h1>
            {annualBurn > 0 && (
              <span className={styles.burnAnnual}>{formatCurrency(annualBurn)}/yr{currencyLabel}</span>
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
            <div className={`${styles.list} ${styles.listScroll}`}>
              {active.map((sub) => (
                <SubscriptionCard key={sub.id} sub={sub} />
              ))}
            </div>
          </div>
        )}

        {needsReview.length > 0 && (
          <div className={styles.needsReviewSection}>
            <div className={styles.needsReviewLabel}>
              Needs Review · {needsReview.length}
            </div>
            <div className={styles.needsReviewSub}>
              Missing price or renewal — not counted in the annual total.
            </div>
            <div className={`${styles.list} ${styles.listScrollShort}`}>
              {needsReview.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  sub={sub}
                  receipts={receiptsBySubId.get(sub.id) ?? []}
                />
              ))}
            </div>
          </div>
        )}

        {cancelled.length > 0 && (
          <div>
            <div className={styles.cancelledLabel}>Cancelled</div>
            <div className={`${styles.list} ${styles.listScrollShort}`}>
              {cancelled.map((sub) => (
                <SubscriptionCard key={sub.id} sub={sub} dimmed />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
