# ADR-0002: Subsounder Society — public cancellation-intel resource boundary

- **Status:** Accepted
- **Date:** 2026-05-21
- **Deciders:** Lek
- **Related:** [docs/competitive-analysis.md](../competitive-analysis.md), [docs/active/ROADMAP.md](../active/ROADMAP.md)

> **Naming (added 2026-05-21):** The public resource originally called "Subsounder Society" in this ADR is now **Subscription Registry** at `subscriptionregistry.org`. The two operate as independent brands — a neutrally-branded public reference (which signals trust better than a Subsounder sub-brand would) plus the paid app — that can each survive on their own brand and may be linked by cross-promo later. All architectural decisions in this ADR remain in force; later docs use the new name. The filename and in-body references stay as-is for historical accuracy.

## Context

SubSounder's `products` table holds merchant-side intel: `cancellation_url`, `cancellation_difficulty`, `cancellation_steps`, `pricing`, `aliases`, `parent_product_id`, `enrichment_status`. Per [competitive-analysis.md](../competitive-analysis.md), this dataset is the product's defensible moat, grown along three planned layers:

1. **Layer 1 — manual seed.** Top providers researched by hand into `seed.sql`.
2. **Layer 2 — AI scrape.** Background job hits each new merchant's support page and extracts cancellation fields via the LLM.
3. **Layer 3 — user signals.** Users who successfully cancel confirm or correct entries. Today this is an internal feedback loop only.

Separately, the product needs a top-of-funnel SEO asset for V1's acquisition push. The two needs collapse into one idea: expose merchant intelligence publicly as **Subsounder Society** — a free, browsable resource for cancellation policies of digital subscriptions that also acts as a discovery funnel for the paid app.

Without a settled boundary, the dataset and its editorial process drift into the app's surface area: privacy posture gets blurred, the schema can't evolve independently, the two projects can't survive without each other, and contribution workflows have no defined home. This ADR settles five boundary questions — **survivability, content scope, editorial model, publishing/data model, and sequencing** — plus the **GH process** for managing parallel app + Society work until they fully separate.

## Decision

### Survivability principle (governs the other decisions)

Either the app or Society must be able to survive without the other. Concretely:
- If the paid app shuts down or stalls, Society remains a useful public asset on its own infrastructure with its own data.
- If Society fails to gain traction, or community-PR review cost proves unmitigable (even with AI-agent assistance), it can be wound down without affecting the app.
- The two projects share *content flow* (app→Society snapshots; optional Society→app writeback), but never share *infrastructure* that creates a single point of failure for both.

This principle is the reason for the choices below.

### Scope of content (what publishes)

Society publishes a curated subset of merchant intel. At launch the subset is small, and Society's schema is independent of `products` going forward.

- **Published at launch:** `name`, `aliases`, `website`, `cancellation_url`, `cancellation_difficulty`, `cancellation_steps`, `parent_product_id`. These come from the `products` snapshot.
- **Explicitly not published initially:** `pricing`. Changes too frequently to make Society a reliable public reference; stale prices erode trust faster than the SEO content earns it.
- **Society can grow fields the app doesn't have.** Refund windows, dark-pattern flags, hidden-fee notes, customer-service contacts — if those make sense for Society but not for the app's matcher, they live only in Society's data store (see Publishing model). The app's `products` table is *not* forced to grow Society-only columns.
- **The app can grow fields Society doesn't publish.** Internal enrichment metadata, parser hints, etc., stay in `products` and never reach the snapshot.

The overlap is defined by an explicit per-column **export config** in the snapshot job. New fields are additive on either side without coupling.

### Editorial voice (who edits)

Curated baseline + community PRs + anonymous experience signal.

- **Layer 1 + Layer 2** (Subsounder seed + AI scrape) flow into `products` and reach Society via the nightly snapshot. This is Subsounder's authoritative baseline.
- **Layer 3 (community PRs).** Visitors who want to correct or extend a Society entry open a PR against the public `subsounder-society` repo. **PRs land in Society's data store, not in `products`.** A separate, optional sync can later push selected fields back into `products` if the app would benefit.
- **Layer 3.5 (experience signal).** Each Society page exposes a "this matches my experience" thumbs-up (and thumbs-down with optional freeform "what did you find different?" text). Anonymous, frictionless, no auth — lets visitors confirm/dispute entries without the friction of a PR. Aggregated count surfaces on the page (e.g. "342 visitors confirmed this · 12 reported different experiences"). Signal data persists in **a Society-owned key-value store** (see Publishing model), written by a public, rate-limited endpoint. It is never written to app Supabase. Counts and freeform reports are folded into the next snapshot.

