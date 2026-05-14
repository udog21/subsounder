# How SubSounder Runs

A plain-English walkthrough of what happens between "user forwards an email" and "user gets a renewal reminder." Written so a non-coder collaborator (designer, advisor, future you) can follow along without reading the code.

For the *why* behind specific design choices, see [`architecture.md`](architecture.md). For the formal record of one such decision, see [`adr/0001-in-process-cron-and-parse.md`](adr/0001-in-process-cron-and-parse.md).

---

## The product loop in one diagram

```
                                   ┌────────────────────────────┐
User forwards subscription   ──→   │  Mailgun (email infra)     │
email to their alias               │  Receives mail, POSTs       │
e.g. lekd2026@inbound...           │  contents to our Worker     │
                                   └────────────┬───────────────┘
                                                │
                                                ▼
                                ┌────────────────────────────────┐
                                │  Cloudflare Worker             │
                                │  /api/mailgun/inbound          │
                                │                                │
                                │  1. Verify Mailgun signature   │
                                │  2. Insert receipt into DB     │
                                │  3. Reply "200 OK" to Mailgun  │
                                │  4. (Background) Run parser    │
                                └────────────┬───────────────────┘
                                             │
                                             ▼  (in-process,
                                             │   not HTTP)
                                ┌────────────────────────────────┐
                                │  Parser (lib/parser/run.ts)    │
                                │                                │
                                │  → Clean up the email text     │
                                │  → Send to OpenAI GPT-4o-mini  │
                                │  → Get back structured data    │
                                │  → Write parser_run, sounding, │
                                │    subscription, cycle rows    │
                                │  → Send "found subscription"   │
                                │    email via Mailgun           │
                                └────────────────────────────────┘

Independently, Cloudflare's scheduler fires every 5–60 minutes:

                                ┌────────────────────────────────┐
Cron trigger fires        ──→   │  Worker scheduled() handler    │
(e.g. */5 * * * *)              │                                │
                                │  → runParseSweep()    every 5m │
                                │  → runProductEnrichment() 15m  │
                                │  → runAdminDigest()       8am  │
                                │  → runRenewalReminders()  9am  │
                                └────────────────────────────────┘
```

## The relay race metaphor

Imagine handing off a baton in a relay race.

**Inbound email is a one-legged race with a victory lap.** Mailgun hands the baton to our Worker. The Worker:

1. Does the fast work first — verifies the signature, stores the email in the database, crosses the finish line and gives Mailgun its `200 OK`.
2. Then keeps running on a victory lap to do the slow work — calling OpenAI, writing the subscription data, sending the notification email — all *after* the visible race is over.

This victory lap is enabled by `after()` (a Next.js feature that maps to Cloudflare's `ctx.waitUntil()`). Cloudflare keeps the Worker alive for up to 30 seconds after the response to finish background work. Mailgun never waits; it sees a fast 200 and moves on.

The earlier design had the Worker radio over to a "second runner" (an HTTP call back to its own `/api/parse` endpoint) for the victory lap. Cloudflare's edge protections kept blocking the radio signal. We removed the radio entirely — the same runner does both legs now.

## Where things live

| What | Where | Notes |
|---|---|---|
| Marketing site | webflow.com → `www.subsounder.com` | Outside the repo |
| App (login, catalog) | Cloudflare Worker → `app.subsounder.com` | This repo |
| Database | Supabase (Postgres) | Schema in [`supabase/migrations/`](../supabase/migrations/) |
| Inbound email | Mailgun → MX records on `inbound.subsounder.com` | Configured in Mailgun dashboard |
| Outbound email | Mailgun → from `sys-bot@subsounder.com` | Same Mailgun account |
| LLM parsing | OpenAI `gpt-4o-mini` | Prompt seeded in `prompt_templates` table |

In the repo, the most important folders:

| Folder | Purpose |
|---|---|
| [`app/`](../app/) | Next.js app — pages and HTTP routes |
| [`app/page.tsx`](../app/page.tsx) | The subscription catalog (the main user-facing page) |
| [`app/api/mailgun/inbound/`](../app/api/mailgun/inbound/) | Where forwarded emails arrive |
| [`app/api/parse/`](../app/api/parse/) | HTTP wrapper for manual parse triggering |
| [`app/api/cron/`](../app/api/cron/) | HTTP wrappers for cron jobs (manually triggerable via curl) |
| [`lib/parser/`](../lib/parser/) | The actual parsing logic (normalize, extract, validate, match, run) |
| [`lib/cron/`](../lib/cron/) | The actual cron job logic (sweep, reminders, digest, enrichment) |
| [`lib/email/`](../lib/email/) | Mailgun send wrapper |
| [`src/worker.ts`](../src/worker.ts) | Worker entry point — Cloudflare calls this for both HTTP and scheduled events |
| [`supabase/migrations/`](../supabase/migrations/) | Database schema, applied in order |
| [`supabase/queries/`](../supabase/queries/) | Helpful diagnostic SQL (run in Supabase SQL editor) |
| [`docs/`](.) | Documentation (you are here) |

## How to debug when something looks wrong

| Symptom | First place to look |
|---|---|
| Forwarded email never appears in catalog | Mailgun → Logs (did it arrive?) → DB `inbound_receipts` (was it stored?) → DB `parser_runs` (did it parse?) |
| Subscription appears but with wrong data | DB `soundings_log` for the receipt — that's what the LLM extracted |
| Renewal reminder didn't fire | DB `subscriptions.reminder_enabled = true`? `current_cycle_id` points to a row with `next_renewal_at` in the next 8 days? Then check Cloudflare Worker logs for the 9am cron firing |
| Catalog page errors / blank | Cloudflare Worker logs → look for the page render error |
| Email confirmation didn't arrive | DB `parser_runs.actions` includes `emails_sent` / `emails_failed` / `email_errors[]` for that run |

The trace query at [`supabase/queries/trace-receipt.sql`](../supabase/queries/trace-receipt.sql) walks the full chain for a given receipt — paste it into the Supabase SQL editor, replace the `<RECEIPT_ID>`, and you'll see every row across all stages.

## The big-picture invariants

Things that should always be true. If you see something break one of these, it's a bug:

1. **One receipt → exactly one `parser_run` per parse attempt.** Re-running parse for the same receipt is idempotent (it skips).
2. **`parser_run` can have zero `soundings_log` rows.** That's the "no subscription signal in this email" case — perfectly valid.
3. **`subscription` is never financial.** Amounts, currencies, cadences, dates all live on `subscription_cycles`. The UI reads them through `subscriptions.current_cycle_id`.
4. **Mailgun gets 200 within ~1 second.** Any slow work happens in the background via `after()`.
5. **Workers never call themselves over HTTP.** Background and cron work are always direct function calls.

These five invariants are why the architecture looks the way it does. Most of the [`architecture.md`](architecture.md) entries are reasoning that supports one of these.
