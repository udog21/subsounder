'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import ViewSourcePanel, { type SourceReceipt } from './ViewSourcePanel'
import { dismissSubscription } from '../actions/subscriptions'
import styles from '../page.module.css'

export type Subscription = {
  id: string
  provider_name: string | null
  provider_domain: string | null
  product: string | null
  plan_name: string | null
  instance: string | null
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

const DISMISS_DELAY_MS = 5000

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

function composeIdentity(sub: Subscription): string {
  const parts = [sub.provider_name, sub.product].filter(Boolean)
  return parts.join(' ') || 'Unknown'
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

export default function SubscriptionCard({
  sub,
  receipts,
  dimmed,
}: {
  sub: Subscription
  receipts?: SourceReceipt[]
  dimmed?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState(false)
  const [, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  useEffect(() => {
    if (!pendingRemoval) return
    const t = setTimeout(() => {
      startTransition(() => {
        dismissSubscription(sub.id).catch((err) => {
          console.error('[dismiss] failed:', err)
          setPendingRemoval(false)
        })
      })
    }, DISMISS_DELAY_MS)
    return () => clearTimeout(t)
  }, [pendingRemoval, sub.id])

  const identity = composeIdentity(sub)
  const renewal = formatRenewalDate(sub.next_renewal_at)
  const cancelSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(identity + ' cancel subscription')}`

  const handleRemoveClick = () => {
    setMenuOpen(false)
    setPendingRemoval(true)
  }

  const handleUndoClick = () => {
    setPendingRemoval(false)
  }

  const cardClass = [
    styles.card,
    dimmed ? styles.cardDimmed : '',
    pendingRemoval ? styles.cardPending : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>
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
              {identity.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.nameBlock}>
            <div className={styles.displayName}>{identity}</div>
            <div className={styles.identityLine2}>
              {sub.plan_name && <span className={styles.planChip}>{sub.plan_name}</span>}
              {sub.plan_name && sub.instance && <span className={styles.identitySep}>·</span>}
              {sub.instance && <span className={styles.instance}>{sub.instance}</span>}
            </div>
          </div>
        </div>

        <div className={styles.cardRight}>
          <div className={styles.amount}>
            {formatAmount(sub.amount, sub.currency, sub.billing_cadence)}
          </div>
          <StatusBadge status={sub.status} />
        </div>

        {!pendingRemoval && (
          <div className={styles.kebabWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.kebabButton}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Subscription actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              ⋮
            </button>
            {menuOpen && (
              <div className={styles.kebabMenu} role="menu">
                <button
                  type="button"
                  className={styles.kebabMenuItem}
                  onClick={handleRemoveClick}
                  role="menuitem"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.cardBottom}>
        {pendingRemoval ? (
          <>
            <div className={styles.cardBottomLeft}>
              <span className={styles.pendingRemovalText}>Removing in 5s…</span>
            </div>
            <button type="button" className={styles.undoButton} onClick={handleUndoClick}>
              Undo
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {pendingRemoval && <div className={styles.pendingProgressBar} />}

      {receipts && receipts.length > 0 && !pendingRemoval && <ViewSourcePanel receipts={receipts} />}
    </div>
  )
}
