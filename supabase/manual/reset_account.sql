-- Reset a single account so it can be re-onboarded as a brand-new signup.
--
-- SCOPE: dev / dogfood reset. NOT a GDPR-grade user-deletion path — body_text
-- and body_html are preserved (they're the LLM eval substrate, and the whole
-- reason this script keeps inbound_receipts at all) and those columns still
-- contain personal data (names, addresses, transaction details). A real
-- production user-deletion endpoint must be built separately and either
-- hard-delete inbound_receipts or tokenize body content.
--
-- USAGE
--   1. Replace `target_profile` below with the profile UUID to reset.
--      The script derives auth.users.id (same UUID by convention) and
--      pod_id (from profiles.pod_id) automatically.
--   2. To preview only, wrap the DO block in BEGIN; ... ROLLBACK;
--      NOTICE output still shows what would be touched; no rows change.
--   3. To execute, run as-is. NOTICE output shows what was touched.
--
-- DELETED:    subscriptions + subscription_cycles + email_connections (via
--             pods CASCADE), pods, profiles, auth.users.
-- PRESERVED:  inbound_receipts + parser_runs + soundings_log — historical
--             parser audit + LLM eval substrate. Back-refs from these tables
--             to deleted rows (pod_id, profile_id, resolved_subscription_id)
--             are NULL'd so they survive as orphan audit. On inbound_receipts
--             the high-PII columns (from_email, to_email, to_localpart,
--             raw_payload) are additionally NULL'd to strip alias / forwarded-
--             header identifiers. body_text + body_html + subject are kept
--             intact (eval substrate); subject can contain PII case-by-case
--             and may want manual scrubbing.
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
  n_receipts_preserved    int;
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
  SELECT count(*) INTO n_receipts_preserved
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
  RAISE NOTICE '  email_connections   = % (cascade-deleted)', n_email_connections;
  RAISE NOTICE '  inbound_receipts    = % (preserved as orphans, PII stripped)', n_receipts_preserved;
  RAISE NOTICE '  parser_runs         = % (preserved as orphans)', n_parser_runs_orphaned;
  RAISE NOTICE '  soundings_log       = % (preserved as orphans)', n_soundings_orphaned;

  -- Preserve inbound_receipts as orphan eval substrate. NULL the back-refs
  -- so the pods CASCADE doesn't take them, AND strip the high-PII fields
  -- (from_email / to_email / to_localpart / raw_payload — all contain
  -- alias or forwarded-header identifiers). body_text + body_html + subject
  -- stay; they're the eval substrate and the reason this script keeps
  -- inbound_receipts at all. See SCOPE note at top — body still has PII; a
  -- GDPR-grade deletion path must hard-delete or tokenize body content.
  UPDATE inbound_receipts
     SET pod_id = NULL,
         profile_id = NULL,
         resolved_subscription_id = NULL,
         from_email = NULL,
         to_email = NULL,
         to_localpart = NULL,
         raw_payload = NULL
   WHERE pod_id = target_pod;

  -- Break NO ACTION back-refs from soundings_log to subscription rows the
  -- pod cascade will remove. inbound_receipt_id stays populated (the receipt
  -- is preserved above) so the parser_run → soundings → receipt chain
  -- remains traversable for eval.
  UPDATE soundings_log
     SET pod_id = NULL,
         resolved_subscription_id = NULL
   WHERE pod_id = target_pod;

  -- Defensive: NULL subscriptions.current_cycle_id before the pod cascade
  -- tears down both subscriptions and subscription_cycles. (NO ACTION
  -- between the two is checked end-of-statement; pre-NULLing dodges any
  -- quirks.)
  UPDATE subscriptions SET current_cycle_id = NULL WHERE pod_id = target_pod;

  -- profiles.pod_id → pods is RESTRICT, so delete profile before pod.
  -- Profile delete SET NULLs pods.owner_profile_id and
  -- parser_runs.profile_id. (inbound_receipts.profile_id is already NULL
  -- from the strip above.)
  DELETE FROM profiles WHERE id = target_profile;

  -- Pod delete cascades: subscriptions → subscription_cycles, and
  -- email_connections. Pod delete SET NULLs parser_runs.pod_id.
  -- inbound_receipts is preserved (already NULL'd above, the cascade is a
  -- no-op for it). Parser_runs survives as orphan audit with its
  -- inbound_receipt_id link intact.
  DELETE FROM pods WHERE id = target_pod;

  -- Finally, the auth user. Re-signup with the same email mints a new
  -- uuid.
  DELETE FROM auth.users WHERE id = target_auth_user;

  RAISE NOTICE '--- Reset complete ---';
END $$;
