-- Phase 7: Product enrichment + subscriptions/cycles schema refactor.
-- subscriptions becomes identity+status only; all financial/temporal data lives on subscription_cycles.

-- 1. Add enrichment columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pricing           jsonb,
  ADD COLUMN IF NOT EXISTS enrichment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enriched_at       timestamptz;

-- 2. Enrich subscription_cycles with signal provenance and temporal completeness
ALTER TABLE subscription_cycles
  ADD COLUMN IF NOT EXISTS signal_type        text,
  ADD COLUMN IF NOT EXISTS next_renewal_at    timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_by_at       timestamptz,
  ADD COLUMN IF NOT EXISTS source_sounding_id uuid REFERENCES soundings_log(id);

-- 3. Rename start_at/end_at for clarity
ALTER TABLE subscription_cycles
  RENAME COLUMN start_at TO period_start;
ALTER TABLE subscription_cycles
  RENAME COLUMN end_at   TO period_end;

-- 4. Add current_cycle_id to subscriptions (nullable — set after first cycle is written)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS current_cycle_id uuid REFERENCES subscription_cycles(id);

-- 5. Drop financial/temporal columns from subscriptions — they now live on subscription_cycles.
ALTER TABLE subscriptions
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS billing_cadence,
  DROP COLUMN IF EXISTS next_renewal_at,
  DROP COLUMN IF EXISTS trial_ends_at,
  DROP COLUMN IF EXISTS cancel_by_at,
  DROP COLUMN IF EXISTS last_billed_at;
