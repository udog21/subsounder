-- Denormalize product name onto subscriptions, mirroring how provider_name is
-- already carried alongside the products FK. Lets match.ts score on product
-- text directly without a join, keeping the matcher pure and synchronous.

ALTER TABLE subscriptions ADD COLUMN product text;
