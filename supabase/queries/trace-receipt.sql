-- Trace the parser pipeline for a single inbound_receipts row.
-- Replace the literal in `receipt AS (...)` with the receipt id you want to inspect.
-- Returns one row per downstream artifact, ordered by pipeline stage.

WITH receipt AS (
  SELECT id, pod_id, parser_status, last_parser_run_id, processed_at,
         from_email, subject, content_date, source_type, created_at
  FROM inbound_receipts
  WHERE id = '<RECEIPT_ID>'
),
runs AS (
  SELECT id, status, classification, confidence, model_name, parser_name,
         parser_version, prompt_version, input_hash, needs_review,
         actions, created_at
  FROM parser_runs
  WHERE inbound_receipt_id = (SELECT id FROM receipt)
),
soundings AS (
  SELECT id, parser_run_id, signal_type, merchant_name, merchant_domain,
         billed_by_name, billed_by_domain, plan_name,
         amount, currency, billing_cadence,
         event_date, next_renewal_at, cancel_by_at,
         confidence, evidence,
         resolved_subscription_id, write_action, created_at
  FROM soundings_log
  WHERE parser_run_id IN (SELECT id FROM runs)
),
cycles AS (
  SELECT id, subscription_id, signal_type,
         amount, currency, billing_cadence,
         period_start, period_end, next_renewal_at, cancel_by_at,
         source_sounding_id, created_at
  FROM subscription_cycles
  WHERE source_sounding_id IN (SELECT id FROM soundings)
),
subs AS (
  SELECT id, pod_id, display_name, provider_domain, plan_name,
         status, current_cycle_id, product_id,
         cancellation_url, cancellation_difficulty, canceled_at,
         reminder_enabled, created_at, updated_at
  FROM subscriptions
  WHERE id IN (
    SELECT resolved_subscription_id FROM soundings WHERE resolved_subscription_id IS NOT NULL
  )
)
SELECT '1_inbound_receipt'      AS stage, to_jsonb(receipt.*) AS data FROM receipt
UNION ALL
SELECT '2_parser_run',           to_jsonb(runs.*)             FROM runs
UNION ALL
SELECT '3_sounding',             to_jsonb(soundings.*)        FROM soundings
UNION ALL
SELECT '4_subscription_cycle',   to_jsonb(cycles.*)           FROM cycles
UNION ALL
SELECT '5_subscription',         to_jsonb(subs.*)             FROM subs
ORDER BY stage;