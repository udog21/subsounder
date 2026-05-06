# SubSounder — Architecture Decisions

Reference for non-obvious design choices that aren't derivable from reading the code alone.

---

## Pods: 1-user : 1-pod for MVP, n-pods later

A **pod** is a subscription group — the RLS boundary for all user data. Every table scopes to `pod_id`.

MVP enforces one pod per user (the `create_pod_and_profile` RPC creates both atomically). The 1:N structure is intentional future-proofing for:

- **Family sharing** — multiple profiles sharing one pod's catalog
- **Context separation** — personal subscriptions vs. side-gig vs. household, each in their own pod

No code needs to change to unlock this; it's purely a product/entitlement gate.

---

## Parser: two-layer model (`parser_runs` → `soundings_log`)

Parsing an inbound email produces two distinct record types:

| Table | Purpose | Granularity |
|---|---|---|
| `parser_runs` | Control plane — one row per parse attempt | 1 per receipt per attempt |
| `soundings_log` | Data plane — one row per extracted signal | 1–N per run |

**Why separate?** A run that finds nothing (`no_signal`) still needs to be tracked for observability and retry logic — without a separate control table, you'd either pollute the subscription data or lose the audit trail. The FK chain is `soundings_log.parser_run_id → parser_runs.id → inbound_receipts.id`.

Write order is always: `parser_runs` first → `soundings_log` per signal → `subscriptions` / `subscription_cycles`. Never merge these layers.

---

## Products table: product-line granularity, not corporate entity

The `products` table (renamed from `merchants` in migration `20260505_000001`) stores one row per **product line**, not one row per company.

| Row | parent |
|---|---|
| YouTube Premium | Alphabet / Google |
| Google One | Alphabet / Google |
| Amazon Prime | Amazon |
| Kindle Unlimited | Amazon |

This is necessary because `subscriptions` has a `UNIQUE (pod_id, product_id)` constraint — a user can hold YouTube Premium *and* Google One simultaneously, so they must be distinct product rows.

`parent_product_id` (self-referential FK on `products`) is for **display grouping only** — "4 Google services" in a summary view. Cancellation policy belongs on the leaf (child) row, since that's what the user actually cancels.

---

## Cancellation policy: two-layer (canonical vs. user-override)

| Column | Table | Meaning |
|---|---|---|
| `cancellation_url`, `cancellation_difficulty`, `cancellation_steps` | `products` | Researched, canonical values — same for all users of that product |
| `cancellation_url`, `cancellation_difficulty` | `subscriptions` | Per-user override — LLM-extracted from a receipt, or user-edited |

UI and reminder logic should read `subscriptions.cancellation_url ?? products.cancellation_url`. Updating the merchant's policy in `products` propagates to all users without touching subscription rows.

`cancellation_difficulty` is a `smallint` on a 1–5 scale (1 = self-serve easy, 5 = dark-pattern hard). `cancellation_steps` is prose — a URL alone is often insufficient (e.g., "call 1-800-COMCAST and hold for 20 minutes").

---

## Dedup: insert-on-conflict, never pre-check

Inbound receipt dedup uses `INSERT ... ON CONFLICT (pod_id, dedupe_key) DO NOTHING`. There is no pre-check SELECT. This is intentional — a pre-check creates a TOCTOU race under concurrent inbound delivery. The unique constraint is the guard.

Same pattern applies to `parser_runs` idempotency: `UNIQUE (inbound_receipt_id, parser_name, input_hash) WHERE input_hash IS NOT NULL`.
