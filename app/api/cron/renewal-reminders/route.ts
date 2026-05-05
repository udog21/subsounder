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

  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select(
      'id, display_name, amount, currency, billing_cadence, next_renewal_at, cancellation_url, cancellation_difficulty, pod_id',
    )
    .gte('next_renewal_at', now.toISOString())
    .lte('next_renewal_at', windowEnd.toISOString())
    .eq('reminder_enabled', true)
    .eq('status', 'active')

  if (subsError) {
    return NextResponse.json({ status: 'failed', message: subsError.message }, { status: 500 })
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({ status: 'ok', sent: 0 })
  }

  const podIds = Array.from(new Set(subs.map((s) => s.pod_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('pod_id, email')
    .in('pod_id', podIds)

  const emailByPod = new Map<string, string>()
  for (const p of profiles ?? []) {
    if (p.email) emailByPod.set(p.pod_id, p.email)
  }

  let sent = 0
  for (const sub of subs) {
    const to = emailByPod.get(sub.pod_id)
    if (!to) continue

    const msUntilRenewal = new Date(sub.next_renewal_at).getTime() - now.getTime()
    const daysUntilRenewal = Math.max(1, Math.ceil(msUntilRenewal / (1000 * 60 * 60 * 24)))

    try {
      await sendRenewalReminderEmail(to, sub, daysUntilRenewal)
      sent++
    } catch (err) {
      console.error(`[renewal-reminders] failed for sub ${sub.id}:`, err)
    }
  }

  return NextResponse.json({ status: 'ok', sent })
}
