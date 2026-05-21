-- Phase 1: Reboot schema — remove dead columns, add new columns,
-- fix parser_status constraint, add dedup index, add triggers,
-- update RPC, create soundings_log.

-- 1. Remove dead columns
ALTER TABLE inbound_receipts
  DROP COLUMN IF EXISTS subject_hash,
  DROP COLUMN IF EXISTS payload_hash;

ALTER TABLE profiles
  DROP COLUMN IF EXISTS inbound_total_count,
  DROP COLUMN IF EXISTS inbound_subscription_count,
  DROP COLUMN IF EXISTS inbound_non_subscription_count;

ALTER TABLE subscription_cycles
  DROP COLUMN IF EXISTS inferred_from_sounding_log_id;

-- 2. Add new columns
ALTER TABLE inbound_receipts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancellation_url text,
  ADD COLUMN IF NOT EXISTS cancellation_difficulty smallint,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

-- 3. Tighten parser_status to values the code actually uses.
--    All existing rows are 'pending' — safe to replace constraint.
ALTER TABLE inbound_receipts
  DROP CONSTRAINT IF EXISTS inbound_receipts_parser_status_check;
ALTER TABLE inbound_receipts
  ADD CONSTRAINT inbound_receipts_parser_status_check
  CHECK (parser_status = ANY (ARRAY['pending'::text, 'parsed'::text, 'ignored'::text, 'error'::text]));

-- 4. Unique constraint for ON CONFLICT (pod_id, dedupe_key) dedup
ALTER TABLE inbound_receipts
  ADD CONSTRAINT inbound_receipts_pod_dedupe_key
  UNIQUE (pod_id, dedupe_key);

-- 5. Unique index on parser_runs for idempotency guard in orchestrator
CREATE UNIQUE INDEX IF NOT EXISTS parser_runs_idempotency_idx
  ON parser_runs (inbound_receipt_id, parser_name, input_hash)
  WHERE input_hash IS NOT NULL;

-- 6. Auto-update triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS inbound_receipts_set_updated_at ON inbound_receipts;
CREATE TRIGGER inbound_receipts_set_updated_at
  BEFORE UPDATE ON inbound_receipts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. Fix create_pod_and_profile RPC: set auth_user_id on insert
CREATE OR REPLACE FUNCTION create_pod_and_profile(
  user_id UUID,
  user_display_name TEXT,
  user_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  pod_id UUID,
  profile_id UUID
) AS $$
DECLARE
  v_pod_id UUID;
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE id = user_id;

  IF v_profile_id IS NOT NULL THEN
    SELECT pod_id INTO v_pod_id
    FROM profiles
    WHERE id = v_profile_id;
    RETURN QUERY SELECT v_pod_id, v_profile_id;
    RETURN;
  END IF;

  INSERT INTO pods (owner_profile_id, name, alias_status)
  VALUES (NULL, 'My Subscriptions', 'unverified')
  RETURNING id INTO v_pod_id;

  INSERT INTO profiles (id, pod_id, display_name, email, timezone, currency, reminder_days_before, auth_user_id)
  VALUES (
    user_id, v_pod_id, user_display_name, user_email,
    'America/Los_Angeles', 'USD', 7, user_id
  )
  RETURNING id INTO v_profile_id;

  UPDATE pods SET owner_profile_id = v_profile_id WHERE id = v_pod_id;

  RETURN QUERY SELECT v_pod_id, v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create soundings_log
CREATE TABLE IF NOT EXISTS soundings_log (
  id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at                timestamptz DEFAULT now() NOT NULL,

  parser_run_id             uuid NOT NULL REFERENCES parser_runs(id) ON DELETE CASCADE,
  pod_id                    uuid REFERENCES pods(id),
  inbound_receipt_id        uuid REFERENCES inbound_receipts(id),

  signal_type               text NOT NULL,
  merchant_name             text,
  merchant_domain           text,
  billed_by_name            text,
  billed_by_domain          text,
  plan_name                 text,
  amount                    numeric,
  currency                  text,
  billing_cadence           text,
  event_date                timestamptz,
  period_start              timestamptz,
  period_end                timestamptz,
  next_renewal_at           timestamptz,
  cancel_by_at              timestamptz,
  confidence                numeric,
  evidence                  text,
  raw_extract               jsonb,
  resolved_subscription_id  uuid REFERENCES subscriptions(id),
  write_action              text
);

CREATE INDEX IF NOT EXISTS soundings_log_parser_run_idx
  ON soundings_log (parser_run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS soundings_log_pod_idx
  ON soundings_log (pod_id, created_at DESC);
CREATE INDEX IF NOT EXISTS soundings_log_receipt_idx
  ON soundings_log (inbound_receipt_id);
CREATE INDEX IF NOT EXISTS soundings_log_resolved_sub_idx
  ON soundings_log (resolved_subscription_id);
CREATE INDEX IF NOT EXISTS soundings_log_signal_type_idx
  ON soundings_log (signal_type);

-- 9. RLS on soundings_log (pods-scoped, same pattern as other tables)
ALTER TABLE soundings_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own soundings"
  ON soundings_log FOR SELECT
  USING (
    pod_id IN (
      SELECT pod_id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );
