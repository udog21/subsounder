import { runParse } from './parser/run'

export async function triggerParse(receiptId: string, podId: string): Promise<void> {
  try {
    const result = await runParse(receiptId, podId)
    if (result.status === 'failed' || result.status === 'error') {
      console.error('[parse-trigger] runParse failed:', JSON.stringify(result))
    }
  } catch (err) {
    console.error('[parse-trigger] runParse threw:', err)
  }
}
