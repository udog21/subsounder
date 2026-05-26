-- 4-layer subscription identity (provider / product / plan / instance) + Dismiss support.
--
-- Models recurring subscriptions as four conceptual layers so that:
--   - provider: the brand/company (GoDaddy, Adobe, Google, Microsoft)
--   - product:  the service line within the provider (Domain Registration, Photoshop, Google Home, 365)
--   - plan:     the tier within the product (Photography, Premium Advanced, Business Essentials) — mutable
--   - instance: the immutable per-instance identity (busyskipper.bot, worker-name, founder@busyskipper.bot)
--
-- Identity for matching is (pod_id, product_id, instance). Plan is a mutable attribute,
-- never participates in uniqueness — plan upgrades update in place, never fork.
--
-- Fixes #55 / #60 (multi-instance coalesce) at the schema level. Bundles #4 partial
-- (Dismiss column + matcher-skip exclusion via partial unique index).

-- =========================================================================
-- soundings_log: merchant_* -> provider_*, plus product + instance columns
-- =========================================================================

ALTER TABLE soundings_log RENAME COLUMN merchant_name   TO provider_name;
ALTER TABLE soundings_log RENAME COLUMN merchant_domain TO provider_domain;
ALTER TABLE soundings_log ADD  COLUMN product  text;
ALTER TABLE soundings_log ADD  COLUMN instance text;

-- =========================================================================
-- products: (provider, product) tuples; cancellation policy hangs off each.
-- Existing rows are de facto provider-level (one row per merchant); backfill
-- provider_name = name so they remain matchable. v5 parses will populate
-- proper product names for new rows.
-- =========================================================================

ALTER TABLE products ADD COLUMN provider_name text;
UPDATE products SET provider_name = name WHERE provider_name IS NULL;

DROP INDEX IF EXISTS products_name_unique_ci;
CREATE UNIQUE INDEX products_provider_product_unique
  ON products (lower(website), lower(name));

-- =========================================================================
-- subscriptions: identity columns + Dismiss + new partial unique index
-- =========================================================================

ALTER TABLE subscriptions ADD COLUMN instance         text;
ALTER TABLE subscriptions ADD COLUMN deleted_by_user  boolean NOT NULL DEFAULT false;

DROP INDEX IF EXISTS subscriptions_unique_pod_product;

CREATE UNIQUE INDEX subscriptions_identity_unique
  ON subscriptions (pod_id, product_id, instance)
  NULLS NOT DISTINCT
  WHERE deleted_by_user IS NOT TRUE;

CREATE INDEX subscriptions_deleted_by_user_idx
  ON subscriptions (pod_id, deleted_by_user);
