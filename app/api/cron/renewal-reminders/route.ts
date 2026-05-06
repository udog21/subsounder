import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendRenewalReminderEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ status: 'failed', message: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const now = new Date()
  const windowEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000)

  // Fetch active subscriptions with their current cycle (financial/temporal data lives there)
  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select(
      'id, display_name, cancellation_url, cancellation_difficulty, pod_id, reminder_enabled, status, cycle:subscription_cycles!subscriptions_current_cycle_id_fkey(amount, currency, billing_cadence, next_renewal_at)',
    )
    .eq('reminder_enabled', true)
    .eq('status', 'active')

  if (subsError) {
    return NextResponse.json({ status: 'failed', message: subsError.message }, { status: 500 })
  }

  // Filter to subscriptions renewing within the 8-day window
  const qualifying = (subs ?? []).filter((s) => {
    const cycle = Array.isArray(s.cycle) ? s.cycle[0] : s.cycle
    if (!cycle?.next_renewal_at) return false
    const renewalDate = new Date(cycle.next_renewal_at)
    return renewalDate >= now && renewalDate <= windowEnd
  })

  if (qualifying.length === 0) {
    return NextResponse.json({ status: 'ok', sent: 0 })
  }

  const podIds = Array.from(new Set(qualifying.map((s) => s.pod_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('pod_id, email')
    .in('pod_id', podIds)

  const emailByPod = new Map<string, string>()
  for (const p of profiles ?? []) {
    if (p.email) emailByPod.set(p.pod_id, p.email)
  }

  let sent = 0
  for (const sub of qualifying) {
    const to = emailByPod.get(sub.pod_id)
    if (!to) continue

    const cycle = Array.isArray(sub.cycle) ? sub.cycle[0] : sub.cycle
    if (!cycle?.next_renewal_at) continue

    const msUntilRenewal = new Date(cycle.next_renewal_at).getTime() - now.getTime()
    const daysUntilRenewal = Math.max(1, Math.ceil(msUntilRenewal / (1000 * 60 * 60 * 24)))

    try {
      await sendRenewalReminderEmail(
        to,
        {
          display_name: sub.display_name,
          amount: cycle.amount ?? null,
          currency: cycle.currency ?? null,
          billing_cadence: cycle.billing_cadence ?? null,
          next_renewal_at: cycle.next_renewal_at,
          cancellation_url: sub.cancellation_url ?? null,
          cancellation_difficulty: sub.cancellation_difficulty ?? null,
        },
        daysUntilRenewal,
      )
      sent++
    } catch (err) {
      console.error(`[renewal-reminders] failed for sub ${sub.id}:`, err)
    }
  }

  return NextResponse.json({ status: 'ok', sent })
}
