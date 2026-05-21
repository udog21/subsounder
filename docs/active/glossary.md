# SubSounder Glossary

The vocabulary used in code, chats, and the rest of the docs. If a term shows up that isn't here and should be, add it.

Terms are grouped by where they live in the pipeline. Within each group: alphabetical.

## Identity & scope

| Term | Meaning |
|---|---|
| **alias** / **alias email** | The unique forwarding address tied to a pod, e.g. `lekd2026@inbound.subsounder.com`. Users forward subscription receipts here. Stored on `pods.alias_email`. |
| **pod** | The subscription group; the RLS boundary for all per-user data. Every table scopes to `pod_id`. MVP is 1 pod per user, but the model supports 1:N for future family/context separation. |
| **profile** | A user account record in `profiles`, linked to `auth.users` via `auth_user_id`. Owns a pod via `pods.owner_profile_id`. |

## Ingestion

| Term | Meaning |
|---|---|
| **`after()`** | The Next.js 15 helper that maps to Cloudflare's `ctx.waitUntil()`. Keeps the worker alive for up to 30 seconds after the response is sent, so slow work (LLM parse, email send) can finish without holding up Mailgun. |
| **dedupe_key** | The natural key on `inbound_receipts` used by `INSERT ... ON CONFLICT (pod_id, dedupe_key) DO NOTHING`. The unique constraint is the guard against duplicate inbound deliveries; no pre-check SELECT. |
| **inbound receipt** | A row in `inbound_receipts` — the raw email payload Mailgun POSTed to `/api/mailgun/inbound`. Has `parser_status` of `pending | parsed | ignored | error`. |
| **Mailgun inbound** | The webhook path: Mailgun receives mail at `inbound.subsounder.com`, signs the POST, our handler verifies + stores + acknowledges. |

## Parsing

| Term | Meaning |
|---|---|
| **classification** | The LLM's verdict on the email as a whole: `subscription | maybe_subscription | not_subscription | spam`. Distinct from per-signal extraction. |
| **confidence** | A 0–1 score. Lives at two levels: overall classification confidence on `parser_runs`, and per-signal confidence on `soundings_log`. |
| **evidence** | A short quote from the email justifying a classification or a signal. Useful for debugging and for the admin digest. |
| **`input_hash`** | SHA-256 of the normalized text. Used by `parser_runs` idempotency (`UNIQUE (inbound_receipt_id, parser_name, input_hash) WHERE input_hash IS NOT NULL`) so re-parsing the same receipt twice is a no-op. |
| **`needs_review`** | Boolean flag on `parser_runs` for outputs that warrant a human eye. Surfaced via the daily admin digest cron. Cleared by setting `reviewed_at`. |
| **normalize** | The text-cleanup step in `lib/parser/normalize.ts`: HTML → plaintext, extract innermost forwarded block, strip header stanza, prepend metadata header, truncate to 12k chars. |
| **parser run** | One row in `parser_runs` — the control plane record for one parse attempt. Tracks status, classification, model, prompt version. One per receipt per attempt. |
| **prompt template** | A versioned LLM system prompt in `prompt_templates`. Exactly one row per `agent_name` is `is_active = true`. Never UPDATEd in place — always a new migration row that flips the old to inactive and inserts a new version. |
| **signal** | One extracted subscription event: a renewal notice, a charge receipt, a trial start, etc. The LLM always returns `signals[]` even if there's only one. |
| **`signal_type`** | The kind of event: `renewal_notice | receipt | charge | trial_start | trial_ending | subscription_confirm | cancellation_confirm | price_change`. Mirrored from sounding to subscription cycle. |
| **sounding** | A row in `soundings_log` — the data plane record for one extracted signal. Zero, one, or many per parser run. A run with zero soundings is the `no_signal` case and is valid. |

## Subscriptions & products

| Term | Meaning |
|---|---|
| **cancellation difficulty** | A 1–5 `smallint` (1 = self-serve easy, 5 = dark-pattern hard). Lives on both `products` (canonical) and `subscriptions` (per-user override). |
| **`current_cycle_id`** | FK from `subscriptions` to its most recent `subscription_cycles` row. UI reads amount, currency, cadence, dates through this join — never directly from `subscriptions`, which holds identity only. |
| **cycle** / **subscription cycle** | A row in `subscription_cycles` — one billing event (trial, receipt, renewal, cancellation). Holds the financials and temporal bounds. Trials have `amount = 0`. |
| **enrichment** | The product-enrichment cron's job: fetch a product's pricing page, extract `pricing[]` jsonb via Claude Haiku, mark `enrichment_status = enriched | fetch_failed`. |
| **parent product** | The `parent_product_id` self-FK on `products` — display grouping only ("4 Google services"). Cancellation policy lives on the leaf, not the parent. |
| **product** | One row per **product line** in `products` (e.g. YouTube Premium, Google One — not "Google"). Necessary because a user can hold multiple products from one company and `subscriptions` has `UNIQUE (pod_id, product_id)`. |
| **`resolved_subscription_id`** | The back-pointer from `soundings_log` to the subscription a signal ended up writing or updating. Set after matcher decision. |
| **subscription** | A row in `subscriptions` — identity + status only (no financial columns). The "what service does this user have" view. |
