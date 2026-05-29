-- Reset a single account so it can be re-onboarded as a brand-new signup.
--
-- USAGE
--   1. Replace `target_profile` below with the profile UUID to reset.
--      The script derives auth.users.id (same UUID by convention) and
--      pod_id (from profiles.pod_id) automatically.
--   2. To preview only, wrap the DO block in BEGIN; ... ROLLBACK;
--      NOTICE output still shows what would be touched; no rows change.
--   3. To execute, run as-is. NOTICE output shows what was touched.
--
-- DELETED:    subscriptions + subscription_cycles + inbound_receipts +
--             email_connections (via pods CASCADE), pods, profiles,
--             auth.users.
-- PRESERVED:  parser_runs + soundings_log — historical parser audit + LLM
--             eval substrate. Their pod_id / inbound_receipt_id /
--             resolved_subscription_id back-refs are NULL'd so the rows
--             survive as orphan audit.
--
-- Lives in supabase/manual/ — one-off DML, doesn't touch the migration
-- ledger. Expected to be re-run after each onboarding milestone lands.

DO $$
DECLARE
  -- ▼▼▼ The only line to edit. ▼▼▼
  target_profile uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  -- ▲▲▲                              ▲▲▲

  target_auth_user        uuid;
  target_pod              uuid;
  n_subs                  int;
  n_cycles                int;
  n_receipts              int;
  n_email_connections     int;
  n_soundings_orphaned    int;
  n_parser_runs_orphaned  int;
BEGIN
  -- Resolve linked IDs. By convention, profiles.id == auth.users.id.
  SELECT pod_id INTO target_pod FROM profiles WHERE id = target_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile found with id %', target_profile;
  END IF;

  target_auth_user := target_profile;

  RAISE NOTICE '--- Reset target ---';
  RAISE NOTICE '  profile   = %', target_profile;
  RAISE NOTICE '  pod       = %', target_pod;
  RAISE NOTICE '  auth_user = %', target_auth_user;

  -- Pre-counts: sanity-check what's about to be touched.
  SELECT count(*) INTO n_subs
    FROM subscriptions WHERE pod_id = target_pod;
  SELECT count(*) INTO n_cycles
    FROM subscription_cycles c
    JOIN subscriptions s ON s.id = c.subscription_id
    WHERE s.pod_id = target_pod;
  SELECT count(*) INTO n_receipts
    FROM inbound_receipts WHERE pod_id = target_pod;
  SELECT count(*) INTO n_email_connections
    FROM email_connections WHERE pod_id = target_pod;
  SELECT count(*) INTO n_parser_runs_orphaned
    FROM parser_runs WHERE pod_id = target_pod;
  SELECT count(*) INTO n_soundings_orphaned
    FROM soundings_log WHERE pod_id = target_pod;

  RAISE NOTICE '--- Pre-counts ---';
  RAISE NOTICE '  subscriptions       = % (cascade-deleted)', n_subs;
  RAISE NOTICE '  subscription_cycles = % (cascade-deleted)', n_cycles;
  RAISE NOTICE '  inbound_receipts    = % (cascade-deleted)', n_receipts;
  RAISE NOTICE '  email_connections   = % (cascade-deleted)', n_email_connections;
  RAISE NOTICE '  parser_runs         = % (preserved as orphans)', n_parser_runs_orphaned;
  RAISE NOTICE '  soundings_log       = % (preserved as orphans)', n_soundings_orphaned;

  -- Break NO ACTION back-refs from soundings_log to rows the pod cascade
  -- will remove. These rows survive as orphan audit (pod_id / receipt_id /
  -- subscription_id all NULL).
  UPDATE soundings_log
     SET pod_id = NULL,
         inbound_receipt_id = NULL,
         resolved_subscription_id = NULL
   WHERE pod_id = target_pod;

  -- Defensive: NULL subscriptions.current_cycle_id before the pod cascade
  -- tears down both subscriptions and subscription_cycles. (NO ACTION
  -- between the two is checked end-of-statement; pre-NULLing dodges any
  -- quirks.)
  UPDATE subscriptions SET current_cycle_id = NULL WHERE pod_id = target_pod;

  -- profiles.pod_id → pods is RESTRICT, so delete profile before pod.
  -- Profile delete SET NULLs pods.owner_profile_id,
  -- inbound_receipts.profile_id, parser_runs.profile_id.
  DELETE FROM profiles WHERE id = target_profile;

  -- Pod delete cascades: subscriptions → subscription_cycles,
  -- inbound_receipts, email_connections. Pod delete SET NULLs
  -- parser_runs.pod_id; the inbound cascade additionally SET NULLs
  -- parser_runs.inbound_receipt_id. Parser_runs survives as orphan audit.
  DELETE FROM pods WHERE id = target_pod;

  -- Finally, the auth user. Re-signup with the same email mints a new
  -- uuid.
  DELETE FROM auth.users WHERE id = target_auth_user;

  RAISE NOTICE '--- Reset complete ---';
END $$;
