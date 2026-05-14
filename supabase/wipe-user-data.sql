-- Truncate user / pipeline data. Safe to re-run.
--
-- Preserves:
--   pods, profiles, auth.users  — login + alias_email survive the wipe
--   products, keywords, prompt_templates  — curated reference data
--
-- Single TRUNCATE handles the FK graph atomically.

TRUNCATE TABLE
  subscription_cycles,
  subscriptions,
  soundings_log,
  parser_runs,
  inbound_receipts,
  email_connections
RESTART IDENTITY CASCADE;
