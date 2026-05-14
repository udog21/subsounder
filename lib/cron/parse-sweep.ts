import { createServiceClient } from '@/lib/supabase/service'
import { triggerParse } from '@/lib/parse-trigger'

export type RunParseSweepResult =
  | { status: 'ok'; processed: number }
  | { status: 'failed'; message: string }

export async function runParseSweep(): Promise<RunParseSweepResult> {
  const supabase = createServiceClient()

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: pending, error } = await supabase
    .from('inbound_receipts')
    .select('id, pod_id')
    .eq('parser_status', 'pending')
    .gt('created_at', cutoff)
    .limit(20)

  if (error) {
    return { status: 'failed', message: error.message }
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

  return { status: 'ok', processed }
}
