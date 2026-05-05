# SubSounder MVP Plan

_Framing: treat this as a clean reboot. Existing test data in Supabase is disposable. The n8n workflows are reference material, not code to preserve._

---

## Product Loop (what MVP delivers end-to-end)

```
Email forwarded → Receipt stored → Parser extracts signals → Subscription written
→ "New subscription found" email → Renewal reminder 7 days out → Catalog UI with cancellation link
```

---

## Platform: Next.js 15 + Cloudflare Workers

### Why Cloudflare (endorsed, not reluctant)
- You already run other apps there; unified billing, DNS, and ops surface
- CPU-only billing means I/O wait (OpenAI response time) is essentially free
- Cron Triggers are a native primitive
- Workers scale to zero with no cold-start penalty
- Right long-term home; start here, avoid a migration later

### Known Setup Challenges (resolved below)

**Challenge 1: `@supabase/ssr` v0.1.0 incompatibility**
`@supabase/ssr ^0.1.0` (current) dynamically requires `stream`, which breaks on Workers even with `nodejs_compat`. Fix: upgrade to `@supabase/ssr ^0.6.x` which uses the Web Fetch API throughout. This must be validated in Phase 0 before any other auth code is written. Fallback if still broken: replace with `@supabase/supabase-js` + manual cookie handling (the Supabase Cloudflare Workers integration guide covers this pattern).

**Challenge 2: Cron Triggers don't auto-route to Next.js API routes**
Cloudflare's `scheduled` event is a separate invocation from HTTP requests. Solution: a thin `src/worker.ts` that wraps the OpenNext fetch handler and exports a `scheduled` function which makes an authenticated internal `fetch` to the cron API routes. ~20 lines total.

**Challenge 3: `after()` 30-second post-response budget**
Next.js 15's `after()` maps to `ctx.waitUntil()`. The 30-second limit is wall-clock, but Workers bill only CPU time — a 15-second OpenAI I/O wait barely registers against it. Single-receipt parse (normalize + LLM + DB write + email trigger) fits comfortably within 30 seconds. The cron sweep runs as a normal HTTP handler with its own budget.

### Setup Files Required

**`wrangler.toml`:**
```toml
name = "subsounder"
main = ".open-next/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[triggers]
crons = ["*/5 * * * *", "0 9 * * *"]
```

**`src/worker.ts`** (wraps OpenNext + adds cron handler):
```typescript
import { handler as nextHandler } from '.open-next/worker.js'

export default {
  fetch: nextHandler.fetch,
  async scheduled(event, env, ctx) {
    const base = `https://${env.WORKERS_URL}`
    if (event.cron === '*/5 * * * *') {
      ctx.waitUntil(fetch(`${base}/api/cron/parse-sweep`,
        { method: 'POST', headers: { 'x-cron-secret': env.CRON_SECRET } }))
    }
    if (event.cron === '0 9 * * *') {
      ctx.waitUntil(fetch(`${base}/api/cron/renewal-reminders`,
        { method: 'POST', headers: { 'x-cron-secret': env.CRON_SECRET } }))
    }
  }
}
```

**`package.json` scripts:**
```json
{
  "build": "next build && opennextjs-cloudflare build",
  "dev": "next dev",
  "preview": "wrangler dev",
  "deploy": "npm run build && wrangler deploy"
}
```

**Key package changes from current:**
- `next`: `^14.2.0` → `^15.x`
- `@supabase/ssr`: `^0.1.0` → `^0.6.x` (validate CF compatibility; fallback documented above)
- **Add:** `@opennextjs/cloudflare`, `wrangler` (dev dep), `openai`
- **Add:** `resend` (email)

---

## Design Decisions (all resolved)

| # | Decision | Choice |
|---|---|---|
| D1 | LLM Provider | OpenAI `gpt-4o-mini` with structured outputs (`json_schema`, `strict: true`) |
| D2 | Async parse trigger | `after()` in inbound handler (immediate) + cron sweep (reliable) |
| D3 | Parser entry point | `app/api/parse/route.ts` — separate, auth-protected, callable manually |
| D4 | Platform | Next.js 15 + Cloudflare Workers via `@opennextjs/cloudflare` |
| D5 | MVP scope | Depth-first: email channel only, full detection→reminder→cancellation guidance loop |

---

## Two-Layer Logging Model

```
inbound_receipts     raw inputs (emails, PDFs, etc.)
      ↓
parser_runs          control plane — one row per parse attempt
      ↓ (1:N)
