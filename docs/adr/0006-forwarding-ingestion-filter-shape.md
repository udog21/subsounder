# ADR-0006: Forwarding ingestion filter shape — recall-first with two-cutoff narrowing

- **Status:** Accepted
- **Date:** 2026-05-29
- **Deciders:** Lek
- **Related:** [ADR-0003](0003-no-bank-connection-ingestion-strategy.md), [ADR-0004](0004-silent-provider-signals-classes-and-sonar-bench.md), [ADR-0005](0005-wedge-icp-modern-software-stacks.md), [docs/active/ROADMAP.md](../active/ROADMAP.md), PR #109 (Phase 1 ingestion-precision theme), [#90](https://github.com/udog21/subsounder/issues/90), [#110](https://github.com/udog21/subsounder/issues/110), [#111](https://github.com/udog21/subsounder/issues/111)
- **Refines:** [ADR-0005](0005-wedge-icp-modern-software-stacks.md) §3 — specifies the mechanism behind "ingestion narrows from keyword-broad to provider-billing-domain-specific" as name-based with billing-domain narrowing as the post-cutoff-B future state

## Context

[ADR-0005](0005-wedge-icp-modern-software-stacks.md) §3 committed to narrowing ingestion "from keyword-broad to provider-billing-domain-specific" via importable XML Gmail filter exports and (later) OAuth-managed forwarding-rule updates. The strategic intent — system-managed setup, registry compounding, narrow precision-improving filters — was right. PR #109 took a first pass at the mechanism (provider-billing-domain whitelist via a proposed `products.billing_domains[]` column, shape-3 rule with payment-relay senders, `filters.xml` export) and merged the Phase 1 scope theme. Follow-up design discussion surfaced two facts that invalidate the domain-first mechanism, while leaving ADR-0005's strategic intent intact.

First, signal heterogeneity. The signals SubSounder needs to catch are not uniformly billing emails. Trial confirmations arrive from product or welcome subdomains (`welcome@vercel.com`, `hello@anthropic.com`), not billing subdomains. Class C silent-provider signals named in [ADR-0004](0004-silent-provider-signals-classes-and-sonar-bench.md) (`welcome`, `tos_update`, `anniversary`) are by definition not billing emails. SaaS billed via Stripe/Paddle/Lemonsqueezy relays carry the merchant identity in the message body, not in the from-address. A billing-domain-only filter would create a blind spot exactly where the user-valuable signals live — trial-end dates, new-subscription detection, and silent-provider sonar all degrade. The catch-set is heterogeneous; the filter shape has to match.

Second, asymmetric failure cost. The forwarding filter does not need to be high-precision because the downstream LLM extractor (active `prompt_templates` row) and matcher (`lib/parser/match.ts`) are already the precision layers. A false-positive forward costs one `gpt-4o-mini` call and is rejected at `parser_status = 'ignored'`. A false-negative forward is a missed subscription entirely — the user-visible failure mode. The cost of missing a positive signal exceeds the cost of parsing a false one by roughly an order of magnitude in user-trust terms, and several orders in dollar terms. Recall-first is the right architectural anchor; precision-first inverts the cost asymmetry.

These two reframings together imply that the natural ingestion shape is name-based plus generic SaaS-flavored keywords, with billing-domain narrowing reserved for a later evolution stage once the catalog matures enough to support a closed whitelist. This ADR records that specification so the mechanism does not get relitigated each time a precision optimization is proposed.

## Decision

### 1. Recall-first as the architectural anchor

The forwarding filter optimizes for recall over precision. The LLM extractor and matcher are the precision layers. Every subsequent design choice in this ADR derives from this asymmetry: missed positives are the user-visible failure mode; false positives die quietly at `parser_status = 'ignored'` for a fractional-cent parse cost.

### 2. Initial filter shape — names plus generic terms

The Gmail filter is generated server-side from the provider registry (`products` table — `provider_name` and `aliases[]`) plus a fixed generic-term keyword set:

```
("<provider name 1>" OR "<provider name 2>" OR ... OR "<alias>")
OR (subscription OR renewal OR trial OR recurring OR billing OR invoice OR receipt)
-{<global exclusion list>}
```

