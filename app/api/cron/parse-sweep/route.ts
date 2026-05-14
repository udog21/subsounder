import { NextRequest, NextResponse } from 'next/server'
import { runParseSweep } from '@/lib/cron/parse-sweep'

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ status: 'failed', message: 'unauthorized' }, { status: 401 })
  }

  const result = await runParseSweep()
  const httpStatus = result.status === 'ok' ? 200 : 500
  return NextResponse.json(result, { status: httpStatus })
}
