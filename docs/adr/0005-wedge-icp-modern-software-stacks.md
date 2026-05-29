# ADR-0005: Wedge ICP — subscription intelligence for modern software stacks

- **Status:** Accepted
- **Date:** 2026-05-28
- **Deciders:** Lek
- **Related:** [docs/market-and-positioning.md](../market-and-positioning.md), [docs/active/ROADMAP.md](../active/ROADMAP.md), [ADR-0003](0003-no-bank-connection-ingestion-strategy.md), [ADR-0004](0004-silent-provider-signals-classes-and-sonar-bench.md), PR #89 (positioning rewrite), PR #93 (Phase 1 / Phase 2 reshape), PR #107 (in-codebase landing for stack-operator audience)
- **Retires:** the undifferentiated "subscription spender" framing as the M0–M2 target

## Context

The pre-M0 positioning aimed broadly at individuals who wanted visibility across their subscription spending, an undifferentiated "subscription spender" audience. Two reframing insights emerged as M0 approached.

First, the structural fit between channel and audience. [ADR-0003](0003-no-bank-connection-ingestion-strategy.md) had already accepted no bank-connection ingestion; with email forwarding the only ingestion channel for M0–M1, audiences with sparse receipt trails depend heavily on the silent-provider workflow (Netflix-class subs the user never receives a recurring receipt for) to bootstrap a useful catalog. [ADR-0004](0004-silent-provider-signals-classes-and-sonar-bench.md) built the sonar-bench plumbing for this, but the workflow's readiness as a *day-1 value* mechanism is itself one of the questions Phase 2 is set up to answer — not a foundation to bet first-impression value on.

Second, the receipt category that piles up densest is the modern software stack — long-tail SaaS, prosumer tools, API credits, marketplace platforms. The stack-operator audience is well-served by email forwarding alone, and the analytics surface it unlocks is meaningfully richer than what a generalist frame justifies investing in: tax-deduction tracking (load-bearing for solo founders and freelancers), year-over-year spend analysis, redundancy detection across overlapping tools, and under-usage signals for time-bound credits where the provider's own usage emails are parseable. A wedge that exploits both of these properties at once is a stronger Phase 2 bet than a wider frame hedging across an audience with neither.

