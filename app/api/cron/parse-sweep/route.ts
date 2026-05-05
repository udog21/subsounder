import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { triggerParse } from '@/lib/parse-trigger'

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ status: 'failed', message: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: pending, error } = await supabase
    .from('inbound_receipts')
    .select('id, pod_id')
    .eq('parser_status', 'pending')
    .gt('created_at', cutoff)
    .limit(20)

  if (error) {
    return NextResponse.json({ status: 'failed', message: error.message }, { status: 500 })
  }

  const receipts = pending ?? []
  let processed = 0

  for (const receipt of receipts) {
    await triggerParse(receipt.id, receipt.pod_id)
    processed++
    if (processed < receipts.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  return NextResponse.json({ status: 'ok', processed })
}
