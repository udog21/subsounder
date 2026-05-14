import { createServiceClient } from '@/lib/supabase/service'
import { sendAdminReviewDigest } from '@/lib/email'

export type RunAdminDigestResult =
  | { status: 'ok'; sent: boolean; count: number }
  | { status: 'failed'; message: string }
  | { status: 'error'; message: string }

export async function runAdminDigest(): Promise<RunAdminDigestResult> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return { status: 'failed', message: 'ADMIN_EMAIL not configured' }
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
    return { status: 'failed', message: error.message }
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
    return { status: 'ok', sent: false, count: 0 }
  }

  try {
    await sendAdminReviewDigest(adminEmail, normalized)
  } catch (err) {
    console.error('[admin-digest] email failed:', err)
    return { status: 'error', message: 'email send failed' }
  }

  return { status: 'ok', sent: true, count: normalized.length }
}
