# SubSounder — Claude Code Context

## What this is
AI-powered subscription intelligence layer. Users forward subscription emails to a unique alias; the system parses them, builds a subscription catalog, and sends renewal reminders before surprise charges hit.

## How to work here (non-negotiable)

1. **No silent assumptions.** Do not invent or extend product requirements. If
   instructions are ambiguous, incomplete, or conflict with docs/code, stop and
   ask with a short list of concrete questions. Applies to UX copy, data model,
   provider choice, security behavior, and unrequested "obvious" conveniences.
2. **Planning docs are canonical.** Work from `docs/active/ROADMAP.md` and
   `docs/active/open-questions.md`; GitHub issues are the tactical queue. If
   behavior changes, update the matching doc in the same change.
3. **Don't auto-advance.** One chunk of work per chat. Do not move to the next
   step without an explicit prompt. Before a choice-sensitive step, surface
   options, recommend one, and wait for a decision (or "use your recommendation").
4. **Mark progress.** When a step completes, update the relevant planning doc /
   GitHub issue immediately with status + brief notes.
5. **Plain language.** Short sentences, numbered steps, concrete examples. Explain
   jargon once. Include "why this matters" for non-obvious tasks. The human has an
   engineering background but is not a full-time coder.
6. **Scope discipline.** Keep changes scoped to the current step. No broad
   refactors or architecture tangents bundled into unrelated work.

### Working style

How the human collaborates — internalize these so they aren't re-taught by
correction.

- **Discuss design in prose, not menus.** For open architecture/design questions,
  give analysis, a concrete recommendation, and the genuine ambiguity — then ask
  pointed questions and let the human redirect. The right answer is usually a
  refinement of your proposal, not one of a fixed menu. Reserve multiple-choice
  prompts for bounded forks (which label, where a fix lands, verify-now-or-not).
- **State the plan before a big tool run.** One line — what you'll do and why —
  before any exploration sweep or large batch of queries, then act. The human
  paces the work and will interrupt; don't barrel silently into many tool calls.
- **Verify before asserting.** Don't build root-cause narratives on inference.
  Read the live source — active prompt rows in `prompt_templates`, current code,
  Cloudflare Worker logs — and confirm a claim before stating it as fact.
  Confident guesses that turn out wrong cost trust.
- **Locked decisions stay locked.** Once a decision is recorded as settled (an
  ADR, a `docs/archive/` provenance trail, a "do not reverse" note), treat it as
  durable. Reopen it explicitly with new evidence; don't silently relitigate.
- **Surface what changed inline; don't make the human open files to verify edits.**
  For small doc or code edits, paste the new or changed text directly in the chat
  response. For larger rewrites, paste the key changed sections in chat; reserve
  plain file links for content too long to inline. Repo docs are a consult-later
  resource for the human — the primary content channel during a session is the
  chat itself.
- **Long-form drafts go to files, not chat.** A whole new document, a
  section-level rewrite, or any artifact that reads as "complete in itself"
  belongs in the working branch as a file the human can open in their IDE,
  not pasted inline. Chat lines don't wrap and the horizontal scrollbar
  typically sits below the visible viewport, so long inline drafts are hard
  to read and easy to misjudge in scope. Short snippets (a paragraph, a few
  bullets, a copy edit) stay inline — the previous bullet still applies.
- **Plan in time-boxed, ROI-legible chunks.** SubSounder is one of several
  solo-founder projects; the founder's hours are the scarce resource, not
  money. Give every milestone and step a rough time cost and a one-line "what
  finishing this unlocks," so cross-project allocation is an informed call.
  Keep the near-term (next 1–2 milestones) granular to session/day size; keep
  later stages lighter. Flag slow-bleed risk (chronic under-resourcing) so a
  clean pause can be chosen over a slow one. Working norms that transfer
  across projects belong here in CLAUDE.md, not in agent memory.
