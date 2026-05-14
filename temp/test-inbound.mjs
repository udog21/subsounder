/**
 * Phase 2 verification: POST a signed Mailgun inbound payload to the local dev server.
 *
 * Usage:
 *   MAILGUN_SIGNING_KEY=<your-key> node temp/test-inbound.mjs
 *
 * Or set MAILGUN_SIGNING_KEY in .env.local and run:
 *   node -e "require('dotenv').config({ path: '.env.local' })" temp/test-inbound.mjs
 *
 * Requires: npm run dev is running on localhost:3000
 */

import crypto from 'crypto'

const SIGNING_KEY = process.env.MAILGUN_SIGNING_KEY
if (!SIGNING_KEY) {
  console.error('Set MAILGUN_SIGNING_KEY env var before running this script.')
  process.exit(1)
}

// Mailgun signature fields
const timestamp = String(Math.floor(Date.now() / 1000))
const token = crypto.randomBytes(25).toString('hex') // 50-char hex
const signature = crypto.createHmac('sha256', SIGNING_KEY).update(`${timestamp}${token}`).digest('hex')

// Simulate a forwarded Spotify renewal email
const fields = {
  timestamp,
  token,
  signature,
  recipient: 'lekd2026@inbound.subsounder.com',
  sender: 'no-reply@spotify.com',
  from: 'Spotify <no-reply@spotify.com>',
  To: 'lekd2026@inbound.subsounder.com',
  subject: 'Your Spotify Premium receipt',
  'Message-Id': '<phase2-dedup-test@mailgun.test>',
  Date: new Date().toUTCString(),
  'body-plain': 'Your Spotify Premium subscription renews on June 1, 2026 for $9.99.',
  'body-html': '<p>Your Spotify Premium subscription renews on June 1, 2026 for $9.99.</p>',
}

const form = new FormData()
for (const [k, v] of Object.entries(fields)) form.append(k, v)

console.log('→ POSTing to http://localhost:3001/api/mailgun/inbound')
console.log('  recipient :', fields.recipient)
console.log('  sender    :', fields.sender)
console.log('  message-id:', fields['Message-Id'])

const res = await fetch('http://localhost:3001/api/mailgun/inbound', {
  method: 'POST',
  body: form,
})

const body = await res.json()
console.log('\n← Response', res.status)
console.log(JSON.stringify(body, null, 2))

if (body.status === 'accepted') {
  console.log('\n✓ receipt_id:', body.receipt_id)
  console.log('  Check inbound_receipts in Supabase for from_domain, source_type, profile_id, content_date.')
  console.log('  Run again to verify dedup returns { status: "duplicate" }.')
}