The M0 dogfood pod is shaped this way already, the catalog reads as immediately useful when seeded with stack-shaped receipts, and the surfaces SubSounder can plausibly reach with a small invite list (developer communities, indie-hacker networks, automation-builder forums) are concentrated among stack operators. The positioning rewrite (PR #89) and roadmap reshape (PR #93) acted on these observations together. This ADR records the resulting boundary decision so it isn't quietly relitigated.

## Decision

### 1. The positioning statement is "Subscription intelligence for modern software stacks"

This is the canonical positioning. Landing, ToS, privacy, onboarding copy, the welcome email (#8), and any future user-facing surface align to this frame; the prior generalist "track your subscriptions" framing is retired.

### 2. The wedge ICP is a three-tier structure of stack operators

- **Tier 1** — AI-native solo operators: indie hackers, vibe coders, AI-heavy freelancers, small SaaS founders, technical creators, automation builders.
- **Tier 1.5** — makers / creator-commerce operators: Etsy, Shopify, print-on-demand, asset sellers.
- **Tier 2** — media creators.

The tiers sit on overlapping provider universes (long-tail SaaS, prosumer tools, API credits, marketplace platforms). The addressable market expands outward through subsequent concentric circles over time — small dev agencies, broader prosumer-SaaS users, eventually generic-consumer households — but each outward step is gated on two conditions: the inner circle signals market fit, and the subscription intelligence already accumulated for the inner circle (registry coverage, parser vocabulary, signal patterns) compounds into coverage for the next. Inbound interest from outer-ring users during M0–M2 is captured in the waitlist; it does not pull product priorities until the wedge gate is met.

### 3. The product surface evolves under the wedge

The product is not unchanged. Several latent shifts become priorities under the new frame:

- **Ingestion narrows from keyword-broad to provider-billing-domain-specific.** Today's forwarding setup leans on user-applied keyword filters ("subscription", "renewal") that over-include — too many false-positive forwards land in the parser. The wedge pushes ingestion toward billing-domain allowlists with system-managed setup: importable XML Gmail filter exports, OAuth-managed forwarding-rule updates, and similar provider-side mechanisms that bring forwarding configuration close to zero-touch.
- **Analytics surface moves earlier on the roadmap.** Tax-deduction tracking (load-bearing for solo founders and freelancers), year-over-year spend analysis, redundancy detection across overlapping tools, and under-usage signals for time-bound credits shift from post-M2 nice-to-haves into M1–M2 differentiators. The Tier 1 audience expects these earlier than a generalist audience would have.
- **Landing page rewritten in-codebase for the stack-operator audience** (PR #107). Replaces the prior generic Webflow site; copy leans into technical specificity (long-tail SaaS, prosumer tools, API credits) rather than softening it.
- **Registry seed list** (#18, #90) targets wedge providers, not top streaming/gym/insurance.
- **Phase 1 / Phase 2 reshape** (PR #93) — Phase 1 organizes around onboarding a brand-new wedge invitee from landing page → forwarded email → first parsed subscription with no hand-holding; Phase 2 measures activation against wedge invitees, with the silent-provider day-1-value question flagged as an alpha-validation item rather than a precondition.
- **CSV backfill** (#78) moves to Phase 2.
- **Multi-currency** (#21) stays in M1, justified by EU-based Tier 1 invitees with non-USD receipts (Supabase, n8n).

### 4. What this decision does not override

[ADR-0003](0003-no-bank-connection-ingestion-strategy.md) and [ADR-0004](0004-silent-provider-signals-classes-and-sonar-bench.md) are both untouched. The wedge narrows the M0–M2 ICP; it does not reverse the no-bank-connection choice or the silent-provider matcher classes, both of which remain load-bearing for the outward expansion. Anyone reopening ADR-0003 or ADR-0004 in light of the wedge should treat that as a separate, evidence-driven reopening, not an automatic consequence of this ADR.

## Consequences

**Positive:**

- The stack-operator wedge unlocks analytics surfaces a generalist frame would not justify building: tax-deduction tracking (load-bearing for solo founders and freelancers), year-over-year spend analysis, redundancy detection across overlapping tools, and under-usage signals for time-bound credits parseable from provider usage emails. These become product differentiation rather than features bolted on later.
- The Tier 1 audience is specific enough that landing copy, registry coverage, and onboarding can be tuned for it without hedging across a wider, less-defined audience that wouldn't be reached for several milestones.
- The catalog's day-1 value story stops depending on the silent-provider workflow being fully proven — a Tier 1 forwarder gets a useful catalog from forwarded receipts alone, and silent-provider seeding becomes a *nice-to-have* for alpha rather than a *required for value*.
- Registry investment compounds across tiers — Tier 1.5 and Tier 2 share the same long-tail SaaS / prosumer universe, so coverage doesn't restart when expansion begins.
- The Phase 2 gate (≥5 testers activate with >3 subs each, ≥2-week engagement, ≥3 spontaneous value-prop quotes) is measurable against a defined alpha cohort instead of an averaged "subscription spender" sample.
- The pivot is iterative product evolution — tightened ingestion, earlier analytics, updated voice copy — not a schema-level overhaul, new ingestion channel, or parser rewrite. Investment compounds rather than restarts.

**Negative:**

- The Tier 1 wedge audience is smaller than the original undifferentiated "subscription spender" audience by roughly an order of magnitude. M2 success at this wedge proves the innermost concentric ring, not the broader business — each subsequent expansion ring is a separate bet, gated on both market-fit signal and intelligence compounding, not an automatic consequence of the prior.
- The wedge surfaces product work the generalist frame let us defer: provider-billing-domain ingestion allowlists, system-managed forwarding rules (XML Gmail filter imports, OAuth-managed updates), and earlier analytics surfaces (tax-deduction tracking, YoY spend, redundancy detection). M1 / M2 capacity now carries this in addition to the original sequencing changes.
- Registry seeding loses the ability to lean on standardized consumer-default lists (top streaming services, top gyms). The wedge-provider top list is less standardized and requires more first-pass judgment.
- Inbound interest from non-wedge waitlist signups during M0–M2 is harder to action without either expanding the wedge prematurely or actively turning interest away. The chosen posture (capture, do not act on) costs some goodwill at the margin.

**Neutral:**

- ADR-0003 / ADR-0004 untouched.
- Existing parsed receipts from M0 dogfooding remain valid evidence; the dogfood pod's shape already matches Tier 1.
- GitHub issue bodies for #8 (welcome email copy) and #18 (cancellation-intel seed list) are informed by this decision when next worked, not edited in the pivot PRs themselves.

## Alternatives Considered

The structural baseline — keeping the undifferentiated "subscription spender" framing — was rejected for the reasons in Context. The substantive choice was *which focused segment to lead the wedge with*. Solo founders, 1–3-person startups, and AI power users sit inside Tier 1 as currently scoped, so they aren't separate alternatives. The segment-first options actually considered and rejected as the lead wedge:

**Lead with makers / creator-commerce operators.** Same product surface, slightly larger TAM. Rejected because receipt density per pod is lower than for AI-native operators (fewer recurring SaaS / API receipts per maker pod), and the founder's network reaches AI-native operators more credibly than maker communities, so the M1 invite list materializes faster.

**Lead with content creators.** Larger TAM still. Founder has fewer connections here; higher acquisition cost.

**Lead with small dev agencies (2–10 people).** Same provider universe as Tier 1 with higher receipt density per pod. Rejected because team-pod billing ownership (shared accounts, expense-back models, role permissions) is structurally different from solo billing and would push pod-sharing features ahead of single-user polish. Reachable as an expansion target once Tier 1 is proven.

**Lead with privacy-sensitive professionals.** Rejected because the email-forwarding ingestion model depends on a trust posture this segment is least likely to extend at first contact; acquisition cost would be high relative to AI-native operators who are already comfortable forwarding mail to LLM-shaped pipelines.