soundings_log        data plane — one row per extracted subscription signal
      ↓
subscriptions        normalized, deduped current state
subscription_cycles  billing history
```

**`parser_runs`** answers: _What happened during this processing attempt?_
- One row per input processed
- Tracks: status, classification, confidence, input hash, model used, error details
- The pipeline's observability and retry-control layer

**`soundings_log`** answers: _What facts did we extract?_
- Zero-to-many rows per `parser_run`
- Each row is one detected subscription signal ("Netflix renewal, $15.99, monthly")
- Zero rows is valid and important — captures `no_signal` runs for model tuning
- Downstream normalization writes `resolved_subscription_id` back here

**Why not merge them:** A single bundle receipt could produce 3 signals (3 services). A `no_signal` email has a `parser_run` row but zero `soundings_log` rows — that signal matters for coverage metrics and model improvement. Merging would require JSON arrays (lossy) and pollutes both observability and analytics.

---

## LLM Extraction Output Schema

GPT-4 mini is asked to return an **array** of signals from day one — even if most emails produce exactly one. This correctly models the 1:N reality and avoids a schema migration when bundle/statement parsing is added.

```typescript
// response_format: { type: 'json_schema', json_schema: { strict: true, schema: ExtractionSchema } }
{
  classification: 'subscription' | 'maybe_subscription' | 'not_subscription' | 'spam',
  confidence: number,        // 0–1, overall
  top_evidence: string[],    // key quotes supporting classification
  signals: Array<{
    signal_type: 'renewal_notice' | 'receipt' | 'charge' | 'trial_start' |
                 'trial_ending' | 'subscription_confirm' | 'cancellation_confirm' | 'price_change',
    merchant_name:    string | null,
    merchant_domain:  string | null,
    billed_by_name:   string | null,
    billed_by_domain: string | null,
    plan_name:        string | null,
    amount:           number | null,
    currency:         string | null,   // ISO 4217
    billing_cadence:  'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'one_time' | null,
    event_date:       string | null,   // ISO 8601 — date of THIS email's event
    next_renewal_at:  string | null,   // ISO 8601
    cancel_by_at:     string | null,   // ISO 8601
    confidence:       number,          // 0–1, per-signal
    evidence:         string | null,   // key quote for this specific signal
  }>
}
// For 'not_subscription' and 'spam': signals = []
```

---

## Schema Changes

### Columns to Remove (dead weight)

| Table | Column | Reason |
|---|---|---|
| `inbound_receipts` | `subject_hash` | Never written by any code |
| `inbound_receipts` | `payload_hash` | Never written by any code |
| `profiles` | `inbound_total_count` | Counter with no trigger; always 0 |
| `profiles` | `inbound_subscription_count` | Counter with no trigger; always 0 |
| `profiles` | `inbound_non_subscription_count` | Counter with no trigger; always 0 |
| `subscription_cycles` | `inferred_from_sounding_log_id` | References non-existent table |

### Columns to Add

| Table | Column | Type | Notes |
|---|---|---|---|
| `inbound_receipts` | `updated_at` | `timestamptz` | Auto-updated by trigger; needed for retry sweep |
| `subscriptions` | `cancellation_url` | `text` | Link to provider's cancellation page |
| `subscriptions` | `cancellation_difficulty` | `smallint` | 1–5 scale; seed of data moat |
| `subscriptions` | `canceled_at` | `timestamptz` | Timestamp when cancellation confirmed |

### RPC Update
`create_pod_and_profile`: also set `auth_user_id = user_id` on the profiles insert. Aligns the existing pattern with the schema's intent (supports future unclaimed-profile flows).

### Triggers to Add
- `subscriptions.updated_at`: auto-update on row change (column exists, trigger missing)
- `inbound_receipts.updated_at`: auto-update on row change (after column is added)

### New Table: `soundings_log`

```sql
CREATE TABLE soundings_log (
  id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at                timestamptz DEFAULT now() NOT NULL,

  -- Lineage
  parser_run_id             uuid NOT NULL REFERENCES parser_runs(id) ON DELETE CASCADE,
  pod_id                    uuid REFERENCES pods(id),
  inbound_receipt_id        uuid REFERENCES inbound_receipts(id),

  -- Signal classification
  signal_type               text NOT NULL,
    -- 'renewal_notice' | 'receipt' | 'charge' | 'trial_start' | 'trial_ending'
    -- | 'subscription_confirm' | 'cancellation_confirm' | 'price_change' | 'unknown'

  -- Identity
  merchant_name             text,
  merchant_domain           text,
  billed_by_name            text,
  billed_by_domain          text,
  plan_name                 text,

  -- Financial
  amount                    numeric,
  currency                  text,
  billing_cadence           text,

  -- Temporal
  event_date                timestamptz,
  period_start              timestamptz,
  period_end                timestamptz,
  next_renewal_at           timestamptz,
  cancel_by_at              timestamptz,

  -- Extraction quality
  confidence                numeric,
  evidence                  text,
  raw_extract               jsonb,

  -- Normalization outcome (written after subscription matching)
  resolved_subscription_id  uuid REFERENCES subscriptions(id),
  write_action              text    -- 'insert' | 'update' | 'skip' | 'error'
);

