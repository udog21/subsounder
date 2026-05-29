-- One-off: fully reset the founder@chapter3projects.com account so it can be
-- re-onboarded as a brand-new signup.
--
-- DELETED:    subscriptions + subscription_cycles + inbound_receipts +
--             email_connections (via pods CASCADE), pods, profiles, auth.users.
-- PRESERVED:  parser_runs + soundings_log — historical parser audit + LLM eval
--             substrate. Their pod_id / inbound_receipt_id / resolved_subscription_id
--             back-refs are NULL'd so the rows survive as orphan audit.
-- PRESERVED:  lek101@gmail.com (personal account) — different auth_user_id / pod_id.
--
-- Original use case: validate fix #54 (alias_email generation in
-- create_pod_and_profile) end-to-end via a fresh InPrivate signup, without
-- ramping up the full onboarding-flow scaffolding (#8, #94) first. Expected
-- to be re-run after each subsequent onboarding milestone lands.
--
-- Lives in supabase/manual/ — one-off DML, doesn't touch the migration ledger.
--
-- USAGE:
--   1. Update the three target IDs below if founder@'s IDs ever change.
--   2. Run the DRY-RUN block first to see what would be touched.
--   3. Run the EXECUTE block, watch the NOTICE output.
--   4. Sign up founder@ from scratch in InPrivate browser → verify the new
--      pod has a freshly-generated alias_email matching ^[a-z0-9]{8}@inbound\.subsounder\.com$.

-- ---- TARGET IDs (founder@ as of 2026-05-28) ---------------------------------
-- target_auth_user = '0626207d-1ee2-437e-9ee0-646ede5782c2'
-- target_profile   = '0626207d-1ee2-437e-9ee0-646ede5782c2'  -- matches auth_user_id by convention
-- target_pod       = '55e81436-2b46-43a3-a6fa-e3183784398c'

-- ---- DRY RUN (read-only; safe to run anytime) -------------------------------
SELECT 'auth.users' AS table_name, count(*) AS n
FROM auth.users WHERE id = '0626207d-1ee2-437e-9ee0-646ede5782c2'::uuid
UNION ALL SELECT 'profiles', count(*)
FROM profiles WHERE id = '0626207d-1ee2-437e-9ee0-646ede5782c2'::uuid
UNION ALL SELECT 'pods', count(*)
FROM pods WHERE id = '55e81436-2b46-43a3-a6fa-e3183784398c'::uuid
UNION ALL SELECT 'subscriptions (cascade-deleted)', count(*)
FROM subscriptions WHERE pod_id = '55e81436-2b46-43a3-a6fa-e3183784398c'::uuid
UNION ALL SELECT 'subscription_cycles (cascade-deleted)', count(*)
FROM subscription_cycles c
JOIN subscriptions s ON s.id = c.subscription_id
WHERE s.pod_id = '55e81436-2b46-43a3-a6fa-e3183784398c'::uuid
UNION ALL SELECT 'inbound_receipts (cascade-deleted)', count(*)
FROM inbound_receipts WHERE pod_id = '55e81436-2b46-43a3-a6fa-e3183784398c'::uuid
UNION ALL SELECT 'email_connections (cascade-deleted)', count(*)
FROM email_connections WHERE pod_id = '55e81436-2b46-43a3-a6fa-e3183784398c'::uuid
UNION ALL SELECT 'parser_runs (preserved as orphans)', count(*)
FROM parser_runs WHERE pod_id = '55e81436-2b46-43a3-a6fa-e3183784398c'::uuid
UNION ALL SELECT 'soundings_log (preserved as orphans)', count(*)
FROM soundings_log WHERE pod_id = '55e81436-2b46-43a3-a6fa-e3183784398c'::uuid;

-- ---- EXECUTE (mutating) -----------------------------------------------------
DO $$
DECLARE
  target_auth_user uuid := '0626207d-1ee2-437e-9ee0-646ede5782c2';
  target_profile   uuid := '0626207d-1ee2-437e-9ee0-646ede5782c2';
  target_pod       uuid := '55e81436-2b46-43a3-a6fa-e3183784398c';
  n_subs int;
  n_cycles int;
  n_receipts int;
  n_soundings_orphaned int;
  n_parser_runs_orphaned int;
BEGIN
  -- Break NO ACTION back-refs from soundings_log to rows the pod cascade
  -- will remove. These rows survive as orphan audit (pod_id / receipt_id /
  -- subscription_id all NULL).
  UPDATE soundings_log
     SET pod_id = NULL,
         inbound_receipt_id = NULL,
         resolved_subscription_id = NULL
   WHERE pod_id = target_pod;
  GET DIAGNOSTICS n_soundings_orphaned = ROW_COUNT;

  -- Defensive: NULL subscriptions.current_cycle_id before the pod cascade
  -- tears down both subscriptions and subscription_cycles. (NO ACTION between
  -- the two is checked end-of-statement; pre-NULLing dodges any quirks.)
  UPDATE subscriptions SET current_cycle_id = NULL WHERE pod_id = target_pod;

  -- Capture cascade-target counts before the pod delete fires.
  SELECT count(*) INTO n_subs FROM subscriptions WHERE pod_id = target_pod;
  SELECT count(*) INTO n_cycles FROM subscription_cycles c
    JOIN subscriptions s ON s.id = c.subscription_id WHERE s.pod_id = target_pod;
  SELECT count(*) INTO n_receipts FROM inbound_receipts WHERE pod_id = target_pod;
  SELECT count(*) INTO n_parser_runs_orphaned FROM parser_runs WHERE pod_id = target_pod;

  -- profiles.pod_id → pods is RESTRICT, so delete profile before pod.
  -- Profile delete SET NULLs pods.owner_profile_id, inbound_receipts.profile_id,
  -- parser_runs.profile_id.
  DELETE FROM profiles WHERE id = target_profile;

  -- Pod delete cascades: subscriptions → subscription_cycles, inbound_receipts,
  -- email_connections. Pod delete SET NULLs parser_runs.pod_id; the inbound
  -- cascade additionally SET NULLs parser_runs.inbound_receipt_id. Parser_runs
  -- survives as orphan audit.
  DELETE FROM pods WHERE id = target_pod;

  -- Finally, the auth user. Re-signup with the same email mints a new uuid.
  DELETE FROM auth.users WHERE id = target_auth_user;

  RAISE NOTICE 'Reset complete for founder@chapter3projects.com';
  RAISE NOTICE '  auth_user=% profile=% pod=%', target_auth_user, target_profile, target_pod;
  RAISE NOTICE '  cascade-deleted: subscriptions=% cycles=% inbound_receipts=%', n_subs, n_cycles, n_receipts;
  RAISE NOTICE '  preserved as orphans: parser_runs=% soundings_log=%', n_parser_runs_orphaned, n_soundings_orphaned;
END $$;

-- ---- VERIFY (read-only; run after EXECUTE) ----------------------------------
SELECT 'auth.users' AS table_name, count(*) AS n
FROM auth.users WHERE id = '0626207d-1ee2-437e-9ee0-646ede5782c2'::uuid
UNION ALL SELECT 'profiles', count(*)
FROM profiles WHERE id = '0626207d-1ee2-437e-9ee0-646ede5782c2'::uuid
UNION ALL SELECT 'pods', count(*)
FROM pods WHERE id = '55e81436-2b46-43a3-a6fa-e3183784398c'::uuid;
-- Expected: all three rows return n=0.
