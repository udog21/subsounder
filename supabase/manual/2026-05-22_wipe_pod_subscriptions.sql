-- One-off cleanup: wipe all subscriptions + cycles for a pod.
--
-- Scope:
--   DELETED:  subscriptions + subscription_cycles (the catalog state)
--   PRESERVED: inbound_receipts, parser_runs, soundings_log (audit trail + LLM eval substrate)
--   NULL'd:   soundings_log.resolved_subscription_id, inbound_receipts.resolved_subscription_id
--             (so historical signals show as unmatched-orphans rather than dangling FKs)
--
-- Original use case: clear v1-era orphans before M0 dogfood (issue #9), so any
-- glaring misfire after the Gmail filter goes live is obviously a new misfire,
-- not stale MVP-era residue.
--
-- This lives in supabase/manual/ (not supabase/migrations/) because it's a
-- one-off DML cleanup, not a schema change. Hand-running schema migrations
-- desyncs the supabase_migrations ledger; one-off DML doesn't touch the ledger.
--
-- USAGE:
--   1. Set target_pod below to the pod_id you want to wipe.
--   2. Run inside a transaction (Supabase SQL editor or MCP execute_sql).
--      Note: the MCP tool runs each query in its own implicit transaction; for
--      a true dry-run, run the SELECT-only block first, then the DO block.
--   3. Verify the RAISE NOTICE output before relying on it.

-- ---- DRY RUN (read-only; safe to run anytime) -------------------------------
-- Replace the UUID with your pod_id, then run this to preview what would be touched.
SELECT
  'subscriptions to delete' AS metric,
  count(*) AS n
FROM subscriptions
WHERE pod_id = '798cb5cf-1369-4621-93ae-d51ca1076127'::uuid
UNION ALL
SELECT
  'cycles to cascade-delete',
  count(*)
FROM subscription_cycles c
JOIN subscriptions s ON s.id = c.subscription_id
WHERE s.pod_id = '798cb5cf-1369-4621-93ae-d51ca1076127'::uuid
UNION ALL
SELECT
  'soundings_log rows to NULL (back-ref)',
  count(*)
FROM soundings_log
WHERE pod_id = '798cb5cf-1369-4621-93ae-d51ca1076127'::uuid
  AND resolved_subscription_id IS NOT NULL
UNION ALL
SELECT
  'inbound_receipts (preserved, just back-ref SET NULL)',
  count(*)
FROM inbound_receipts
WHERE pod_id = '798cb5cf-1369-4621-93ae-d51ca1076127'::uuid;

-- ---- EXECUTE (mutating) -----------------------------------------------------
-- Run this block to perform the wipe. Wrap in BEGIN/COMMIT if your tool doesn't
-- do that automatically and you want a chance to ROLLBACK after inspecting notices.

DO $$
DECLARE
  target_pod uuid := '798cb5cf-1369-4621-93ae-d51ca1076127';
  before_subs int;
  before_cycles int;
  soundings_nulled int;
  after_subs int;
  after_cycles int;
BEGIN
  SELECT count(*) INTO before_subs
    FROM subscriptions WHERE pod_id = target_pod;
  SELECT count(*) INTO before_cycles
    FROM subscription_cycles c
    JOIN subscriptions s ON s.id = c.subscription_id
    WHERE s.pod_id = target_pod;

  -- Break the NO ACTION back-ref from soundings_log before deleting subs.
  UPDATE soundings_log
     SET resolved_subscription_id = NULL
   WHERE pod_id = target_pod
     AND resolved_subscription_id IS NOT NULL;
  GET DIAGNOSTICS soundings_nulled = ROW_COUNT;

  -- CASCADE handles: subscription_cycles (deleted), inbound_receipts.resolved_subscription_id (SET NULL).
  DELETE FROM subscriptions WHERE pod_id = target_pod;

  SELECT count(*) INTO after_subs
    FROM subscriptions WHERE pod_id = target_pod;
  SELECT count(*) INTO after_cycles
    FROM subscription_cycles c
    JOIN subscriptions s ON s.id = c.subscription_id
    WHERE s.pod_id = target_pod;

  RAISE NOTICE 'pod=%', target_pod;
  RAISE NOTICE 'subscriptions: % -> % (expected after=0)', before_subs, after_subs;
  RAISE NOTICE 'cycles:        % -> % (expected after=0)', before_cycles, after_cycles;
  RAISE NOTICE 'soundings_log.resolved_subscription_id NULL''d: %', soundings_nulled;
END $$;
