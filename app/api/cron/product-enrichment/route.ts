import { NextRequest, NextResponse } from 'next/server'
import { runProductEnrichment } from '@/lib/cron/product-enrichment'

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await runProductEnrichment()
  return NextResponse.json(result)
}
