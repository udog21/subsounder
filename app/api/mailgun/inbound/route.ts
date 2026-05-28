import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { triggerParse } from '@/lib/parse-trigger'

type MailgunPayload = Record<string, FormDataEntryValue>

function formDataToObject(fd: FormData): MailgunPayload {
  const obj: MailgunPayload = {}
  fd.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}

function toString(v: FormDataEntryValue | undefined | null): string | undefined {
  if (v === undefined || v === null) return undefined
  return typeof v === 'string' ? v : v.toString()
}

function extractEmailAddress(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const angleMatch = raw.match(/<([^>]+)>/)
  if (angleMatch?.[1]) return angleMatch[1].trim().toLowerCase()
  const simple = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return simple ? simple[0].trim().toLowerCase() : undefined
}

function extractDomain(email: string | undefined): string | undefined {
  if (!email) return undefined
  const at = email.indexOf('@')
  if (at === -1) return undefined
  return email.slice(at + 1).toLowerCase()
}

function getToLocalpart(email: string | undefined): string | undefined {
  if (!email) return undefined
  const at = email.indexOf('@')
  if (at === -1) return undefined
  return email.slice(0, at).toLowerCase()
}

// Mailgun delivers all original message headers in a `message-headers` form
// field as a JSON-encoded array of [name, value] tuples. Custom X-headers
// (including the X-Subsounder-Notification stamp on outbound mail) are only
// reliably reachable here — they aren't promoted to top-level form fields.
function hasSubsounderNotificationHeader(messageHeadersJson: string | undefined): boolean {
  if (!messageHeadersJson) return false
  try {
    const headers = JSON.parse(messageHeadersJson) as unknown
    if (!Array.isArray(headers)) return false
    return headers.some(
      (entry) =>
        Array.isArray(entry) &&
        typeof entry[0] === 'string' &&
        entry[0].toLowerCase() === 'x-subsounder-notification' &&
        String(entry[1]) === '1',
    )
  } catch {
    return false
  }
}

function safeIsoFromUnix(timestamp: string | undefined): string | undefined {
  if (!timestamp) return undefined
  const num = Number(timestamp)
  if (!Number.isFinite(num)) return undefined
  const d = new Date(num * 1000)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

function verifyMailgunSignature(body: MailgunPayload): { ok: boolean; error?: string } {
  const signingKey = process.env.MAILGUN_SIGNING_KEY
  if (!signingKey) {
    return { ok: false, error: 'MAILGUN_SIGNING_KEY not configured' }
  }

  const timestamp = toString(body.timestamp)
  const token = toString(body.token)
  const signature = toString(body.signature)

  if (!timestamp || !token || !signature) {
    return { ok: false, error: 'missing_signature_fields' }
  }

  const data = `${timestamp}${token}`
  const expectedSignature = crypto.createHmac('sha256', signingKey).update(data).digest('hex')

  const isValid =
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8'))

  return isValid ? { ok: true } : { ok: false, error: 'invalid_signature' }
}

function buildDedupeKey(params: {
  channel: string
  toLocalpart?: string
  messageId?: string
}): string {
  const { channel, toLocalpart, messageId } = params
  const scope = toLocalpart || 'unknown'
  if (messageId) return `${channel}:${scope}:${messageId}`
  return `${channel}:${scope}:fallback`
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const body = formDataToObject(formData)

    const sigCheck = verifyMailgunSignature(body)
    if (!sigCheck.ok) {
      if (sigCheck.error === 'invalid_signature') {
        return NextResponse.json(
          { status: 'failed', message: 'invalid_signature' },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { status: 'failed', message: sigCheck.error ?? 'signature_verification_failed' },
        { status: 500 }
      )
    }

    const supabase = createServiceClient()

    const recipientRaw = toString(body.recipient) || toString(body.To)
    const fromRaw = toString(body.sender) || toString(body.From)
    const subject = toString(body.subject) || toString(body.Subject) || ''

    const toEmail = extractEmailAddress(recipientRaw)
    const fromEmail = extractEmailAddress(fromRaw)
    const fromDomain = extractDomain(fromEmail)
    const toLocalpart = getToLocalpart(toEmail)

    const messageId =
      toString(body['Message-Id']) ||
      toString(body['message-id']) ||
      toString(body['Message_ID']) ||
      undefined

    const channel = 'mailgun'
    const receivedAt =
      safeIsoFromUnix(toString(body.timestamp)) || new Date().toISOString()

    const dedupeKey = buildDedupeKey({ channel, toLocalpart, messageId })

    const bodyText = toString(body['body-plain']) || toString(body['stripped-text']) || ''
    const bodyHtml = toString(body['body-html']) || toString(body['stripped-html']) || ''

    const messageHeadersJson = toString(body['message-headers'])
    const isSubsounderNotification = hasSubsounderNotificationHeader(messageHeadersJson)

    // Fix 3: write full timestamptz ISO string, not date-only
    const headerDate = toString(body.Date) || toString(body.date)
    let contentDate: string | null = null
    if (headerDate) {
      const d = new Date(headerDate)
      if (!Number.isNaN(d.getTime())) {
        contentDate = d.toISOString()
      }
    }

    // Fix 4: resolve pod + profile BEFORE insert so they're included in initial row
    let podId: string | null = null
    let profileId: string | null = null
    if (toEmail) {
      const { data: pod } = await supabase
        .from('pods')
        .select('id, owner_profile_id')
        .eq('alias_email', toEmail)
        .maybeSingle()

      if (pod) {
        podId = pod.id
        profileId = pod.owner_profile_id ?? null
      }
    }

    // Fix 2: include from_domain and source_type; Fix 4: include pod_id and profile_id
    const insertPayload = {
      channel,
      source_type: 'email',
      pod_id: podId,
      profile_id: profileId,
      received_at: receivedAt,
      to_email: toEmail,
      from_email: fromEmail,
      from_domain: fromDomain,
      subject,
      dedupe_key: dedupeKey,
      body_text: bodyText,
      body_html: bodyHtml,
      message_id: messageId,
      to_localpart: toLocalpart,
      content_date: contentDate,
      raw_payload: {
        headers_raw: {
          Date: headerDate ?? null,
          From: fromRaw ?? null,
          To: recipientRaw ?? null,
        },
        is_subsounder_notification: isSubsounderNotification,
      },
    }

    // Fix 1: atomic dedup via ON CONFLICT (pod_id, dedupe_key) DO NOTHING
    const { data: inserted, error: insertError } = await supabase
      .from('inbound_receipts')
      .upsert(insertPayload, { onConflict: 'pod_id,dedupe_key', ignoreDuplicates: true })
      .select('id')
      .maybeSingle()

    if (insertError) {
      return NextResponse.json(
        { status: 'failed', message: 'insert_failed', detail: insertError.message },
        { status: 500 }
      )
    }

    // null result means conflict — duplicate silently ignored
    if (!inserted) {
      return NextResponse.json(
        { status: 'duplicate', dedupe_key: dedupeKey, dedupe: true },
        { status: 200 }
      )
    }

    const receiptId = inserted.id

    // Fix 5: fire parse asynchronously after response via after()
    if (podId) {
      after(() => triggerParse(receiptId, podId!))
    }

    return NextResponse.json(
      { status: 'accepted', receipt_id: receiptId, dedupe: false },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unexpected_error'
    return NextResponse.json(
      { status: 'failed', message },
      { status: 500 }
    )
  }
}
