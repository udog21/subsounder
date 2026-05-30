-- providers table: pull subscription intel up to provider granularity.
--
-- Most fields previously on products (cancellation_url, cancellation_difficulty,
-- cancellation_steps, aliases, website, plus future safe_to_filter_by_name and
-- billing_domains[]) are operationally provider-level: cancelling Photoshop and
-- Lightroom hits the same Adobe flow; the "Apple" name-collision risk for
-- Gmail filtering is the same whether the row is Apple Music or Apple TV+.
--
-- Provider identity is domain-driven (operational brand surface), not corporate.
-- microsoft365.com and xbox.com become distinct providers even though both are
-- Microsoft — separate billing systems, separate cancellation flows, separate
-- brand vocabularies in email bodies.
--
-- Also drops two vestigial columns from products: parent_product_id (was the
-- workaround for the missing providers table) and is_global (scaffolded as
-- pod-scoped-custom affordance but never wired up; no pod_id exists to back it).
--
-- Migration is SCHEMA-ONLY: backfills providers from the existing products
-- catalog, links every product to its provider, drops the moved columns. No
-- data wipe — the contaminated dogfood rows ride along until cleaned out via
-- supabase/manual/reset_account.sql (cleans pods/subs/receipts) followed by
-- supabase/manual/seed_providers.sql (replaces the backfilled providers with
-- the curated 69-row modern-stack list).
--
-- Wipe-as-part-of-the-migration was the original plan but ran into the
-- subscriptions_identity_unique partial unique with NULLS NOT DISTINCT —
-- DELETE FROM products cascades ON DELETE SET NULL into subscriptions.product_id,
-- and any two subs in the same pod with null instance collide on the unique.

-- =========================================================================
-- 1. Drop products self-FK + vestigial columns
-- =========================================================================

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_parent_product_id_fkey;
DROP INDEX IF EXISTS products_parent_id_idx;

ALTER TABLE products
  DROP COLUMN IF EXISTS parent_product_id,
  DROP COLUMN IF EXISTS is_global;

-- =========================================================================
-- 2. Create providers
-- =========================================================================

CREATE TABLE providers (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  name                     text NOT NULL,
  website                  text,
  aliases                  text[] NOT NULL DEFAULT '{}',
  cancellation_url         text,
  cancellation_difficulty  smallint,
  cancellation_steps       text,
  safe_to_filter_by_name   boolean NOT NULL DEFAULT true,
  enrichment_status        text NOT NULL DEFAULT 'pending',
  enriched_at              timestamptz
);

CREATE UNIQUE INDEX providers_name_unique_ci ON providers (lower(name));

DROP TRIGGER IF EXISTS providers_set_updated_at ON providers;
CREATE TRIGGER providers_set_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY providers_select_authed ON providers
  FOR SELECT
  USING (true);

COMMENT ON TABLE providers IS
  'Canonical provider catalog (operational brand identity, domain-driven). Cancellation intel, aliases, and Gmail-filter curation flag live here.';

-- =========================================================================
-- 3. Backfill providers from products. One provider row per distinct
--    provider_name; website + aliases + cancellation_* lifted from an
--    arbitrary product row in the group (ordered by id for determinism).
-- =========================================================================

INSERT INTO providers (name, website, aliases, cancellation_url, cancellation_difficulty, cancellation_steps)
SELECT DISTINCT ON (lower(provider_name))
  provider_name,
  website,
  COALESCE(aliases, '{}'::text[]),
  cancellation_url,
  cancellation_difficulty,
  cancellation_steps
FROM products
WHERE provider_name IS NOT NULL AND TRIM(provider_name) <> ''
ORDER BY lower(provider_name), id;

-- =========================================================================
-- 4. Add provider_id to products, link, then drop the moved columns
-- =========================================================================

ALTER TABLE products ADD COLUMN provider_id uuid REFERENCES providers(id) ON DELETE CASCADE;

UPDATE products p
   SET provider_id = pr.id
  FROM providers pr
 WHERE lower(p.provider_name) = lower(pr.name);

-- If any row failed to link (provider_name was NULL/blank), null its product
-- name back into the providers table now so the NOT NULL constraint passes.
-- Defensive — current live data has provider_name on all 37 rows.
INSERT INTO providers (name)
SELECT DISTINCT name
  FROM products
 WHERE provider_id IS NULL
ON CONFLICT (lower(name)) DO NOTHING;

UPDATE products p
   SET provider_id = pr.id
  FROM providers pr
 WHERE p.provider_id IS NULL
   AND lower(p.name) = lower(pr.name);

ALTER TABLE products ALTER COLUMN provider_id SET NOT NULL;

DROP INDEX IF EXISTS products_provider_product_unique;

ALTER TABLE products
  DROP COLUMN cancellation_url,
  DROP COLUMN cancellation_difficulty,
  DROP COLUMN cancellation_steps,
  DROP COLUMN provider_name,
  DROP COLUMN website,
  DROP COLUMN aliases;

CREATE INDEX products_provider_id_idx ON products (provider_id);

CREATE UNIQUE INDEX products_provider_name_unique_ci
  ON products (provider_id, lower(name));

COMMENT ON TABLE products IS
  'Per-line-item rows under a provider (Adobe → Photoshop, Adobe → Lightroom). Carries product-specific fields (pricing); shared provider intel lives on providers.';
