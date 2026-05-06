import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendAdminReviewDigest } from '@/lib/email'

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ status: 'failed', message: 'unauthorized' }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ status: 'failed', message: 'ADMIN_EMAIL not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()

  const { data: runs, error } = await supabase
    .from('parser_runs')
    .select('id, created_at, classification, confidence, status, inbound_receipts(from_domain, subject)')
    .eq('needs_review', true)
    .is('reviewed_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ status: 'failed', message: error.message }, { status: 500 })
  }

  const normalized = (runs ?? []).map((r) => {
    const receipt = Array.isArray(r.inbound_receipts) ? r.inbound_receipts[0] : r.inbound_receipts
    return {
      id: r.id,
      created_at: r.created_at,
      classification: r.classification,
      confidence: r.confidence ? Number(r.confidence) : null,
      status: r.status,
      from_domain: receipt?.from_domain ?? null,
      subject: receipt?.subject ?? null,
    }
  })

  if (normalized.length === 0) {
    return NextResponse.json({ status: 'ok', sent: false, count: 0 })
  }

  try {
    await sendAdminReviewDigest(adminEmail, normalized)
  } catch (err) {
    console.error('[admin-digest] email failed:', err)
    return NextResponse.json({ status: 'error', message: 'email send failed' }, { status: 500 })
  }

  return NextResponse.json({ status: 'ok', sent: true, count: normalized.length })
}
