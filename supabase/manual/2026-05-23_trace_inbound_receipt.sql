-- Trace all DB mutations downstream of a single inbound_receipt.
--
-- Read-only. Walks the chain:
--   inbound_receipts
--     → parser_runs           (1:N — usually 1, possibly more if retried)
--       → soundings_log       (1:N per run — one row per extracted signal)
--         → subscriptions     (via soundings_log.resolved_subscription_id)
--         → subscription_cycles (via subscription_cycles.source_sounding_id)
--           → products        (via subscriptions.product_id)
--
-- Side-effect fields touched on the source row are surfaced in section 1
-- (parser_status, last_parser_run_id, resolved_subscription_id, write_decision,
-- write_reason, processed_at).
--
-- This lives in supabase/manual/ (not migrations/) because it does not modify
-- schema or data; it's a hand-run inspection tool.
--
-- USAGE:
--   1. Replace EVERY occurrence of the receipt UUID below with the target
--      inbound_receipts.id. (Find-and-replace the string '__RECEIPT_ID__'.)
--   2. Run each section in order; each is independent.
--   3. In the Supabase SQL editor or via MCP execute_sql, sections run as
--      separate queries — that's fine, no shared state needed.
--
-- Tip: a fresh test forward usually appears first in `parser_runs` ordered by
-- created_at DESC; use that to discover the receipt id.

-- ---- 1. The source receipt + its mutated side-effect fields -----------------
SELECT
  id,
  pod_id,
  received_at,
  from_email,
  subject,
  parser_status,
  last_parser_run_id,
  resolved_subscription_id,
  write_decision,
  write_reason,
  processed_at,
  error_code,
  error_detail
FROM inbound_receipts
WHERE id = '__RECEIPT_ID__'::uuid;


-- ---- 2. Parser run(s) -- one row per attempt -------------------------------
-- Multiple rows mean retries; check `input_hash` collisions and `status`.
SELECT
  id,
  created_at,
  parser_name,
  parser_version,
  model_name,
  prompt_version,
  status,
  classification,
  confidence,
  needs_review,
  error_code,
  error_detail,
  actions
FROM parser_runs
WHERE inbound_receipt_id = '__RECEIPT_ID__'::uuid
ORDER BY created_at;


-- ---- 3. Signals extracted -- one row per signal in each parser_run ---------
-- The `write_action` column shows what the matcher decided per signal
-- (insert | update | skip); `resolved_subscription_id` shows where it landed.
SELECT
  s.id              AS sounding_id,
  s.parser_run_id,
  pr.prompt_version,
  s.signal_type,
  s.merchant_name,
  s.merchant_domain,
  s.billed_by_name,
  s.plan_name,
  s.amount,
  s.currency,
  s.billing_cadence,
  s.event_date::date,
  s.next_renewal_at::date,
  s.cancel_by_at::date,
  (s.next_renewal_at::date - s.event_date::date) AS gap_days,
  s.confidence,
  s.write_action,
  s.resolved_subscription_id
FROM soundings_log s
JOIN parser_runs pr ON pr.id = s.parser_run_id
WHERE s.inbound_receipt_id = '__RECEIPT_ID__'::uuid
ORDER BY s.created_at;


-- ---- 4. Subscriptions touched (current state) ------------------------------
-- Joins through soundings_log.resolved_subscription_id to show the catalog row
-- as it stands NOW (not snapshotted at write time).
SELECT
  sub.id            AS subscription_id,
  sub.created_at    AS sub_created_at,
  sub.updated_at    AS sub_updated_at,
  sub.display_name,
  sub.provider_name,
  sub.provider_domain,
  sub.billed_by_name,
  sub.plan_name,
  sub.status,
  sub.last_observed_content_date::date,
  sub.current_cycle_id,
  sub.product_id,
  sub.cancellation_url,
  sub.cancellation_difficulty
FROM subscriptions sub
WHERE sub.id IN (
  SELECT DISTINCT resolved_subscription_id
  FROM soundings_log
  WHERE inbound_receipt_id = '__RECEIPT_ID__'::uuid
    AND resolved_subscription_id IS NOT NULL
)
ORDER BY sub.created_at;


-- ---- 5. Cycles inserted from this receipt's signals ------------------------
-- subscription_cycles.source_sounding_id is the audit FK back to the signal
-- that produced this cycle. Useful for verifying out-of-order handling
-- (subscriptions.current_cycle_id should point at the cycle with the latest
--  period_start, not necessarily the most recently created cycle).
SELECT
  c.id              AS cycle_id,
  c.created_at,
  c.subscription_id,
  c.signal_type,
  c.cycle_type,
  c.billing_cadence,
  c.amount,
  c.currency,
  c.period_start::date,
  c.period_end::date,
  c.next_renewal_at::date,
  c.cancel_by_at::date,
  c.source_sounding_id,
  (sub.current_cycle_id = c.id) AS is_current_cycle
FROM subscription_cycles c
LEFT JOIN subscriptions sub ON sub.id = c.subscription_id
WHERE c.source_sounding_id IN (
  SELECT id FROM soundings_log
  WHERE inbound_receipt_id = '__RECEIPT_ID__'::uuid
)
ORDER BY c.created_at;


-- ---- 6. Product(s) referenced (catalog-level enrichment trace) -------------
SELECT
  p.id              AS product_id,
  p.name,
  p.website,
  p.cancellation_url,
  p.cancellation_difficulty,
  p.enrichment_status
FROM products p
WHERE p.id IN (
  SELECT DISTINCT sub.product_id
  FROM subscriptions sub
  WHERE sub.id IN (
    SELECT DISTINCT resolved_subscription_id
    FROM soundings_log
    WHERE inbound_receipt_id = '__RECEIPT_ID__'::uuid
      AND resolved_subscription_id IS NOT NULL
  )
    AND sub.product_id IS NOT NULL
);


-- ---- 7. One-shot summary (useful for at-a-glance verification) -------------
-- Single row per signal with the cycle that was produced from it, the resolved
-- subscription's current state, and the prompt_version. The shape you'd paste
-- into a PR comment to demonstrate "this email parsed correctly under v3."
SELECT
  pr.prompt_version,
  s.signal_type,
  s.merchant_name,
  s.plan_name,
  s.billing_cadence       AS signal_cadence,
  s.event_date::date,
  s.next_renewal_at::date,
  s.cancel_by_at::date,
  (s.next_renewal_at::date - s.event_date::date) AS gap_days,
  s.write_action,
  sub.display_name        AS landed_in_subscription,
  sub.status              AS sub_status,
  c.id                    AS cycle_id,
  c.amount                AS cycle_amount,
  (sub.current_cycle_id = c.id) AS cycle_is_current
FROM soundings_log s
JOIN parser_runs pr        ON pr.id = s.parser_run_id
LEFT JOIN subscriptions sub ON sub.id = s.resolved_subscription_id
LEFT JOIN subscription_cycles c ON c.source_sounding_id = s.id
WHERE s.inbound_receipt_id = '__RECEIPT_ID__'::uuid
ORDER BY s.created_at;
