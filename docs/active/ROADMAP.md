# SubSounder Roadmap

_Last updated: 2026-05-28. This is the strategic plan. For tactical work units, see [GitHub issues](https://github.com/udog21/subsounder/issues) — each phase's Scope below maps to GH issues._

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
| **M0** | Dogfood officially begins | ✅ 2026-05-28 |
| **M1** | Alpha invites go out | Mon 2026-07-05 |
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

## Phase 0 — Harden for personal use — ✅ reached 2026-05-28

What landed:
- 2026-05-27 burndown — promo-vs-confirmation classification (#69), Apple one-time line items rejected at prompt + matcher (#70), `cancel_by_at` rolled in lockstep with `next_renewal_at` (#71), amount carry-forward on `renewal_notice` (#75), content-based loopback skip via `X-Subsounder-Notification` header (#68 — unblocks the Gmail auto-forward seeder)
- Matcher correctness — out-of-order receipt reconciliation with cycle-promotion guard (#7), distinct-plan penalty with null-asymmetric scoring (#60), 4-layer identity (provider / product / plan / instance) eliminates multi-instance coalescing on registrars and per-mailbox SaaS (#55)
- Prompt v3 → v6 — trial fields, cadence-vs-date authority, today-date grounding, bundled-aggregator splitting, 4-layer identity, promo-vs-confirmation distinction, Apple one-time guard
- Dogfood ingestion — Gmail filter auto-forward seeder (#25), defense-in-depth skip for SubSounder's own outbound (#29)
- Auth + onboarding fixes — magic-link session hang (#52), session-switch bug on multi-account login (#65)
- Test-account cleanup (#9)

Validated on Lek's real receipts: Apple-bundled subscriptions (YouTube, Medium, iCloud, Dumb Phone), Skillshare (with amount carry-forward), Google Home Premium Advanced (with dates rolled), GoDaddy multi-instance domains, Microsoft 365 mailboxes, Samsung Art Store, SailFlow, EMI Health, plus correctly rejected non-subs (Audible promo, Apple Movie Rentals, multiple marketing offers). Glaring misfires in the active catalog at gate time: 0.

### ◆ M0 — Dogfood officially begins · ✅ 2026-05-28

---

## Phase 1 — Dogfood · *current*

**Goal:** Ship the full user lifecycle UI — onboarding (alias generation, welcome email, empty-state flow), catalog seeding via email forwarding (no statement CSV upload required during dogfood), signal parsing, promotion to catalog, and curation/pruning. Lek lives in the product as a real daily user, and a brand-new wedge invitee (modern software stack operator — see [market-and-positioning.md](../market-and-positioning.md)) can onboard cleanly with forwarding alone. Silent-provider CSV seeding moves to Phase 2 where alpha feedback tests whether it's needed for day-1 value.

**Scope** — three themes, each a sub-goal of the Phase 1 goal above. #4 Dismiss shipped during dogfood; will be summarized in `What landed` when M1 is reached.

### Onboarding the first new user

*A brand-new wedge invitee goes from landing page → signup → alias → first forwarded email → useful catalog, with no hand-holding.*

- [#94](https://github.com/udog21/subsounder/issues/94) In-codebase landing page + privacy + ToS pages — scratch-built (not a Webflow port); disconnect Webflow after DNS swap. Privacy/ToS are M1-required for alpha invitees (`marketing`)
- [#54](https://github.com/udog21/subsounder/issues/54) Signup alias generation — fix `create_pod_and_profile` RPC so net-new signups get a pod alias (every alpha invitee hits this on day one) (`reliability`)
- [#8](https://github.com/udog21/subsounder/issues/8) Onboarding empty state + welcome email — copy reframed for the wedge ICP (`feature`)
- [#61](https://github.com/udog21/subsounder/issues/61) Outlook M365 forwarding bounce — FAQ + onboarding hint so Outlook-using invitees aren't silently dead-ended (`feature`)
- [#90](https://github.com/udog21/subsounder/issues/90) Seed top ~30 wedge-provider cancellation data — actionable cancellation info on day-one catalog rows (`feature`)

### Catalog quality + parser correctness

*Lek lives in the catalog daily without it degrading; the parser handles the wedge stack's known misfires; future prompt iterations are caught by a regression harness.*

- [#5](https://github.com/udog21/subsounder/issues/5) Mark as cancelled action — manual cleanup affordance (`feature`)
- [#46](https://github.com/udog21/subsounder/issues/46) Confirmed/unconfirmed state on catalog rows — Class A/B confidence surface (pairs with #83/#84) (`feature`)
- [#72](https://github.com/udog21/subsounder/issues/72) Trial → renewal duplicate identity — alpha invitees on trials would hit duplicate rows without this (`reliability`)
- [#74](https://github.com/udog21/subsounder/issues/74) Domain registrar `billing_cadence` — known GoDaddy-class misfire from 1-year date-gap inference (`llm`)
- [#91](https://github.com/udog21/subsounder/issues/91) MVP LLM eval fixture harness — catches extraction regressions across prompt iterations (`llm`)

### Silent-provider sonar workflow ([ADR-0004](../adr/0004-silent-provider-signals-classes-and-sonar-bench.md))

*Class C signals from alpha-backfill incomplete forwards land in a bench above the catalog, where invitees can promote or dismiss without polluting catalog rows.*

- [#83](https://github.com/udog21/subsounder/issues/83) Sonar pings bench — Class C provider pills with dismiss + promote-to-card (`feature`)
- [#84](https://github.com/udog21/subsounder/issues/84) Prompt vN — silent-provider signal types (`welcome`, `tos_update`, `anniversary`) + `signal_strength` for matcher Class assignment (`llm`)

**Gate (→ M1):** Sustained — across ~a week of real ongoing use, zero *glaring* parser misfires on Lek's stack (subtle ones filed); catalog stays manageable via Dismiss + Mark-cancelled during dogfood; the onboarding flow takes a brand-new user from signup → alias generation → first forwarded email → first parsed subscription in the catalog, with no hand-holding.

### ◆ M1 — Alpha invites go out · target Mon 2026-07-05

---

## Phase 2 — Private Alpha

**Goal:** Prove the funnel works on wedge-ICP invitees' real inboxes (Tier 1 AI-native solo operators first; Tier 1.5 makers / Tier 2 media creators as reachable — see [market-and-positioning.md](../market-and-positioning.md)), validate during alpha whether silent-provider seeding (CSV backfill + Class C signals) is needed for day-1 value or just nice-to-have, and build M2's prerequisites in parallel.

**Scope — alpha experience:**
- [#6](https://github.com/udog21/subsounder/issues/6) Edit subscription — minimal field set; doubles as the inline-financial-enrichment affordance for silent-provider welcome emails (per [ADR-0003](../adr/0003-no-bank-connection-ingestion-strategy.md)) (`feature`)
- [#15](https://github.com/udog21/subsounder/issues/15) Free trial countdown UI on catalog cards (`feature`)
- [#78](https://github.com/udog21/subsounder/issues/78) CSV onboarding backfill — one-time bank/CC statement import to seed legacy silent-provider subs; third-party PDF→CSV upstream, SubSounder parses standardized CSV column shapes only. Tests during alpha whether wedge invitees need silent-provider seeding to find day-1 value (per [ADR-0003](../adr/0003-no-bank-connection-ingestion-strategy.md)) (`feature`)
- [#79](https://github.com/udog21/subsounder/issues/79) Silent-provider price-change surfacing — when a forwarded price-change email updates `products.pricing`, flag catalog rows holding the old amount as "may be stale" (per [ADR-0003](../adr/0003-no-bank-connection-ingestion-strategy.md)) (`feature`)

**Scope — M2 prerequisites (built in parallel):**
- [#16](https://github.com/udog21/subsounder/issues/16) Public self-serve signup — remove invite gating (`feature`)
- [#17](https://github.com/udog21/subsounder/issues/17) Analytics + conversion-funnel instrumentation — no ad tracking = no ads (`marketing`)
- [#18](https://github.com/udog21/subsounder/issues/18) Cancellation-intel research — top 50–100 providers, ranked by "how to cancel X" search volume (`feature`)
- [#19](https://github.com/udog21/subsounder/issues/19) Registry site — scaffold `subscription-registry` repo + publish provider pages (`marketing`)
- [#20](https://github.com/udog21/subsounder/issues/20) Spend total as a first-class headline number — the conversion hook (`feature`)
- [#21](https://github.com/udog21/subsounder/issues/21) Multi-currency support — alpha cohort may include Tier 1 invitees with non-USD billing (e.g., EU-based founders' n8n / Supabase receipts) (`feature`)

**Gate (→ M2):** ≥5 invited testers activate within 2 weeks of invite (each catalog reaches >3 correct subscriptions) AND remain engaged ≥2 weeks post-activation (sustained forwarding, repeat catalog visits); spontaneous value-prop sentiment captured from ≥3 of them; no tester hits an unexplained, trust-breaking data error.

### ◆ M2 — Public Beta launch + paid search ads · date set after M1

---

## Beyond M2 (V1 horizon — parked)

Not scheduled. Promote into a phase when prioritized.

- [#22](https://github.com/udog21/subsounder/issues/22) Spend analytics charts (`feature`)
- [#23](https://github.com/udog21/subsounder/issues/23) Family / pod sharing (`feature`)
- [#85](https://github.com/udog21/subsounder/issues/85) Renewal-reminder threshold gate — fixed annual-spend floor v1, user-configurable later (deferred out of M1 to protect Jul 5 target; candidate for Phase 2 once alpha reminder noise becomes visible) (`feature`)
- Scale paid spend — ramp daily budget as unit economics hold
- Monetization decision — free / freemium / paid tier
- Gmail OAuth bulk-scan — instant catalog seed (CASA Tier 2 gated)
- Browser-extension forwarder — catch welcome flows at point-of-subscribe
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
