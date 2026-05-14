import crypto from 'crypto'

export interface NormalizeResult {
  normalized_text: string
  input_hash: string
  input_excerpt: string
}

function htmlToText(html: string): string {
  let text = html
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/?(p|div|tr|li|h[1-6]|blockquote)[^>]*>/gi, '\n')
  // Anchor tags → inner text only
  text = text.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, '')
  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

const FORWARDED_MARKERS = [
  '-----Forwarded message-----',
  '-----Original Message-----',
  '---------- Forwarded message ---------',
  '-------- Original Message --------',
  '--- Forwarded message ---',
  '─────────────────────────',
]

function extractForwardedBlock(text: string): string {
  let lastIdx = -1
  let lastMarkerLen = 0

  for (const marker of FORWARDED_MARKERS) {
    const idx = text.lastIndexOf(marker)
    if (idx > lastIdx) {
      lastIdx = idx
      lastMarkerLen = marker.length
    }
  }

  if (lastIdx === -1) return text
  return text.slice(lastIdx + lastMarkerLen).trim()
}

function stripForwardHeaderStanza(text: string): string {
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (
      /^(From|Date|Subject|To|Cc|Reply-To|Sent|Message-ID|Mailed-By|Signed-By):/i.test(line) ||
      line === ''
    ) {
      i++
    } else {
      break
    }
  }
  return lines.slice(i).join('\n').trim()
}

export function normalize(params: {
  bodyText?: string
  bodyHtml?: string
  subject?: string
  fromEmail?: string
  fromDomain?: string
  toEmail?: string
}): NormalizeResult {
  const { bodyText, bodyHtml, subject = '', fromEmail = '', fromDomain = '', toEmail = '' } = params

  let raw = bodyText?.trim() || ''
  if (!raw && bodyHtml) {
    raw = htmlToText(bodyHtml)
  } else if (bodyHtml) {
    const fromHtml = htmlToText(bodyHtml)
    if (fromHtml.length > raw.length * 1.2) raw = fromHtml
  }

  const forwarded = extractForwardedBlock(raw)
  const cleaned = stripForwardHeaderStanza(forwarded)

  const header = `Subject: ${subject}\nFrom: ${fromEmail}\nFrom-Domain: ${fromDomain}\nTo: ${toEmail}\n---\n`
  const withHeader = header + cleaned

  const normalized_text = withHeader.slice(0, 12000)
  const input_hash = crypto.createHash('sha256').update(normalized_text, 'utf8').digest('hex')
  const input_excerpt = normalized_text.slice(0, 500)

  return { normalized_text, input_hash, input_excerpt }
}
