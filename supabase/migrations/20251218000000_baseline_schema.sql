-- Baseline schema: reproduces the pre-reboot state of the public schema so that
-- supabase db reset can rebuild the full database from migrations.
-- Source: introspect captured 2026-05-05 before 20260505000000_reboot_schema.sql was applied.
-- Run order: this → 20251218000001_create_pod_and_profile_rpc.sql → 20260505000000_reboot_schema.sql

-- ─────────────────────────────────────────────────────────────────
-- Helper functions
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_inbound_receipts_pod_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.pod_id IS NOT NULL AND NEW.pod_id IS DISTINCT FROM OLD.pod_id THEN
    RAISE EXCEPTION 'pod_id cannot be changed once set (old %, new %)', OLD.pod_id, NEW.pod_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- Tables (FK-dependency order; circular FKs resolved after both tables exist)
-- ─────────────────────────────────────────────────────────────────

-- pods: owner_profile_id FK deferred — profiles doesn't exist yet
CREATE TABLE pods (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        timestamptz DEFAULT now() NOT NULL,
  owner_profile_id  uuid,
  name              text        NOT NULL DEFAULT 'My Subscriptions',
  alias_email       text        UNIQUE,
  alias_status      text        NOT NULL DEFAULT 'unverified',
  alias_verified_at timestamptz,
  updated_at        timestamptz,
  pod_status        text        NOT NULL DEFAULT 'trial',
  created_via       text,
  last_activity_at  timestamptz
);

CREATE TABLE profiles (
  id                             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at                     timestamptz DEFAULT now() NOT NULL,
  pod_id                         uuid        NOT NULL REFERENCES pods(id),
  display_name                   text,
  email                          text,
  phone_e164                     text        UNIQUE,
  timezone                       text        NOT NULL DEFAULT 'America/Los_Angeles',
  currency                       text        NOT NULL DEFAULT 'USD',
  reminder_days_before           integer     NOT NULL DEFAULT 7,
  updated_at                     timestamptz,
  identity_state                 text        NOT NULL DEFAULT 'unclaimed',
  entitlement_status             text        NOT NULL DEFAULT 'trial',
  ingest_state                   text        NOT NULL DEFAULT 'active',
  trial_started_at               timestamptz NOT NULL DEFAULT now(),
  trial_ends_at                  timestamptz,
  current_period_ends_at         timestamptz,
  canceled_at                    timestamptz,
  plan_code                      text,
  last_inbound_at                timestamptz,
  inbound_total_count            integer     NOT NULL DEFAULT 0,
  inbound_subscription_count     integer     NOT NULL DEFAULT 0,
  inbound_non_subscription_count integer     NOT NULL DEFAULT 0,
  blocked_reason                 text,
  auth_user_id                   uuid
);

-- Resolve pods ↔ profiles circular FK
ALTER TABLE pods
  ADD CONSTRAINT pods_owner_profile_fk
  FOREIGN KEY (owner_profile_id) REFERENCES profiles(id);

CREATE TABLE keywords (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now() NOT NULL,
  keyword      text        NOT NULL,
  keyword_type text        NOT NULL DEFAULT 'subscription',
  weight       integer     NOT NULL DEFAULT 1,
  language     text        NOT NULL DEFAULT 'en'
);

CREATE TABLE merchants (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  name       text        NOT NULL,
  website    text,
  aliases    text[]      NOT NULL DEFAULT '{}',
  is_global  boolean     NOT NULL DEFAULT true
);

