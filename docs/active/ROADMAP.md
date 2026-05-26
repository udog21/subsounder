# SubSounder Roadmap

_Last updated: 2026-05-25. This is the strategic plan. For tactical work units, see [GitHub issues](https://github.com/udog21/subsounder/issues) — each phase's Scope below maps to GH issues._

## Product principles

These shape every UX, schema, and feature-scope decision. When in doubt, route the call through them.

### Autonomous-by-default

SubSounder's job is to reduce subscription fatigue, not add to it. The user should be able to ignore the app for weeks and still trust it. When the app asks for input, it's because acting silently was genuinely unsafe — not for rubber-stamping routine cases.

Implications:
- No per-parse confirmation emails. Weekly digests at most.
- Curation is optional. Default behavior: silent on routine signals; surface only the cases the user alone can resolve.
- Configuration is product debt. Right defaults beat user-tunable knobs; reach for a knob only when the correct default genuinely depends on individual preference.

### Visibility → prioritization → active management

The product evolves through three stages. Each unlocks the next.

1. **Visibility** (current): a complete catalog of the user's recurring spend. Surprise-charge avoidance is the immediate utility; the broader goal is awareness — you can't manage what you can't see.
2. **Prioritization**: with the catalog complete, the user makes tradeoffs (do I need both Disney+ and Netflix?). The app supports this with yearly-spend rollups, default sort by spend, and category grouping.
3. **Active management**: the app proposes and executes spend changes — cancellation suggestions tied to usage signals, content-drop awareness (return when Andor S2 lands), one-click cancellation via stored cancellation URLs and steps. Each suggestion is reversible and surfaced honestly; the user remains the decision-maker.

A feature that only serves Stage 1 is fine. A feature that contradicts the direction (e.g. permanent reliance on per-event email noise) is not. Phases 0–2 of this roadmap all sit inside Stage 1 (Visibility); Stage 2 work begins after M2.

---

## How this roadmap works

This roadmap uses a **stage-gate** model. Two kinds of thing:

- **Milestone** — a *dated event*, a transition (zero duration). Named as an event ("Dogfood begins", "Alpha invites go out"). Some are launches; some are internal transitions.
- **Phase** — the *period of work between* two milestones. The work lives here.

Each phase carries three fields:

- **Goal** — one line on why the phase exists. Orientation, not a checklist.
- **Scope** — the work, each item a GitHub issue. This is *output* — within our control.
- **Gate** — the checkable condition to declare the next milestone reached and cross into the next phase. This is *outcome* — verified, not just shipped.

The discipline: **scope complete is necessary but not sufficient — the Gate is the real bar.** You can close every issue and still fail the Gate (onboarding shipped, but the parser still misfires). Early phases lean on output checks (no users yet to measure); later phases get true outcome gates once a population exists.

---

## Timeline

| Milestone | Event | Target |
|---|---|---|
| **MVP** | Pipeline works end-to-end | ✅ ~2026-05-14 |
| **M0** | Dogfood officially begins | Mon 2026-05-25 |
| **M1** | Alpha invites go out | Fri–Sat 2026-05-29/30 |
| **M2** | Public Beta launch + paid search ads | TBD — set after M1 |

---

## MVP — ✅ reached ~2026-05-14

What landed:
- Auth (Supabase magic link) → onboarding → pod with unique alias email
- Mailgun inbound webhook → `inbound_receipts` → async parser via `after()` + 5-min cron sweep
- Two-layer parser (`parser_runs` control plane → `soundings_log` data plane), versioned LLM prompts in `prompt_templates`
- Subscription matcher, products table with seeded cancellation difficulty/URL data
- Catalog UI with renewal countdown, cancellation links, annual-spend rollup
- New-subscription email + renewal-reminder cron
- Prompt v2: bundled aggregators (Apple/Stripe/etc.) + billing_cadence inference

Validated on real receipts from: Apple bundle, Stripe (Answer The Public, ElevenLabs), Paddle (n8n), Samsung Checkout (TV apps), Google Store, ATK trial.

---

## Phase 0 — Harden for personal use · *current*

**Goal:** Make the data layer (parser + matcher + dedupe) accurate enough on Lek's real receipts that he's willing to live in the catalog daily. UI affordances for managing imperfect data (Dismiss, etc.) ship in Phase 1.

**Scope:**
- [#3](https://github.com/udog21/subsounder/issues/3) Prompt v3 — trial fields, cadence-vs-date consistency, date grounding (`llm`)
- [#7](https://github.com/udog21/subsounder/issues/7) Out-of-order receipts — an older signal must not overwrite newer subscription state (`reliability`)
- [#9](https://github.com/udog21/subsounder/issues/9) Test-account orphan cleanup — clear v1-era orphan rows so dogfood starts on a known-clean slate (`techdebt`)
- [#25](https://github.com/udog21/subsounder/issues/25) Gmail filter → auto-forward subscription emails to alias — zero-code dogfood seeder that also feeds the LLM eval (sampling non-subscription "randoms" stress-tests the `maybe_subscription` vs `not_subscription` edge); ~1 hour, supportive not gating (`llm`)
- [#29](https://github.com/udog21/subsounder/issues/29) Parser: skip emails from SubSounder's own domains — code-side defense-in-depth against self-sender loopback (`reliability`)

**Gate (→ M0):** After Lek forwards ≥10 of his real subscription receipts (covering his ≥12 active subs), the resulting catalog matches reality on the vast majority of rows; any misfire is subtle (not glaring) and filed as a GH issue. Manual SQL cleanup of stragglers is acceptable here — UI dismissal lands in Phase 1.

### ◆ M0 — Dogfood officially begins · target Mon 2026-05-25

---

## Phase 1 — Dogfood

**Goal:** Lek lives in the product as a real daily user; ship the catalog affordances he wants during dogfood and that a *second* person will also need.

**Scope:**
- [#4](https://github.com/udog21/subsounder/issues/4) Dismiss action — kebab menu, `deleted_by_user` status, matcher skip, "show dismissed" toggle (`feature`)
- [#5](https://github.com/udog21/subsounder/issues/5) Mark as cancelled action (`feature`)
- [#8](https://github.com/udog21/subsounder/issues/8) Onboarding empty state + welcome email (`feature`)

**Gate (→ M1):** Sustained — across the dogfood period (~Mon–Fri), zero *glaring* parser misfires in real ongoing use (subtle ones filed); Lek's catalog stays manageable via Dismiss + Mark-cancelled during dogfood; the onboarding flow takes a brand-new user from signup to first forwarded email with no hand-holding.

### ◆ M1 — Alpha invites go out · target Fri–Sat 2026-05-29/30

---

## Phase 2 — Private Alpha

**Goal:** Prove the funnel works on strangers' real inboxes before spending a cent on ads — and build M2's prerequisites in parallel.

**Scope — alpha experience:**
- [#6](https://github.com/udog21/subsounder/issues/6) Edit subscription — minimal field set (`feature`)
- [#15](https://github.com/udog21/subsounder/issues/15) Free trial countdown UI on catalog cards (`feature`)

**Scope — M2 prerequisites (built in parallel):**
- [#16](https://github.com/udog21/subsounder/issues/16) Public self-serve signup — remove invite gating (`feature`)
- [#17](https://github.com/udog21/subsounder/issues/17) Analytics + conversion-funnel instrumentation — no ad tracking = no ads (`marketing`)
- [#18](https://github.com/udog21/subsounder/issues/18) Cancellation-intel research — top 50–100 providers, ranked by "how to cancel X" search volume (`feature`)
- [#19](https://github.com/udog21/subsounder/issues/19) Registry site — scaffold `subscription-registry` repo + publish provider pages (`marketing`)
- [#20](https://github.com/udog21/subsounder/issues/20) Spend total as a first-class headline number — the conversion hook (`feature`)
- [#21](https://github.com/udog21/subsounder/issues/21) Multi-currency support (`feature`)

**Gate (→ M2):** ≥5 invited testers activate — catalog reaches ≥3 correct subscriptions — within 2 weeks of their invite; no tester hits an unexplained, trust-breaking data error.

### ◆ M2 — Public Beta launch + paid search ads · date set after M1

---

## Beyond M2 (V1 horizon — parked)

Not scheduled. Promote into a phase when prioritized.

- [#22](https://github.com/udog21/subsounder/issues/22) Spend analytics charts (`feature`)
- [#23](https://github.com/udog21/subsounder/issues/23) Family / pod sharing (`feature`)
- Scale paid spend — ramp daily budget as unit economics hold
- Monetization decision — free / freemium / paid tier
- Gmail OAuth bulk-scan — instant catalog seed (CASA Tier 2 gated; see [competitive-analysis.md](../competitive-analysis.md))
- Other ingestion channels — CSV import, browser-extension forwarder
- Live bank/card API connection (Plaid/Teller/MX) — explicitly out of scope; a different product class (competes with Rocket Money). One-shot statement (CSV) upload is a separate mechanism, not covered by this exclusion.

---

## Registry — a note on scope

The Subscription Registry (`subscriptionregistry.org`) is, for *roadmap* purposes, a prerequisite work-stream of M2 (issues #18 and #19) — not a milestone of its own. Architecturally it stays separate: its own repo, its own brand, per [ADR-0002](../adr/0002-subsounder-society-boundary.md). One is a planning lens, the other an architecture decision — no conflict.

---

## Where this doc lives in the workflow

- **Update this doc** for **scope changes** (an item added, removed, or moved between phases) immediately, and for **milestone events** (a milestone reached, a new phase becoming current) once the Gate is verified.
- **Do not** track per-issue landed state here — GH milestones are the live source of truth for tactical delivery (open/closed counts, progress bar). This doc stays forward-looking; the `What landed` block in each completed phase is a one-shot snapshot written *after* the phase concluded, not a running log.
- **Don't** put bug fixes, individual refactors, or one-off chores here — those are GH issues inside a phase's Scope.
- Each phase's Scope maps to GH issues; group them under the matching GH milestone (M0/M1/M2).
- When asking an agent "what should I work on next," the answer is: the highest-priority open issue in the *current* phase's Scope.
