import { NextRequest, NextResponse } from 'next/server'
import { runParse } from '@/lib/parser/run'

export async function POST(req: NextRequest) {
  const parseSecret = process.env.PARSE_SECRET
  if (!parseSecret || req.headers.get('x-parse-secret') !== parseSecret) {
    return NextResponse.json({ status: 'failed', message: 'unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as { receipt_id?: string; pod_id?: string }
  const { receipt_id, pod_id } = body
  if (!receipt_id || !pod_id) {
    return NextResponse.json({ status: 'failed', message: 'missing_fields' }, { status: 400 })
  }

  const result = await runParse(receipt_id, pod_id)
  const httpStatus =
    result.status === 'ok' || result.status === 'skipped'
      ? 200
      : result.message === 'receipt_not_found'
        ? 404
        : 500

  return NextResponse.json(result, { status: httpStatus })
}