-- subscriptions: last_source_receipt_id FK deferred — inbound_receipts doesn't exist yet
CREATE TABLE subscriptions (
  id                         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at                 timestamptz DEFAULT now() NOT NULL,
  updated_at                 timestamptz DEFAULT now() NOT NULL,
  pod_id                     uuid        NOT NULL REFERENCES pods(id),
  merchant_id                uuid        REFERENCES merchants(id),
  display_name               text        NOT NULL,
  status                     text        NOT NULL DEFAULT 'active',
  billing_cadence            text,
  amount                     numeric,
  currency                   text,
  next_renewal_at            timestamptz,
  last_billed_at             timestamptz,
  cancel_by_at               timestamptz,
  trial_ends_at              timestamptz,
  source                     text        NOT NULL DEFAULT 'manual',
  confidence                 numeric     NOT NULL DEFAULT 1.000,
  reminder_enabled           boolean     NOT NULL DEFAULT true,
  reminder_days              integer,
  notify_channels            text[]      NOT NULL DEFAULT '{email}',
  notes                      text,
  plan_name                  text,
  provider_name              text,
  provider_domain            text,
  billed_by_name             text,
  billed_by_domain           text,
  last_observed_content_date timestamptz,
  last_source_receipt_id     uuid,
  last_source_type           text
);

-- inbound_receipts: includes subject_hash + payload_hash (dropped by reboot migration)
CREATE TABLE inbound_receipts (
  id                       uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at               timestamptz DEFAULT now() NOT NULL,
  pod_id                   uuid        REFERENCES pods(id),
  channel                  text        NOT NULL,
  dedupe_key               text        NOT NULL,
  message_id               text,
  from_domain              text,
  subject_hash             text,
  payload_hash             text,
  received_at              timestamptz DEFAULT now() NOT NULL,
  parser_status            text        NOT NULL DEFAULT 'pending',
  last_parser_run_id       uuid,
  error_code               text,
  error_detail             text,
  to_email                 text,
  to_localpart             text,
  from_email               text,
  subject                  text,
  body_text                text,
  body_html                text,
  raw_payload              jsonb,
  profile_id               uuid        REFERENCES profiles(id),
  source_type              text,
  content_type             text,
  storage_bucket           text,
  storage_path             text,
  text_extracted           text,
  text_extractor           text,
  processed_at             timestamptz,
  content_date             timestamptz,
  resolved_subscription_id uuid        REFERENCES subscriptions(id),
  write_decision           text,
  write_reason             text
);

-- Resolve subscriptions ↔ inbound_receipts circular FK
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_last_source_receipt_id_fkey
  FOREIGN KEY (last_source_receipt_id) REFERENCES inbound_receipts(id);

CREATE TABLE subscription_cycles (
  id                            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at                    timestamptz DEFAULT now() NOT NULL,
  subscription_id               uuid        NOT NULL REFERENCES subscriptions(id),
  start_at                      timestamptz NOT NULL,
  end_at                        timestamptz,
  cycle_type                    text        NOT NULL DEFAULT 'paid',
  billing_cadence               text,
  amount                        numeric,
  currency                      text,
  inferred_from_sounding_log_id uuid,
  notes                         text
);

CREATE TABLE email_connections (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now() NOT NULL,
  pod_id          uuid        NOT NULL REFERENCES pods(id),
  provider        text        NOT NULL,
  status          text        NOT NULL DEFAULT 'active',
  scopes          text[],
  last_sync_at    timestamptz,
  provider_cursor text,
  token_ref       text        NOT NULL,
  UNIQUE (pod_id, provider)
);

CREATE TABLE parser_runs (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at         timestamptz DEFAULT now() NOT NULL,
  pod_id             uuid        REFERENCES pods(id),
  profile_id         uuid        REFERENCES profiles(id),
  inbound_receipt_id uuid        REFERENCES inbound_receipts(id),
  source_type        text        NOT NULL DEFAULT 'inbound_receipt',
  source_ref         text,
  parser_name        text        NOT NULL,
  parser_version     text        NOT NULL,
  model_name         text,
  prompt_version     text,
  status             text        NOT NULL DEFAULT 'success',
  classification     text,
  confidence         numeric,
  error_code         text,
  error_detail       text,
  input_hash         text,
  input_excerpt      text,
  output_json        jsonb,
  actions            jsonb
);

-- ─────────────────────────────────────────────────────────────────
-- Additional unique constraints (named, so declared separately)
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE pods     ADD CONSTRAINT pods_owner_profile_id_key UNIQUE (owner_profile_id);
ALTER TABLE profiles ADD CONSTRAINT profiles_pod_id_key       UNIQUE (pod_id);