CREATE INDEX soundings_log_parser_run_idx        ON soundings_log (parser_run_id, created_at DESC);
CREATE INDEX soundings_log_pod_idx               ON soundings_log (pod_id, created_at DESC);
CREATE INDEX soundings_log_receipt_idx           ON soundings_log (inbound_receipt_id);
CREATE INDEX soundings_log_resolved_sub_idx      ON soundings_log (resolved_subscription_id);
CREATE INDEX soundings_log_signal_type_idx       ON soundings_log (signal_type);
```

---

## Implementation Phases

### Phase 0 — Platform Setup & Validation
**Goal:** Prove the Cloudflare stack works and wire up local tooling before writing product code.

#### Step 0a — Supabase MCP for Claude Code (you do this once)
This gives Claude Code direct read/write access to your Supabase project without needing manual SQL copy-paste.

1. Go to [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) and generate a Personal Access Token (name it "Claude Code local dev").
2. Open `C:\Users\uberl\.claude\settings.json` and add:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": ["-y", "@supabase/mcp-server-supabase", "--access-token", "<YOUR_PAT_HERE>"]
       }
     }
   }
   ```
3. Restart Claude Code. You should see Supabase tools available (list tables, run queries, etc.).

#### Step 0b — Platform wiring (Claude does this)
1. Upgrade `next` to `^15.x`
2. Upgrade `@supabase/ssr` to `^0.6.x`; run locally and verify auth flow works
3. Install `@opennextjs/cloudflare`, `wrangler`
4. Create `wrangler.toml`, `src/worker.ts`
5. Run `wrangler dev` — verify the Next.js app boots and auth routes work in Workers runtime
6. Deploy a "hello world" build to Cloudflare to confirm the pipeline
7. **Go/no-go gate:** If `@supabase/ssr` 0.6.x is still incompatible, implement the `@supabase/supabase-js` + manual cookie fallback before proceeding

### Phase 1 — Schema Migration
**Goal:** Database reflects desired state; local `supabase db reset` is reliable.

Migration file: `supabase/migrations/20260505_000000_reboot_schema.sql`

- Backfill DDL for all 9 existing tables (for `supabase db reset` reproducibility)
- Remove 6 dead columns (listed above)
- Add 4 new columns (listed above)
- Update `create_pod_and_profile` RPC to set `auth_user_id`
- Add 2 auto-update triggers
- Create `soundings_log` table + indexes
- Add RLS policy for `soundings_log` (mirror pods-scoped pattern from other tables)

### Phase 2 — Fix Inbound Webhook
**File:** [app/api/mailgun/inbound/route.ts](../app/api/mailgun/inbound/route.ts)

Fix 5 bugs against the live schema:

1. **Dedup:** Replace pre-check query with `INSERT ... ON CONFLICT (pod_id, dedupe_key) DO NOTHING RETURNING id` — atomic, correct, eliminates race condition
2. **Missing fields:** Add `from_domain` (extracted from `from_email`) and `source_type: 'mailgun_inbound'` to insert payload
3. **`content_date` type:** Write as full `timestamptz` ISO string, not `YYYY-MM-DD` date-only
4. **`profile_id`:** After resolving pod, look up profile via `pods.owner_profile_id` and include in insert
5. **Fire parse:** After successful insert, call `after(() => triggerParse(receiptId, podId))` — uses Next.js 15's `after()` which maps to `ctx.waitUntil()` on Cloudflare

New helper: `lib/parse-trigger.ts` — shared function used by both the inbound handler and the cron sweep to call `/api/parse`.

### Phase 3 — Mail Parser

**New directory: `lib/parser/`**

