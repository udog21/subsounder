# SubSounder Roadmap

_Last updated: 2026-05-22. This is the strategic plan. For tactical work units, see [GitHub issues](https://github.com/udog21/subsounder/issues) — each phase's Scope below maps to GH issues._

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

## Phase 1 — Harden for personal use · *current*

**Goal:** Make the data layer (parser + matcher + dedupe) accurate enough on Lek's real receipts that he's willing to live in the catalog daily. UI affordances for managing imperfect data (Dismiss, etc.) ship in Phase 2.

**Scope:**
- [#3](https://github.com/udog21/subsounder/issues/3) Prompt v3 — trial fields, cadence-vs-date consistency, date grounding (`llm`)
- [#7](https://github.com/udog21/subsounder/issues/7) Out-of-order receipts — an older signal must not overwrite newer subscription state (`reliability`)
- [#9](https://github.com/udog21/subsounder/issues/9) Test-account orphan cleanup — clear v1-era orphan rows so dogfood starts on a known-clean slate (`techdebt`)

**Gate (→ M0):** After Lek forwards ≥10 of his real subscription receipts (covering his ≥12 active subs), the resulting catalog matches reality on the vast majority of rows; any misfire is subtle (not glaring) and filed as a GH issue. Manual SQL cleanup of stragglers is acceptable here — UI dismissal lands in Phase 2.

### ◆ M0 — Dogfood officially begins · target Mon 2026-05-25

---

## Phase 2 — Dogfood

**Goal:** Lek lives in the product as a real daily user; ship the catalog affordances he wants during dogfood and that a *second* person will also need.

**Scope:**
- [#4](https://github.com/udog21/subsounder/issues/4) Dismiss action — kebab menu, `deleted_by_user` status, matcher skip, "show dismissed" toggle (`feature`)
- [#5](https://github.com/udog21/subsounder/issues/5) Mark as cancelled action (`feature`)
- [#8](https://github.com/udog21/subsounder/issues/8) Onboarding empty state + welcome email (`feature`)

**Gate (→ M1):** Sustained — across the dogfood period (~Mon–Fri), zero *glaring* parser misfires in real ongoing use (subtle ones filed); Lek's catalog stays manageable via Dismiss + Mark-cancelled during dogfood; the onboarding flow takes a brand-new user from signup to first forwarded email with no hand-holding.

### ◆ M1 — Alpha invites go out · target Fri–Sat 2026-05-29/30

---

## Phase 3 — Private Alpha

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
- Bank/card connection (Plaid) — explicitly out of scope; a different product class (competes with Rocket Money)

---

## Registry — a note on scope

The Subscription Registry (`subscriptionregistry.org`) is, for *roadmap* purposes, a prerequisite work-stream of M2 (issues #18 and #19) — not a milestone of its own. Architecturally it stays separate: its own repo, its own brand, per [ADR-0002](../adr/0002-subsounder-society-boundary.md). One is a planning lens, the other an architecture decision — no conflict.

---

## Where this doc lives in the workflow

- **Update this doc** when a phase's Goal/Scope/Gate changes, when a milestone is reached, or when a major scope decision lands.
- **Don't** put bug fixes, individual refactors, or one-off chores here — those are GH issues inside a phase's Scope.
- Each phase's Scope maps to GH issues; group them under the matching GH milestone (M0/M1/M2).
- When asking an agent "what should I work on next," the answer is: the highest-priority open issue in the *current* phase's Scope.