-- ─────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────

-- pods
CREATE UNIQUE INDEX pods_alias_email_lower_unique ON pods (lower(alias_email)) WHERE alias_email IS NOT NULL;
CREATE INDEX        pods_owner_profile_id_idx     ON pods (owner_profile_id);
CREATE INDEX        pods_status_idx               ON pods (pod_status);

-- profiles
CREATE UNIQUE INDEX profiles_auth_user_id_key  ON profiles (auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX        profiles_pod_id_idx         ON profiles (pod_id);
CREATE INDEX        profiles_email_lower_idx    ON profiles (lower(email));
CREATE INDEX        profiles_phone_e164_idx     ON profiles (phone_e164);
CREATE INDEX        profiles_lifecycle_idx      ON profiles (identity_state, entitlement_status, ingest_state);

-- keywords
CREATE UNIQUE INDEX keywords_unique ON keywords (lower(keyword), keyword_type, language);

-- merchants
CREATE UNIQUE INDEX merchants_name_unique_ci ON merchants (lower(name));

-- subscriptions
CREATE UNIQUE INDEX subscriptions_unique_pod_merchant             ON subscriptions (pod_id, merchant_id);
CREATE INDEX        subscriptions_pod_idx                         ON subscriptions (pod_id);
CREATE INDEX        subscriptions_next_renewal_idx                ON subscriptions (pod_id, next_renewal_at);
CREATE INDEX        subscriptions_last_observed_content_date_idx  ON subscriptions (last_observed_content_date);
CREATE INDEX        subscriptions_last_source_receipt_id_idx      ON subscriptions (last_source_receipt_id);
CREATE INDEX        subscriptions_last_source_type_idx            ON subscriptions (last_source_type);

-- inbound_receipts
CREATE UNIQUE INDEX inbound_receipts_pod_dedupe_key_uq          ON inbound_receipts (pod_id, dedupe_key);
CREATE UNIQUE INDEX inbound_receipts_pod_msgid_uq               ON inbound_receipts (pod_id, message_id) WHERE message_id IS NOT NULL;
CREATE INDEX        inbound_receipts_channel_created_at_idx      ON inbound_receipts (channel, created_at DESC);
CREATE INDEX        inbound_receipts_content_date_idx            ON inbound_receipts (content_date);
CREATE INDEX        inbound_receipts_parser_status_created_idx   ON inbound_receipts (parser_status, created_at DESC);
CREATE INDEX        inbound_receipts_pod_created_at_idx          ON inbound_receipts (pod_id, created_at DESC);
CREATE INDEX        inbound_receipts_profile_id_idx              ON inbound_receipts (profile_id);
CREATE INDEX        inbound_receipts_provider_message_id_idx     ON inbound_receipts (message_id);
CREATE INDEX        inbound_receipts_resolved_subscription_id_idx ON inbound_receipts (resolved_subscription_id);
CREATE INDEX        inbound_receipts_source_type_idx             ON inbound_receipts (source_type);
CREATE INDEX        inbound_receipts_storage_path_idx            ON inbound_receipts (storage_bucket, storage_path);
CREATE INDEX        inbound_receipts_to_email_created_at_idx     ON inbound_receipts (to_email, created_at DESC);
CREATE INDEX        inbound_receipts_to_localpart_created_at_idx ON inbound_receipts (to_localpart, created_at DESC);
CREATE INDEX        inbound_receipts_write_decision_idx          ON inbound_receipts (write_decision);
CREATE INDEX        inbound_receipts_write_reason_idx            ON inbound_receipts (write_reason);

-- subscription_cycles
CREATE INDEX subscription_cycles_subscription_idx ON subscription_cycles (subscription_id, start_at);

-- parser_runs
CREATE UNIQUE INDEX parser_runs_idempotency_unique        ON parser_runs (inbound_receipt_id, parser_name, input_hash)
  WHERE inbound_receipt_id IS NOT NULL AND input_hash IS NOT NULL;
CREATE INDEX        parser_runs_created_at_idx            ON parser_runs (created_at DESC);
CREATE INDEX        parser_runs_inbound_receipt_created_idx ON parser_runs (inbound_receipt_id, created_at DESC);
CREATE INDEX        parser_runs_parser_created_idx        ON parser_runs (parser_name, created_at DESC);
CREATE INDEX        parser_runs_pod_created_idx           ON parser_runs (pod_id, created_at DESC);
CREATE INDEX        parser_runs_profile_created_idx       ON parser_runs (profile_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- Triggers (pre-existing; reboot adds subscriptions + inbound_receipts variants)
-- ─────────────────────────────────────────────────────────────────

CREATE TRIGGER pods_set_updated_at
  BEFORE UPDATE ON pods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_prevent_inbound_receipts_pod_change
  BEFORE UPDATE ON inbound_receipts
  FOR EACH ROW EXECUTE FUNCTION prevent_inbound_receipts_pod_change();

-- ─────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE pods                ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords            ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_receipts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE parser_runs         ENABLE ROW LEVEL SECURITY;

-- pods (TO public = default)
CREATE POLICY pods_select_own ON pods FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid() AND p.pod_id = pods.id
  ));