**`normalize.ts`** — port of n8n Normalize Text Code node:
- HTML → plaintext (strip scripts/styles, `br`/`p`/`div` → newlines, decode HTML entities, convert anchor tags to `innerText`)
- Extract innermost forwarded message block (scan for `-----Forwarded message-----` markers; keep the last one if it contains subscription signals)
- Strip leading forward header stanza (From/Date/Subject/To lines at top of forwarded block)
- Prepend metadata header: `Subject: X\nFrom: X\nFrom-Domain: X\nTo: X\n---`
- Truncate to 12,000 characters
- Compute SHA-256 `input_hash` (hex) — used in `parser_runs` idempotency index
- Return `{ normalized_text, input_hash, input_excerpt }` (first 500 chars for `parser_runs.input_excerpt`)

**`extract.ts`** — GPT-4 mini structured extraction:
- Build system prompt + user message from normalized text
- Call `openai.chat.completions.create` with `response_format: { type: 'json_schema', json_schema: { name: 'extraction', strict: true, schema: ExtractionJsonSchema } }`
- Parse and return typed `ExtractionResult`
- `ExtractionJsonSchema` is the JSON Schema encoding of the TypeScript type defined in the Data Model section above

**`validate.ts`** — output validation + status suggestion:
- Assert `classification` is one of the allowed enum values
- Clamp `confidence` and per-signal `confidence` to [0, 1]
- Validate and normalize all date-time strings to ISO 8601 (set to `null` if malformed)
- Suggest `parser_run_status`: `'success'` (subscription signal, clean) | `'partial'` (subscription signal, validation errors) | `'no_signal'` (not_subscription or spam) | `'error'` (extraction failed)

**`match.ts`** — subscription scoring + write decision (per signal):
- Input: one `soundings_log` signal + existing pod subscriptions
- Score existing subscriptions against signal:
  - Provider/merchant domain exact match: 40 pts
  - Billed-by domain exact match: 35 pts
  - Display name fuzzy match (normalized, punctuation-stripped): 25 pts
  - Plan name match: 15 pts
  - Amount + currency match: 10 pts
  - Threshold to match: 60 pts
- Content-date-aware update policy:
  - Signal's `event_date` > existing `last_observed_content_date`: update all non-null fields
  - Signal's `event_date` ≤ existing: update only fields currently NULL on existing record
- Return: `{ action: 'insert' | 'update' | 'skip', matched_id?: string, payload: SubscriptionUpsert }`

**`app/api/parse/route.ts`** — orchestrator:

```
POST /api/parse
Headers: x-parse-secret: <PARSE_SECRET>
Body: { receipt_id: string, pod_id: string }
```

Flow:
1. Validate secret header; 401 if missing/wrong
2. Fetch receipt from `inbound_receipts`
3. **Idempotency guard:** if `parser_status IN ('parsed', 'ignored') OR last_parser_run_id IS NOT NULL` → return `{ status: 'skipped' }`
4. Normalize text → compute `input_hash`
5. **Idempotency on parser_runs:** check unique index `(inbound_receipt_id, parser_name, input_hash)` — if run already exists, return skipped
6. Call GPT-4 mini → `ExtractionResult`
7. Validate extract → suggest `parser_run_status`
8. Insert `parser_runs` row (status, classification, confidence, input_hash, input_excerpt, output_json, model_name, parser_name, parser_version, prompt_version)
9. For each signal in `extraction.signals`:
   a. Insert `soundings_log` row (all signal fields, `parser_run_id`, `pod_id`, `inbound_receipt_id`)
   b. Run `match.ts` against existing pod subscriptions
   c. Insert or update `subscriptions`
   d. Update `soundings_log` row: set `resolved_subscription_id`, `write_action`
   e. If `action = 'insert'`: enqueue "new subscription" email (fire-and-forget)
10. Update `parser_runs.actions`: `{ soundings_written: N, subscriptions_inserted: M, subscriptions_updated: P, subscriptions_skipped: Q }`
11. Update `inbound_receipts`: `parser_status = 'parsed'`, `last_parser_run_id`, `resolved_subscription_id` (first matched), `write_decision`, `write_reason`, `processed_at`

### Phase 4 — Cron Infrastructure

**`app/api/cron/parse-sweep/route.ts`:**
- Authenticated by `x-cron-secret` header
- Query: `SELECT id, pod_id FROM inbound_receipts WHERE parser_status = 'pending' AND created_at > now() - interval '24h' LIMIT 20`
- Call `/api/parse` for each sequentially (2s gap between calls to respect OpenAI rate limits)
- Return `{ processed: N }`

