-- Prompt template versioning + parser_runs human-in-the-loop flags

-- 1. prompt_templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL,
  agent_name       text NOT NULL,
  version          integer NOT NULL CHECK (version > 0),
  system_prompt    text NOT NULL,
  model_hint       text,
  variables_schema jsonb,
  notes            text,
  is_active        boolean NOT NULL DEFAULT false,
  UNIQUE (agent_name, version)
);

-- One active prompt per agent at a time
CREATE UNIQUE INDEX IF NOT EXISTS prompt_templates_one_active
  ON prompt_templates (agent_name) WHERE is_active = true;

-- Efficient lookup of latest version per agent
CREATE INDEX IF NOT EXISTS prompt_templates_agent_version_desc
  ON prompt_templates (agent_name, version DESC);

DROP TRIGGER IF EXISTS prompt_templates_set_updated_at ON prompt_templates;
CREATE TRIGGER prompt_templates_set_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Human-in-the-loop columns on parser_runs
ALTER TABLE parser_runs
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at  timestamptz;

CREATE INDEX IF NOT EXISTS parser_runs_needs_review_idx
  ON parser_runs (needs_review, created_at DESC)
  WHERE needs_review = true;