CREATE POLICY pods_update_own ON pods FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid() AND p.pod_id = pods.id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid() AND p.pod_id = pods.id
  ));

-- profiles (TO public)
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- keywords
CREATE POLICY keywords_select_authed ON keywords FOR SELECT TO authenticated
  USING (true);

-- merchants
CREATE POLICY merchants_select_authed ON merchants FOR SELECT TO authenticated
  USING (true);

-- subscriptions (uses p.id = auth.uid() — old pattern where profile.id = auth user uuid)
CREATE POLICY subscriptions_select_own_pod ON subscriptions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.pod_id = subscriptions.pod_id
  ));

CREATE POLICY subscriptions_insert_own_pod ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.pod_id = subscriptions.pod_id
  ));

CREATE POLICY subscriptions_update_own_pod ON subscriptions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.pod_id = subscriptions.pod_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.pod_id = subscriptions.pod_id
  ));

CREATE POLICY subscriptions_delete_own_pod ON subscriptions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.pod_id = subscriptions.pod_id
  ));

-- inbound_receipts (uses p.id = auth.uid() — old pattern)
CREATE POLICY inbound_receipts_select_own_pod ON inbound_receipts FOR SELECT TO authenticated
  USING (pod_id IN (
    SELECT p.pod_id FROM profiles p WHERE p.id = auth.uid()
  ));

CREATE POLICY inbound_receipts_insert_own_pod ON inbound_receipts FOR INSERT TO authenticated
  WITH CHECK (pod_id IN (
    SELECT p.pod_id FROM profiles p WHERE p.id = auth.uid()
  ));

-- subscription_cycles (uses p.id = auth.uid() — old pattern)
CREATE POLICY subscription_cycles_select_own_pod ON subscription_cycles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM subscriptions s
    JOIN profiles p ON p.pod_id = s.pod_id
    WHERE p.id = auth.uid() AND s.id = subscription_cycles.subscription_id
  ));

CREATE POLICY subscription_cycles_write_own_pod ON subscription_cycles FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM subscriptions s
    JOIN profiles p ON p.pod_id = s.pod_id
    WHERE p.id = auth.uid() AND s.id = subscription_cycles.subscription_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM subscriptions s
    JOIN profiles p ON p.pod_id = s.pod_id
    WHERE p.id = auth.uid() AND s.id = subscription_cycles.subscription_id
  ));

-- email_connections (TO public; uses p.id = auth.uid())
CREATE POLICY email_connections_select_own_pod ON email_connections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.pod_id = email_connections.pod_id
  ));

CREATE POLICY email_connections_update_own_pod ON email_connections FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.pod_id = email_connections.pod_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.pod_id = email_connections.pod_id
  ));