### Publishing model (where data lives)

**The `subsounder-society` repo is Society's database, in JSON/Markdown form.** A static site builds from it at deploy time. This is the strongest decoupling available and is what makes the survivability principle real.

- **Society's data store.** JSON files in the `subsounder-society` GitHub repo (e.g. `data/<product-slug>.json`), plus surrounding Markdown content. At Society's scale (~500–2000 merchants, ~2KB per entry), git is a perfectly viable database — backed up by definition, openly browsable, free to host, every change is a commit, and the entire dataset survives anything short of GitHub itself going away.
- **The static site.** Next.js or Astro on Cloudflare Pages, built from those files. Pages are pre-rendered and served from CDN — **no DB read at request time**. The "Next.js + Postgres at request time" pattern is a different model; we explicitly aren't using it because runtime DB reads would couple Society's uptime to a database we'd have to operate.
- **App → Society sync.** A scheduled job in the app exports the published-fields subset of `products` to JSON and commits to a `data/` path in the Society repo. Auto-merged to main for routine snapshot updates; community-touched paths require review.
- **Society → App writeback (optional, deferred).** When a community PR merges in the Society repo, a future workflow can optionally sync selected fields back into `products` if the app would benefit. **Not required for Society to function** — Society's data store is authoritative for what Society publishes.
- **Signals data store.** Anonymous thumbs-up/down counters and freeform reports live in a **Society-owned Cloudflare D1 or KV** (or a tiny separate Supabase if simpler), with no shared credentials or schema overlap with the app DB. A daily aggregator Worker reads the signals store and writes counts into the next snapshot commit.
- **Privacy boundary is physical.** The app DB is never publicly readable. The Society site has no DB credentials at all for app-side tables. Society's own data store contains only public-by-design content (merchant intel + anonymous counters).
- **Migration path.** If Society later needs runtime queries that the static model can't support (search at scale beyond client-side indexing, per-user features, etc.), the JSON dataset migrates trivially to a Postgres of Society's own. The decision today doesn't lock that out.

### Sequencing (when each piece lands)

- **During Public Beta:**
  - Create the `subsounder-society` repo (with empty `data/` directory and a placeholder README).
  - Ship the app-side **snapshot export job** (writes `products` subset to the Society repo on a schedule).
  - The public Society site does not launch yet — the repo accumulates real data through Beta as the enrichment cron populates `products`.
- **At V1:** launch the **public Society site**. V1 acquisition push doubles as Society launch announcement. The community-PR workflow and experience-signal endpoint go live with the site.

Society plumbing during Beta is a **secondary** concern behind catalog-correctness work. If timing slips, public launch slips into V1.x without affecting V1's marketing push.

### Process — managing app and Society in parallel

App and Society work coexist in this repo until V1; the `subsounder-society` site repo exists alongside from the point the snapshot job lands.

- **GH issue scope label.** A new `society` label marks issues whose work is for Society (export job, signals endpoint, writeback workflow, Society site code). Absent label = default app scope. The label is **orthogonal to the track label** (an issue can be `feature` + `society`, or `reliability` + `society`, etc.). Filter Society work within a milestone with `label:society`. The label itself is created as part of the upcoming track-and-milestone-alignment PR; this ADR is the architectural reason it exists.
- **Milestones.** Society plumbing issues attach to **Public Beta**. Society public launch + site code attaches to **V1**. Society issues without a milestone still get a track + scope label so they're triageable.
- **Repo boundary.** Until V1: app-side Society code (export job, signals endpoint, writeback workflow) lives in this repo; Society site code (templates, build, styling, data) lives in `subsounder-society` from the point that repo is created. **After V1**, if Society develops substantial app-independent functionality, app-side Society code can migrate to its own repo too — but the survivability principle is already satisfied at the data-store level, so a code-repo split is a maintenance call, not a structural requirement.
- **Branch naming.** Standard `<type>/<scope>` in this repo. For Society work, scope segments like `society-export-job` or `society-signals-endpoint` make cross-cutting work visible at a glance.
- **Cross-project agent context.** When work begins on the `subsounder-society` repo in its own Claude Code session, that session does not automatically see this repo's docs or GH issues. Bridge with:
  - **Additional working directories.** Configure the Society repo's Claude Code with the app repo as an additional working directory. The Society agent can then read app docs (this ADR, [docs/active/ROADMAP.md](../active/ROADMAP.md), [docs/competitive-analysis.md](../competitive-analysis.md), CLAUDE.md) directly, without WebFetch.
  - **Cross-repo GH issues.** Use `gh issue list --repo udog21/subsounder ...` (and `view`/`create` variants) when the Society agent needs to reference or track work in the app repo. Society's CLAUDE.md should call out this pattern explicitly so agents don't assume single-repo scope.
  - **Canonical reading list.** Society's own CLAUDE.md should pin the app docs every Society agent should consult first: this ADR (the boundary contract), the app's `docs/active/ROADMAP.md` (milestone context), and `docs/competitive-analysis.md` (cancellation-intel framing).
  - **Direction.** The app generally does not need to read Society's repo during routine work; the export job is one-directional and the app's `products` table is its own source of truth. Wire the additional-directory bridge in only the direction needed.

