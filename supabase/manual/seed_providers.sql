-- Seed the providers catalog with the curated modern-stack tools list (~69
-- providers, Tier 1 AI-native solo-operator wedge ICP — see
-- docs/active/market-and-positioning.md).
--
-- Idempotent via ON CONFLICT — safe to re-run alongside backfilled providers
-- from the 20260530180000_providers_table.sql migration. Names that overlap
-- with backfilled rows (e.g. an existing "Vercel" backfilled from products)
-- are skipped, not overwritten. To get a clean catalog after wiping the
-- founder dogfood pods, run in order:
--
--   1. supabase/manual/reset_account.sql (once per dogfood profile)
--   2. DELETE FROM providers;  -- cascades products via ON DELETE CASCADE
--   3. this file
--
-- Lives in supabase/manual/ — one-off DML, doesn't touch the migration
-- ledger. Re-run after each major seed-list revision.
--
-- aliases / website / cancellation_* / safe_to_filter_by_name land later via
-- #90 enrichment work.

INSERT INTO providers (name) VALUES
  -- LLMs & AI Coding
  ('OpenAI'),
  ('Anthropic'),
  ('Google Gemini'),
  ('Perplexity'),
  ('Cursor'),
  ('GitHub'),
  ('Replit'),
  ('Lovable'),
  ('Bolt.new'),
  ('Codeium'),
  ('v0'),
  ('Phind'),
  -- Hosting / Cloud / Infra
  ('Vercel'),
  ('Netlify'),
  ('Cloudflare'),
  ('Railway'),
  ('Render'),
  ('Fly.io'),
  ('Amazon Web Services'),
  ('Google Cloud'),
  ('Microsoft Azure'),
  ('DigitalOcean'),
  ('Hetzner'),
  -- Databases / Backend / Automation
  ('Supabase'),
  ('Firebase'),
  ('PlanetScale'),
  ('MongoDB Atlas'),
  ('Neon'),
  ('n8n'),
  ('Zapier'),
  ('Make'),
  ('Retool'),
  -- Design / Creative / Creator Stack
  ('Figma'),
  ('Canva'),
  ('Adobe'),
  ('Framer'),
  ('Webflow'),
  ('Descript'),
  ('Riverside'),
  ('Runway'),
  ('Midjourney'),
  ('ElevenLabs'),
  -- Productivity / Knowledge / Collaboration
  ('Notion'),
  ('Linear'),
  ('Slack'),
  ('Discord'),
  ('Airtable'),
  ('ClickUp'),
  ('Todoist'),
  ('Google Workspace'),
  ('Microsoft 365'),
  -- Domains / Email / Distribution
  ('Namecheap'),
  ('Squarespace'),
  ('Resend'),
  ('Mailgun'),
  ('ConvertKit'),
  ('Beehiiv'),
  ('Substack'),
  -- Payments / Commerce / Monetization
  ('Stripe'),
  ('Paddle'),
  ('Lemon Squeezy'),
  ('Shopify'),
  ('Gumroad'),
  ('Patreon'),
  -- Analytics / Monitoring / Growth
  ('Plausible'),
  ('PostHog'),
  ('Mixpanel'),
  ('Sentry'),
  ('Hotjar')
ON CONFLICT (lower(name)) DO NOTHING;
