-- Rename merchants → products; each row is a product line, not a corporate entity.
-- One company (e.g. Alphabet) can have many products (YouTube, Google One, Google Home).
-- Add parent_product_id for corporate grouping and canonical cancellation policy columns.

-- 1. Rename table
ALTER TABLE merchants RENAME TO products;

-- 2. Rename indexes
ALTER INDEX merchants_pkey          RENAME TO products_pkey;
ALTER INDEX merchants_name_unique_ci RENAME TO products_name_unique_ci;

-- 3. Rename FK column on subscriptions + dependent index
ALTER TABLE subscriptions RENAME COLUMN merchant_id TO product_id;

DROP INDEX IF EXISTS subscriptions_unique_pod_merchant;
CREATE UNIQUE INDEX subscriptions_unique_pod_product ON subscriptions (pod_id, product_id);

-- 4. Rename RLS policy on products
ALTER POLICY merchants_select_authed ON products RENAME TO products_select_authed;

-- 5. Add hierarchy + canonical cancellation policy
ALTER TABLE products
  ADD COLUMN parent_product_id      uuid REFERENCES products(id),
  ADD COLUMN cancellation_url        text,
  ADD COLUMN cancellation_difficulty smallint,  -- 1 = self-serve easy, 5 = dark-pattern hard
  ADD COLUMN cancellation_steps      text;       -- prose instructions; URL alone is often insufficient

CREATE INDEX products_parent_id_idx ON products (parent_product_id);