**`app/api/cron/renewal-reminders/route.ts`:**
- Authenticated by `x-cron-secret` header
- Query: `SELECT s.*, p.email, p.timezone FROM subscriptions s JOIN profiles p ON p.pod_id = s.pod_id WHERE s.next_renewal_at BETWEEN now() AND now() + interval '8 days' AND s.reminder_enabled = true AND s.status = 'active'`
- For each: send renewal reminder email via Resend
- Return `{ sent: N }`

Cron schedules in `wrangler.toml`:
- `*/5 * * * *` → parse-sweep
- `0 9 * * *` → renewal-reminders (9am UTC; future: per-user timezone)

### Phase 5 — Notification Emails

**`lib/email/index.ts`** — Resend client wrapper:
- `sendNewSubscriptionEmail(to, subscription)` — fires after parser writes a new subscription
- `sendRenewalReminderEmail(to, subscription, daysUntilRenewal)` — fires from cron

Email content (text-forward, minimal styling):

**New subscription detected:**
- Subject: `We found your [Merchant] subscription`
- Body: merchant, amount, billing cadence, next renewal date, cancellation URL if known, link to dashboard

**Renewal reminder:**
- Subject: `[Merchant] renews in [N] days — $[amount]`
- Body: merchant, renewal date, amount, days remaining, cancellation URL, link to dashboard
- Include cancellation difficulty indicator if known: "Cancellation: [Easy / Moderate / Difficult]"

### Phase 6 — Subscription Catalog UI

Replace [app/page.tsx](../app/page.tsx) placeholder.

**Data fetching:** Server component. Fetch via Supabase client (service role on server, anon on client):
```sql
SELECT s.*, pod.alias_email
FROM subscriptions s
JOIN pods pod ON pod.id = s.pod_id
JOIN profiles p ON p.pod_id = pod.id
WHERE p.auth_user_id = auth.uid()
ORDER BY s.next_renewal_at ASC NULLS LAST
```

**Per subscription card:**
- Display name + `merchant_domain` (favicon if available)
- `amount` + `currency` + `billing_cadence` formatted ("$9.99/month")
- Next renewal: relative ("in 23 days") + absolute date
- Status badge: `active` | `cancelled` | `trial`
- Cancellation difficulty: 1–5 dots (if `cancellation_difficulty` is set)
- Cancellation link: `[Cancel →]` pointing to `cancellation_url` (if set); else `[How to cancel]` pointing to a static help page

**Page header:**
- Alias email with copy-to-clipboard button: "Forward subscription emails to:"
- Monthly burn estimate: sum of all active subscriptions normalized to monthly cadence (annual ÷ 12)

**Empty state:** "Forward any subscription receipt to `<alias>` to get started."

**Cancelled subscriptions:** Shown below active ones, visually dimmed.

### Phase 7 — Cancellation Seed Data

Curate top 50 subscription providers and populate `merchants` table:
- `name`, `website`, `aliases[]`
- Extend with migration adding `cancellation_url`, `cancellation_difficulty` to `merchants` (or a separate `merchant_meta` table)
- When parser writes a subscription, attempt domain match against merchants → set `cancellation_url` and `cancellation_difficulty` on the subscription

Seed file: `supabase/seed.sql` (separate from migrations, safe to re-run).

---

## Full File Map

| File | Status | Notes |
|---|---|---|
| `wrangler.toml` | New | Cloudflare Workers config |
| `src/worker.ts` | New | OpenNext wrapper + scheduled cron handler |
| `package.json` | Modify | Next.js 15, @opennextjs/cloudflare, openai, resend |
| `app/api/mailgun/inbound/route.ts` | Modify | Fix 5 schema bugs, add `after()` parse trigger |
| `app/api/parse/route.ts` | New | Parser orchestrator |
| `lib/parser/normalize.ts` | New | Text normalization |
| `lib/parser/extract.ts` | New | GPT-4 mini structured extraction |
| `lib/parser/validate.ts` | New | Output validation |
| `lib/parser/match.ts` | New | Subscription scoring + write decision |
| `lib/parse-trigger.ts` | New | Shared helper for calling /api/parse |
| `app/api/cron/parse-sweep/route.ts` | New | Retry sweep for pending receipts |
| `app/api/cron/renewal-reminders/route.ts` | New | Daily reminder dispatch |
| `lib/email/index.ts` | New | Resend client + email templates |
| `app/page.tsx` | Rewrite | Subscription catalog UI |
| `supabase/migrations/20260505_000000_reboot_schema.sql` | New | Full schema DDL + removals + soundings_log |
| `supabase/seed.sql` | New | Top 50 merchants seed data |