- **Honest estimates: scope to active effort, call out exclusions inline.**
  Time estimates anchor on human-engineer intuition that silently pads for
  context-switching, mid-coding design pivots, and test-loop overhead. In a
  focused agent session where design is locked in conversation before coding
  starts, observed durations land roughly 0.4× human-eyeball estimates; ~0.7×
  for mixed design/implementation. Take face value (no compression) for
  browser/UI debugging, scheduler/cron diagnosis, or unfamiliar-codebase
  navigation — those carry real wall-clock overhead that doesn't compress
  away. Before quoting a number, name which class the task is in and state
  the exclusions inline ("~2h once the design is locked; longer if we keep
  iterating on the schema shape"), not implicitly.

### Asks of the solo founder/dev

The flipside of [Working style](#working-style) — what the agent relies on the
human to surface, so it doesn't operate on stale state.

- **Branch context.** Mention the current branch at the start of every new
  chat, and whenever it changes between turns (e.g. after a PR merge or local
  switch). The `git status` rule covers the agent on its side, but a one-line
  human heads-up shortcuts an avoidable verify step.

### Step-completion checklist

- [ ] Acceptance criteria for the step are met.
- [ ] Code, docs (`docs/active/*`), and the relevant issue are consistent.
- [ ] Tests/checks pass (or the gap is documented).
- [ ] Open risks/follow-ups recorded.

## Branch & PR workflow (non-negotiable)

One chunk of work = one short-lived branch = one PR. This maps to one chat.

The loop:

1. Start of chat: `git switch main && git pull && git switch -c <type>/<scope>`.
   Branch types: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`.
2. Do the one chunk. Small, focused commits. Keep docs in sync.
3. End of chat: push → `gh pr create` (clear title + body) → review →
   squash-merge → delete the branch.
4. Next chat restarts from a fresh, synced `main`.

Rules:

- One purpose per PR. Split unrelated changes into separate PRs.
- But don't over-fragment. When sub-parts are tightly coupled and individually
  non-shippable, bundle them into one PR with internally sequenced commits.
  One purpose per PR, not one file.
- `main` is always releasable. Never merge half-built work.
- Branches live hours/days, not weeks.
- Never skip hooks or push to `main` directly.
- Always run `git status` immediately before every commit/push. The active
  branch can change between conversation turns (e.g. a PR merge plus a local
  switch). Never rely on session-cached branch assumptions — verify, then act.

## Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Platform | Cloudflare Workers via `@opennextjs/cloudflare` |
| Database | Supabase (Postgres + Auth) |
| LLM | OpenAI `gpt-4o-mini` with structured outputs (`json_schema`, `strict: true`) |
| Email | Mailgun (inbound: `inbound.subsounder.com`; outbound: `mailgun.js`) |

## Key Architectural Decisions
- **Two-layer logging:** `parser_runs` (control plane, one per attempt) → `soundings_log` (data plane, one row per extracted signal)
- **Async parsing:** `after()` in inbound handler (immediate) + 5-minute cron sweep (reliable retry via `parser_status = 'pending'`)
- **Dedup:** `INSERT ... ON CONFLICT (pod_id, dedupe_key) DO NOTHING` — never a pre-check query
- **LLM output is always `signals[]` array** — supports 1:N extractions from day one
- **Service role key** for all server-side DB writes (bypasses RLS); anon key only for client auth
- **4-layer subscription identity:** every signal carries `provider` / `product` / `plan` / `instance`. The matcher's identity key is `(pod_id, product_id, instance)`; `plan` is a mutable attribute (plan upgrades update in place, never fork). See [glossary.md](docs/active/glossary.md#identity-layers) for the vocabulary.

## Project Structure
```
app/
  api/
    mailgun/inbound/   Mailgun webhook receiver
    parse/             Mail parser orchestrator (POST { receipt_id, pod_id })
    cron/
      parse-sweep/     Retry pending receipts every 5min
      renewal-reminders/  Daily 9am reminder dispatch
  components/
    CopyButton.tsx     Client component: alias email clipboard button
  page.tsx             Subscription catalog UI (server component)
lib/
  parser/
    normalize.ts       HTML→text, forwarded block extraction, 12k truncation
    extract.ts         GPT-4 mini structured extraction
    validate.ts        Output validation + parser_run_status suggestion
    match.ts           Score-based subscription matching + write decision
  parse-trigger.ts     Shared helper: call /api/parse (used by inbound + cron)
  email/index.ts       Mailgun client + email templates (new/renewal notifications)
src/
  worker.ts            CF Worker entry: wraps OpenNext fetch + scheduled cron handler
supabase/
  migrations/          All schema DDL (run in order; db reset rebuilds from here)
  seed.sql             Top ~50 products: cancellation URL, difficulty, pricing data (Phase 7)
```

## Database Schema (key tables)
- `pods` — subscription group, one per user; holds `alias_email`
- `profiles` — user profile; `auth_user_id` links to `auth.users`
- `products` — one row per `(provider, product)` tuple (e.g. `(Google, Google Home)`, `(Adobe, Photoshop)`, `(GoDaddy, Domain Registration)`). `provider_name`, `name` (product), `website`, `aliases[]`, `cancellation_url`, `cancellation_difficulty` (1–5), `cancellation_steps`, `parent_product_id` (corporate grouping), `pricing jsonb` (`[{period, price, currency}]`), `enrichment_status` (`pending | enriched | fetch_failed`). Uniqueness on `(lower(website), lower(name))` — N products per provider allowed (Photoshop vs Lightroom).
- `inbound_receipts` — raw email signals; `parser_status` = `pending | parsed | ignored | error`
- `parser_runs` — control plane, one row per parse attempt; links to `inbound_receipts`
- `soundings_log` — data plane, one row per extracted signal; `parser_run_id` FK; identity columns `provider_name`, `provider_domain`, `product`, `instance`; `resolved_subscription_id` set after matching
- `subscriptions` — identity + current state roll-up; no financial columns; `current_cycle_id` FK points to the most recent `subscription_cycles` row; `product_id`, `product` (denorm), `instance`, `cancellation_url`, `cancellation_difficulty` denormalized from `products`; `deleted_by_user` boolean for Dismiss. Identity uniqueness is `(pod_id, product_id, instance) WHERE deleted_by_user IS NOT TRUE` — dismissed rows do not block fresh matches at the same identity.
- `subscription_cycles` — one row per billing event (including trials with `amount=0`); holds `amount`, `currency`, `billing_cadence`, `period_start`, `period_end`, `next_renewal_at`, `cancel_by_at`, `signal_type`, `source_sounding_id`
- `prompt_templates` — versioned LLM system prompts; one row per `(agent_name, version)`; exactly one row per `agent_name` is `is_active = true` (enforced by `prompt_templates_one_active` partial unique index)

## Prompt management
- **Source of truth:** the active LLM prompt lives in the `prompt_templates` table, not in code. The `is_active = true` row for a given `agent_name` is authoritative. `seed.sql` is only the initial dev-DB bootstrap and lags reality once any prompt-versioning migration lands.
- **To inspect the live prompt:** query via Supabase MCP (`SELECT system_prompt FROM prompt_templates WHERE agent_name = '<x>' AND is_active = true`). Do not read `seed.sql` and assume it matches production.
- **To change a prompt:** never UPDATE `system_prompt` in place. Write a migration that flips the current row to `is_active = false` and INSERTs a new row with `version` bumped and `is_active = true`. This preserves the historical record so `parser_runs.prompt_version` references remain valid and longitudinal A/B comparisons stay queryable.

## Local Development
```bash
supabase start          # Boot local Postgres + Auth (requires Docker Desktop)
supabase db reset       # Wipe + rebuild from migrations + seed.sql
npm run dev             # next dev at localhost:3000 — daily work
npm run preview         # wrangler dev — CF Workers simulator, run before deploy
npm run deploy          # Build + deploy to Cloudflare
```

### Database migrations

- Migrations live in `supabase/migrations/` as `YYYYMMDDHHMMSS_name.sql`
  (Supabase CLI standard), applied in lexicographic order. `supabase db reset`
  rebuilds the local DB from the full set + `seed.sql`.
- A migration is **immutable** once committed/applied. Never rename or edit an
  applied migration — it desyncs the ledger and makes `db reset` diverge from
  the remote. Schema changes are always new, additive migration files. (The
  filename normalization done in the `docs/adopt-process-scaffolding` PR was a
  one-time, deliberate alignment to the recorded ledger versions; the rule
  applies cleanly going forward.)
- The repo is the schema source of truth — commit a migration even if it was
  applied by hand first.
- `db reset` must always rebuild cleanly from migrations + seed. If it doesn't,
  fix the migration set rather than papering over it.
- Never hand-run migration SQL in the Supabase SQL editor — it desyncs the
  ledger. (Prompt-version bumps follow the [Prompt management](#prompt-management)
  rule: always a new migration row, never an in-place UPDATE.)

#### Supabase CLI workflow

Authoring and shipping a new migration:

```bash
npx supabase migration new <name>    # creates supabase/migrations/<timestamp>_<name>.sql
# edit the file
npx supabase db reset                # rebuild local from migrations + seed; verifies the migration is clean
npx supabase db push                 # apply to remote; records in supabase_migrations.schema_migrations
git add supabase/migrations/<file> && git commit
```

`supabase db push` reads the local `supabase/migrations/` folder, compares
versions against the remote `supabase_migrations.schema_migrations` ledger, and
applies anything missing in order. If a local file's version isn't in the remote
ledger but the change has already been applied (e.g. you used MCP `apply_migration`
or ran SQL by hand — don't), the push will explode trying to re-apply. Fix by
ensuring filename versions match what the ledger recorded, not the other way
around.

For one-off DDL during exploration, the Supabase MCP `apply_migration` tool also
records to the ledger — but always commit the matching file to `supabase/migrations/`
in the same PR so the repo stays the source of truth.

## Testing Division of Labor
- **Backend (I test):** curl/HTTP calls to local API routes, DB row verification
- **UI (you verify):** browser at `localhost:3000`
- **End-to-end (you test):** real email forwarded to alias on Cloudflare preview deployment

## Environment Variables
All go in `.dev.vars` locally and Cloudflare dashboard secrets for production.
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MAILGUN_SIGNING_KEY
MAILGUN_API_KEY
OPENAI_API_KEY
PARSE_SECRET
CRON_SECRET
ADMIN_EMAIL
```

## Conventions
- No comments unless the WHY is non-obvious (invariant, workaround, hidden constraint)
- TypeScript throughout; `strict: true`
- No `export const runtime = 'edge'` — must use Node.js runtime for CF Workers compat
- Server components fetch data directly via Supabase server client; no useEffect data fetching
- Catalog UI (`app/page.tsx`) uses a CSS Module (`app/page.module.css`) — Figma CSS exports can be pasted directly into the module; computed colors (difficulty dots, trial countdown urgency) stay inline since they're runtime values
- Errors surface as typed responses, not thrown exceptions in API routes

## Voice & user-facing copy

For any user-facing string — landing page, privacy policy, ToS, email templates,
in-app microcopy, button labels, error messages — strip the markers that read as
LLM-generated copy. The user notices; the Tier 1 wedge audience (modern-stack
operators, vibe coders, AI-heavy freelancers) notices. Sounding generated erodes
trust on first impression.

Rules (apply to user-facing strings only; this section is about end-user copy,
not chat communication or internal docs):

- **No unearned em dashes.** LLMs over-use them as a default rhetorical move.
  Default to periods, semicolons, parentheses, or nothing. Use the dash only
  when it's genuinely earning its keep. Cross-codebase scrub + drift-prevention
  tracked separately as an issue.
- **No named brands in voice copy.** Don't drop specific provider names
  ("Anthropic, OpenAI, Vercel, Cursor, Supabase, Notion") into landing-page or
  marketing prose, even when they're accurate. Use category descriptions
  instead ("long-tail SaaS, prosumer tools, API credits"). Brand names are
  fine in integration docs, case studies, or when surfacing a specific
  subscription in the catalog UI.
- **Prefer plain over flourished.** Shorter sentences over rhetorical
  ornamentation; concrete claims over vague benefit-speak. "Marketing fluff"
  will get called out.
- **The audience can handle technical specificity.** The Tier 1 wedge is more
  comfortable with technical concreteness than a generic-consumer audience
  would be. Lean into that, don't soften it.

Do an explicit final pass on any user-facing string before reporting the work
as done.

## IDE
VS Code with the Claude Code extension. MCP logs are in the Output panel → "Claude Code" or "Claude Code MCP" dropdown after reloading the window (`Ctrl+Shift+P` → "Developer: Reload Window").

## Planning docs

See [docs/README.md](docs/README.md) for the full index. Quick map:

- `docs/active/ROADMAP.md` — current stage-gate roadmap (MVP → M0 → M1 → M2 phases with Goal/Scope/Gate). Strategic priorities. Read first when asked "what should I work on next."
- `docs/active/open-questions.md` — pending product decisions the codebase depends on. Read when an implementation choice hinges on a product call that hasn't been made.
- `docs/active/glossary.md` — the SubSounder vocabulary (pod, sounding, signal, cycle, etc.). Read first if a term in code or chat is unfamiliar.
- `docs/archive/mvp-plan.md` — historical MVP implementation plan (Phases 0-7). Frozen; do not edit.
- GitHub issues — tactical work units (bugs, features, follow-ups). Each milestone item in `active/ROADMAP.md` typically spawns 1+ issues, labeled to the corresponding GH milestone.

## Tracks and milestones

Two-dimensional planning model: every GitHub issue gets exactly **one track label** (ongoing thematic backlog) and is either scheduled into a **milestone** (delivery slice with a due date) or left unscheduled.

- **Tracks** are persistent swim lanes. They don't have dates; they're how work is themed and how an agent decides "what kind of work is this." Each issue picks one.
- **Milestones** are *dated events* — transitions, not buckets of work. The work lives in **phases** between milestones (see [§ Milestones, phases, and gates](#milestones-phases-and-gates)). Today's milestones: MVP (done), M0 (dogfood begins), M1 (alpha invites), M2 (Public Beta launch). An issue is assigned to the GH milestone for the phase ending at that event; some sit unscheduled.

Tracks and milestones are orthogonal. A `feature` issue might be assigned to M1; a `reliability` issue might be assigned to M1 too; both might also sit unscheduled until prioritized. Tracks survive milestones (we'll still be doing `llm` work after M2); milestones change.

### Milestones, phases, and gates

SubSounder plans with a **stage-gate** model — see [docs/active/ROADMAP.md](docs/active/ROADMAP.md) for the live plan.

- A **milestone** is a *dated event* — a transition, zero duration. Name it as an event ("Dogfood begins", "Alpha invites go out"), not a phase-noun.
- A **phase** is the *period of work between* two milestones. Work lives here.
- Each phase carries three fields: **Goal** (one line — why), **Scope** (the work, each item a GH issue — *output* we control), and **Gate** (the checkable condition to reach the next milestone — *outcome* we verify).
- Discipline: scope complete is necessary but not sufficient — the **Gate** is the real bar. Prefer outcome-phrased gates; early phases lean on output checks only because no population exists to measure yet.

A GH milestone groups the Scope issues of the phase that ends at that milestone-event; its due date is the event's target date.

### Tracks (current)

These are the active swim lanes. Apply exactly one to each issue. New tracks should be rare — propose in a planning chat, don't fork off silently.

**`feature`** — user-facing capability
: catalog editing affordances (Dismiss · Mark as cancelled · Edit) · manual "Add subscription" entry · onboarding empty state · renewal-reminder email content + cadence · new-subscription notification email · cancellation URL + difficulty surfacing on cards · trial countdown urgency · annual-spend rollup · default catalog sort · future ingestion channels (Gmail OAuth bulk-scan · CSV import · browser-extension forwarder) · multi-currency · family/pod sharing.

**`trust`** — trust boundary, privacy, auth, RLS
: RLS policy audit (every table scoped to `pod_id`) · service-role key handling (server-only, never client-bundled) · `auth_user_id` linkage discipline on `profiles` · alias-email enumeration resistance · `PARSE_SECRET` / `CRON_SECRET` rotation policy · `inbound_receipts.raw_email_html` retention posture · future Gmail OAuth privacy policy + CASA Tier 2 prep.

**`llm`** — LLM extraction quality, prompt scope, eval
: prompt iteration in `prompt_templates` (trial `cancel_by_at` · trial cadence default · cadence-vs-date-math reconciliation · monthly `next_renewal_at` inference) · `prompt_templates` versioning discipline (see [Prompt management](#prompt-management)) · classification-edge tightening (`maybe_subscription` vs `not_subscription`) · matcher accuracy under aliased merchant names (`products.aliases[]`) · per-signal `evidence` quality · LLM eval harness with sanitized real-receipt fixtures.

**`reliability`** — resilience, self-healing, atomicity, edge cases (continuous; protects core correctness)
: out-of-order receipt handling (`event_date`-wins in `lib/parser/run.ts`) · dedupe across renewal-notice + charge-receipt for one cycle · trial → paid conversion matching · plan-change / `price_change` handling · in-process invocation discipline (per [ADR-0001](docs/adr/0001-in-process-cron-and-parse.md)) · cron health + pending-receipt backlog drainage · `subscriptions.current_cycle_id` integrity (no orphans, no stale pointer) · Mailgun webhook signature + idempotency · stale-vs-cancelled status logic · product-enrichment cron scrape reliability.

**`techdebt`** — infra and maintainability (continuous; never milestone-gating)
: CLAUDE.md drift cleanup (e.g. stale entries in "Project Structure") · `lib/parse-trigger.ts` post-ADR-0001 re-evaluation · doc↔code drift listed in [docs/README.md](docs/README.md) "Known gaps" · CI setup · type-check enforcement · `supabase/queries/` proliferation cleanup · dev-loop ergonomics (`npm run dev` vs `npm run preview` parity).

**`marketing`** — marketing, SEO, growth-instrumentation, public content
: Subscription Registry public site (`subscriptionregistry.org`) and per-merchant cancellation-intel pages · paid acquisition (Reddit + Google Ads) · landing-page conversion hooks · analytics + activation-funnel instrumentation · SEO/sitemap + Search Console setup · brand and messaging. Named `marketing` for breadth — explicitly covers growth-instrumentation work (analytics, conversion tracking) too, not just outward-facing campaigns.

### Where things land when they don't fit neatly

- **Cancellation-intel work** (the data moat) splits across tracks: user-visible surfacing is `feature`; the enrichment cron + scraping pipeline is `reliability`; user-confirmation flywheels are `feature`.
- **Matcher correctness** (out-of-order, dedupe, trial→paid) is `reliability` — these are bugs in what we did with the model's output, not in the extraction quality (`llm` = "what the model saw and produced").
- **Pure refactors and chores** are `techdebt` unless they're targeted at a specific functional area, in which case the functional track wins.