## Consequences

**Positive:**
- Either project can survive the other's failure. App and Society are content-coupled, not infrastructure-coupled.
- Layer 3 of the cancellation-intel pipeline becomes a public asset rather than an internal feedback loop, accelerating the moat.
- App DB stays user-data-only at the network boundary. Trust posture (RLS, alias enumeration, retention) is unaffected by Society's existence.
- Society can grow Society-only fields; app can grow app-only fields; only the explicit export config defines the overlap.
- PR-based contribution gives a natural review surface; experience signals give a frictionless quality-check layer that doesn't require contributor identity.
- V1 marketing has a content asset on day one, not just a landing page.
- The Society dataset is in git — backed up by definition, openly browsable, easy to migrate later (to Postgres, to a different host) if scale demands.

**Negative:**
- Society is **not fully static** — the experience-signal endpoint, snapshot-commit workflow, and PR-merge automation are small server-side surfaces that need rate limiting, abuse handling, and monitoring. Modest infrastructure overhead.
- Data lag of up to ~24h on Society relative to the app. Acceptable for cancellation policies (which change rarely); not acceptable for prices (which is why prices aren't published).
- Moderation cost on community PRs is non-zero. Should be manageable at V1 scale but needs revisiting if contribution volume outpaces review. If unmitigable (even with AI assistance), Society can be wound down without affecting the app — per the survivability principle.
- Two repos to keep in sync; the export job is new infrastructure that can fail silently if not monitored.
- Building Society plumbing during Beta adds scope on top of catalog-correctness work. Sequencing rule above protects against the plumbing crowding out core work.

**Neutral:**
- Doesn't change the app's data model. `products` keeps growing as planned for app needs.
- Doesn't preclude later moving Society to its own Postgres if features require runtime queries the static model can't support.
- Doesn't decide the static-site framework (Next.js vs. Astro vs. other) — implementation choice for the Society repo.

## Alternatives Considered

**Shared Supabase with public reads on `products`.** Lower latency, no export job. Rejected: shares DB infrastructure with the app, so any RLS misconfiguration on `products` or DDOS on Society surfaces in the app DB. The privacy boundary becomes a config setting rather than a physical wall. Also violates survivability: an app DB outage takes Society down too.

**Use `products` as Society's source of truth (single DB, app owns it).** Rejected: forces `products` to grow Society-only columns even when the app doesn't need them, and forces Society to live within the app's schema cadence. Couples the two more tightly than the survivability principle allows.

**Separate Supabase project for Society from day one.** Maximum isolation; supports runtime queries the static model doesn't. Rejected for launch: most engineering, more cost, more surface to operate, and unnecessary at the data scale Society will have for years. Worth revisiting if and when Society develops features that need runtime DB queries.

**Subsounder-only editorial voice (no community PRs, no experience signals).** Slowest content velocity, lowest moderation burden. Rejected: Layer 3 is the long-term moat, and a public-but-uncontributable resource leaves that on the table.

**Open community wiki (anyone edits post-moderation).** Fastest velocity, no quality floor. Rejected: dilutes Subsounder's editorial voice on what is its own data moat.

**Broad-scope launch (publish refunds, dark patterns, customer-service contacts, etc. day one).** Rejected: amounts to building two products at once before either is proven. Schema-independence design above makes broadening additive and ungated by this ADR.

**Publish `pricing` at launch.** Rejected: prices change too often to be reliable in a snapshot-based public resource.

**Earlier launch (during Public Beta).** Maximizes SEO runway. Rejected: Beta is where enrichment cron populates `products` with real content; launching the public site earlier means publishing stubs and burning the marketing moment.

**Later launch (post-V1).** Misses V1's acquisition tailwind as the launch moment.