Provider names where the bare name is too generic to forward on alone (`Apple`, `Linear`, `Notion`, `Render`, `Modal` — common-word colliders) are excluded from the name path. The exact gating mechanism (a `safe_to_filter_alone boolean` on `products`, a curated subset list, or equivalent) is deferred to the implementation issue (#111). Colliders are still in the registry; they just don't earn standalone catch privileges, and rely on their receipts being caught by the generic-term path until the post-cutoff workflow can address them differently.

The initial generic-term set deliberately includes `billing`, `invoice`, and `receipt` despite known bleed into personal-sub and one-time-purchase mail. The recall-first principle dominates here: a weird provider using only billing vocabulary needs to be discoverable, and the parse cost of personal-sub false positives is acceptable.

### 3. Two-cutoff narrowing as the evolution path

Two distinct cutoff events progressively narrow the filter, each evidence-triggered and individually reversible.

**Cutoff A** — drop `billing`, `invoice`, `receipt` from the generic-term set. These are the highest-bleed terms (matched by Netflix invoices, Etsy purchase receipts, utility bills, Amazon shipping confirmations). The remaining four terms — `subscription`, `renewal`, `trial`, `recurring` — bias toward SaaS vocabulary and away from personal-purchase noise. Triggered when observation shows the three broad terms are net-negative on inbound matched *only* via that path (no name hit, no other generic-term hit).

**Cutoff B** — drop all generic terms. Filter becomes a strict provider-name whitelist. New providers enter the catalog only by explicit user action: manual forward of a first receipt, in-app card creation (which would require reopening ADR-0003's manual-add exclusion as a separate evidence-driven decision), or by SubSounder adding the provider to the global registry. Triggered when the catalog has reached coverage such that new-provider discovery through the keyword-catch path is dominated by user-initiated paths.

Threshold numbers for both cutoffs are deliberately not pinned in this ADR — the data to set them honestly does not yet exist. What is pinned is the **mechanism**: per-keyword-path observability of parser outcomes on `inbound_receipts` plus `parser_runs` plus matched `subscriptions`. Each forwarded receipt's matching path is recorded; aggregated parser-status distribution per path tells us when a keyword is no longer earning its keep. Implementation of this telemetry is part of the cutoff-A work, not deferred to "when we need it" — without the telemetry the cutoffs become "we will get to it" decisions that drift.

### 4. Exclusion list as the precision lever during the recall-first era

False-positive senders observed during dogfood and alpha (personal-sub providers that consistently misfire; marketing senders the LLM repeatedly rejects) feed a global exclusion list rendered into the filter as `-from:`. This is the precision lever before cutoff A: it narrows the false-positive surface without sacrificing recall on the name path.

Maintenance: manual review during dogfood and alpha, with LLM-suggested candidates (senders the parser has rejected ≥N times across pods) added to the review surface post-M1. Exclusions are pod-agnostic — a personal-sub sender excluded by one user's observation benefits all wedge users, preserving the registry-compounding effect ADR-0005 named. Per-pod overrides remain possible if the no-bleed assumption breaks at the margin, but they are not v1.

Storage shape (a `forwarding_exclusions` table, a JSON column on a config row, or rendered into `seed.sql` initially) is deferred to the implementation issue. The decision pinned here is that the exclusion list is **a thing the registry maintains, pod-agnostic, observability-driven**.

### 5. Server-side rendering, pulled on demand

The Gmail `filters.xml` is rendered server-side at request time at `/api/gmail-filters/[pod_id]` (or equivalent — endpoint shape per #111). Users download and import via Gmail's native filter-import flow. No client-side rendering, no cron-pushed updates, no per-user filter customization — every pod gets the same registry-derived filter at a given moment.

Users are prompted to re-import after material registry changes: post-cutoff-A activation, after meaningful exclusion-list additions, when the provider list grows enough to materially affect catch rate. The re-import prompt is informational, not a precondition — a stale filter still works, just less precisely than current.

The registry-layer / delivery-layer separation matters here: the same `products` registry that drives Gmail `filters.xml` can drive Outlook rules (#61's domain), browser-extension forwarders (Beyond M2), and post-CASA OAuth-managed filter installation. Provider-intelligence work compounds across delivery mechanisms without re-derivation.

### 6. Out-of-catalog provider workflow (post-cutoff-B)

Once the filter is whitelist-only, a user signing up for a tool not yet in the catalog has three paths:

- **Manual forward** of the first receipt — the parser still processes any received mail, this is the implicit path.
- **In-app card creation** — currently rejected by [ADR-0003](0003-no-bank-connection-ingestion-strategy.md) on the grounds that manual-add defeats the helper purpose during the discovery era. Cutoff B shifts the product from passive-detect to active-curate, which materially changes the premise of that rejection. Reopening ADR-0003's manual-add exclusion is recorded here as a follow-up decision triggered by cutoff B, not pre-judged in this ADR.
- **Wait** for SubSounder to add the provider to the global registry via dogfood discovery, public-registry contribution, or alpha/beta user reports.

Picking a default UX is deferred to the cutoff-B implementation moment. The option set is recorded here so it is not relitigated as a fresh question later.

## Consequences

**Positive:**

- The filter catches all three signal classes ADR-0004 named (Class A billing, Class B identity+cadence, Class C silent-provider) plus trial confirmations from product subdomains and SaaS billed via payment-processor relays. The previously-considered domain-only shape would have missed each of those classes structurally, not just at the margin.
- Recall-first / precision-via-LLM cleanly decouples filter design from parser design. The filter does not need to "know" what a subscription is — it surfaces plausible candidates; the LLM classifies.
- The two-cutoff evolution gives a clear migration path from "discovery-leaning" (current) to "curated-catalog" (post-cutoff-B) without a one-time disruptive flip. Each cutoff is evidence-triggered and reversible — a premature cutoff can be undone by re-adding the keywords.
- The exclusion list is a precision lever during the recall-first era that does not require user catalog discipline or per-user filter customization. Wins compound across pods via the global registry.
- Server-side rendering from the registry (preserving ADR-0005's system-managed direction) means a new provider added to `products` improves every user's filter on the next refresh — provider-intelligence investment is a leveraged asset, not a per-user feature.
- The registry-layer / delivery-layer separation keeps Outlook rules, browser-extension forwarders, and post-CASA OAuth filter installation as additive delivery channels rather than parallel mechanisms to maintain.

**Negative:**

- Higher LLM parse cost than the domain-narrowed alternative during the recall-first era. At dogfood and alpha volumes the cost is sub-dollar to low single-digit dollars per month; at post-public-beta scale the cost scales with inbound volume rather than user count, so the cutoff-A timing matters for cost as well as precision. Cost trajectory needs monitoring as part of the same telemetry that drives the cutoff decisions.
- The cutoff thresholds are TBD-on-data, not pinned in this ADR. Risk: "we will get to it" drift if the observability instrumentation is not built or not watched. Mitigation: the observability mechanism is part of the implementation issue for cutoff A, not deferred to a future "when we are ready" issue.
- The `safe_to_filter_alone` (or equivalent collider-name handling) introduces a per-product curation burden. Initial pass during the wedge provider seed work (#90 as rescoped); ongoing pass each time a provider is added. Acceptable burden given how few wedge providers have colliding names, but a maintenance cost.
- The previously-planned `products.billing_domains[]` column (proposed in #110 under PR #109) is demoted from M1 — it is no longer the M1 filter input. It remains relevant as future infrastructure for post-cutoff-B closed-whitelist precision and for post-CASA OAuth-managed direct ingest. The work is not lost; it shifts to Phase 2 or Beyond M2.

**Neutral:**

- Doesn't change the parser or matcher. Both already handle the heterogeneous signal classes ADR-0004 named; the filter shape affects which signals reach them, not how they are processed.
- Doesn't override ADR-0003 (no bank connection). Alternative ingestion channels (CSV onboarding backfill, welcome-email forwarding) remain orthogonal. Note the post-cutoff-B reopening pointer in §6 is a *flagged future trigger*, not an immediate change.
- Doesn't override ADR-0004 (signal classes). Class C signals are explicitly cited in this ADR as the structural reason the filter must remain name-based during the recall-first era.
- Refines but does not retire ADR-0005 §3. ADR-0005's strategic intent (system-managed forwarding rules, registry compounding, importable XML filters, future OAuth-managed installation) is preserved verbatim; only the mechanism specification is updated from "billing-domain-specific" to "name-driven with billing-domain narrowing as the post-cutoff-B state."

## Alternatives Considered

**Domain-only filter shape with `products.billing_domains[]` as the precondition.** The mechanism initially specified by PR #109. Rejected on signal-heterogeneity grounds: trial confirmations, welcome emails, and Class C silent-provider signals overwhelmingly arrive from non-billing subdomains, so a domain-only filter creates a blind spot exactly where high-value signals live. Domain-based remains the post-cutoff-B future state for closed-whitelist precision on known-clean billing senders, but as a complement to name-based catch, not a replacement.

**Precision-first filter (high-precision rule plus a small catalog).** Rejected because asymmetric failure cost (missed positive ≫ parse cost) makes recall-first dominant. The LLM is already the precision layer; sacrificing recall in the filter to "save on parse cost" trades a user-visible failure mode for a back-end cost optimization, which is the wrong direction.

**Single-cutoff evolution (one flip from "broad keywords plus names" to "names only").** Rejected as too disruptive and as denying useful intermediate evidence. The two-cutoff design lets the highest-bleed terms (`billing`, `invoice`, `receipt`) sunset on their own observation evidence before the harder decision about the SaaS-vocabulary terms (`subscription`, `renewal`, `trial`, `recurring`) is forced. Two evidence checkpoints, two reversible decisions.

**Per-pod filter exclusions instead of global.** Rejected because per-pod exclusions fork the registry-compounding effect ADR-0005 named — a personal-sub sender excluded by one user's observation should benefit all wedge users by default. Per-pod overrides remain available as a fallback if the no-bleed assumption breaks for a specific cohort, but they are not v1.

**OAuth-managed filter installation as the M1 shape (server pushes filter updates to user's Gmail via `gmail.settings.basic`).** Considered, then ruled out: `gmail.settings.basic` is a Restricted scope and shares CASA Tier 2 review with `gmail.readonly`. Once that review is being paid for, direct ingest (shape 5 in the PR #109 conversation) is a strictly more valuable product (12-month backfill on connect). Deferred to Beyond M2 per ADR-0005's framing of CASA Tier 2 work — both shapes share the same gate, and the choice between them is a Phase 2 alpha-survey question.

**LLM-suggested keyword evolution as the cutoff mechanism.** Considered — feed the LLM samples of forwarded mail and ask it to recommend keyword changes. Rejected as v1 because the per-keyword-path parser-outcome observability gives a transparent, auditable signal that an LLM-recommendation loop would not. LLM-suggested exclusion-list additions (a smaller, lower-stakes decision than keyword evolution) remain in scope as a downstream enhancement (Decision §4).
