export async function triggerParse(receiptId: string, podId: string): Promise<void> {
  const parseSecret = process.env.PARSE_SECRET
  if (!parseSecret) {
    console.error('[parse-trigger] PARSE_SECRET not configured')
    return
  }

  const workersUrl = process.env.WORKERS_URL
  const base = workersUrl ? `https://${workersUrl}` : 'http://localhost:3000'

  try {
    const res = await fetch(`${base}/api/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-parse-secret': parseSecret,
      },
      body: JSON.stringify({ receipt_id: receiptId, pod_id: podId }),
    })
    if (!res.ok) {
      console.error(`[parse-trigger] /api/parse returned ${res.status}`)
    }
  } catch (err) {
    console.error('[parse-trigger] fetch failed:', err)
  }
}
