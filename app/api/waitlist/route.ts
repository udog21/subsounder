import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  let body: { email?: unknown } | null = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const raw = body?.email
  if (typeof raw !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const email = raw.trim().toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 },
    )
  }

  const svc = createServiceClient()

  const { data: existing, error: lookupErr } = await svc
    .from('signups')
    .select('status')
    .eq('email', email)
    .maybeSingle()

  if (lookupErr) {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }

  if (existing?.status === 'pre_approved') {
    return NextResponse.json({ action: 'login', email })
  }

  if (existing) {
    return NextResponse.json({ action: 'waitlisted', email })
  }

  const { error: insertErr } = await svc
    .from('signups')
    .insert({ email, status: 'waitlist' })

  if (insertErr) {
    // Most likely a concurrent insert race; treat as waitlisted idempotently.
    return NextResponse.json({ action: 'waitlisted', email })
  }

  return NextResponse.json({ action: 'waitlisted', email })
}