---

## Environment Variables

| Variable | Where used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server writes (bypasses RLS) |
| `MAILGUN_SIGNING_KEY` | Webhook signature verification |
| `OPENAI_API_KEY` | GPT-4 mini extraction |
| `RESEND_API_KEY` | Outbound emails |
| `PARSE_SECRET` | Auth header for `/api/parse` |
| `CRON_SECRET` | Auth header for cron routes |
| `WORKERS_URL` | Base URL for internal fetches in `src/worker.ts` |

All go in `.dev.vars` locally and Cloudflare dashboard secrets for production.

---

## Local Development Setup

Two layers must run locally before any code is tested:

**Layer 1 — Local Supabase (database)**
Supabase provides a Docker-based copy of your full cloud stack (Postgres, Auth, Storage) that runs on your machine. This means schema changes and parser writes are tested against a real database without touching the cloud project.

| Command | What it does |
|---|---|
| `supabase start` | Boots local Postgres + Auth stack (requires Docker Desktop) |
| `supabase db reset` | Wipes local DB and re-runs all migrations + `seed.sql` fresh |
| `supabase stop` | Shuts down the local stack |

Local Supabase connection details are written to `.env.local` automatically by the CLI.

**Layer 2 — Local Next.js / Cloudflare**

| Command | Runtime | Use when |
|---|---|---|
| `npm run dev` | Node.js (next dev) | Daily development — fast restarts, instant error feedback |
| `npm run preview` | Cloudflare Workers simulator (wrangler dev) | Pre-deploy validation — catches CF-specific issues |
| `npm run deploy` | Cloudflare production | Shipping a tested build |

95% of development uses `npm run dev`. `npm run preview` is run once before each deploy to catch incompatibilities.

**What can be tested locally without you involved:**
- Mailgun webhook handler (send a fake payload via `curl`)
- Full parse pipeline (call `/api/parse` directly with a receipt ID)
- Cron sweep (call `/api/cron/parse-sweep` directly)
- Database writes (query local Supabase to verify rows)
- Email triggers (Resend test mode logs emails instead of sending)

**What requires your eyes:**
- The subscription catalog UI (open `http://localhost:3000` in browser)
- The onboarding and auth flow (requires a real email for magic link)
- Final end-to-end test with a real forwarded email (done once, on the Cloudflare preview deployment)

**Division of labor:**
Claude tests the backend end-to-end locally and reports results. You verify the UI in your browser and do the final real-email test on the Cloudflare preview. Only proven, locally-validated builds get deployed.

---

## Post-MVP Roadmap

| Phase | Features |
|---|---|
| **2** | Gmail OAuth ingestion (via `email_connections` table), PDF/image upload via GPT-4 Vision |
| **3** | Assisted cancellation flows (step-by-step per provider), subscription history timeline |
| **4** | Bank statement parsing, autonomous cancellation, cross-signal matching |
| **Ongoing** | Cancellation difficulty dataset — enriched by every parsed email |

---

## Verification Checklist

| Phase | Test |
|---|---|
| 0 | `wrangler dev` boots; login flow completes in Workers runtime; `@supabase/ssr` compatibility confirmed |
| 1 | `supabase db reset` succeeds cleanly with all migrations; `soundings_log` table exists; dead columns gone |
| 2 | POST Mailgun test payload → `inbound_receipts` row has `from_domain`, `source_type`, `profile_id`, correct `content_date`; `parser_status = 'pending'`; `/api/parse` called via `after()` |
| 3 | POST `{ receipt_id, pod_id }` to `/api/parse` directly → `parser_runs` row written, `soundings_log` row(s) written, `subscriptions` row created with `display_name`/`amount`/`next_renewal_at`; receipt `parser_status = 'parsed'` |
| 3b | POST same receipt_id again → returns `{ status: 'skipped' }`; no duplicate rows |
| 4 | Trigger `/api/cron/parse-sweep` → pending receipts processed; check `parser_status` flips to `'parsed'` for each |
| 4b | Set a subscription `next_renewal_at` to 3 days from now; trigger `/api/cron/renewal-reminders` → Resend email delivered to test inbox |
| 5 | Parser writes new subscription → "new subscription detected" email delivered within 30 seconds |
| 6 | Log in → dashboard shows subscription list with alias, amounts, renewal dates; empty state shows alias email; cancellation links visible for seeded merchants |
| 7 | Forward a real Spotify renewal email to alias → end-to-end: receipt stored, parsed, subscription appears in dashboard, "new subscription" email received |
