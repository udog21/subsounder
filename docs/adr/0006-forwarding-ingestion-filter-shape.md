# ADR-0006: Forwarding ingestion architecture — trust boundary, split-filter, asymmetric delivery

- **Status:** Accepted
- **Date:** 2026-05-30 (supersedes 2026-05-29 draft under same ADR number)
- **Deciders:** Lek
- **Related:** [ADR-0003](0003-no-bank-connection-ingestion-strategy.md), [ADR-0004](0004-silent-provider-signals-classes-and-sonar-bench.md), [ADR-0005](0005-wedge-icp-modern-software-stacks.md), [docs/active/ROADMAP.md](../active/ROADMAP.md), PR #109, [#90](https://github.com/udog21/subsounder/issues/90), [#110](https://github.com/udog21/subsounder/issues/110), [#111](https://github.com/udog21/subsounder/issues/111), [#113](https://github.com/udog21/subsounder/issues/113), [#114](https://github.com/udog21/subsounder/issues/114)
- **Refines:** [ADR-0005](0005-wedge-icp-modern-software-stacks.md) §3 — replaces the "ingestion narrows from keyword-broad to provider-billing-domain-specific via importable XML Gmail filter exports" mechanism with a broader architecture covering trust boundary, filter shape, and delivery channel. ADR-0005's strategic intent (system-managed setup, registry compounding, importable filters, future OAuth-managed installation) is preserved verbatim.

## Context

The wedge ICP is fixed. [ADR-0005](0005-wedge-icp-modern-software-stacks.md) named it: tool-stack operators on modern SaaS — Tier 1 AI-native solo operators, Tier 1.5 makers, Tier 2 media creators. They scrutinize permissions, audit code, and pattern-match invasive scopes to risk. The ingestion architecture has to be defensible to that audience or the wedge bounces at the onboarding step.

The mechanism is also fixed. [ADR-0003](0003-no-bank-connection-ingestion-strategy.md) ruled out bank-connection ingestion. [ADR-0004](0004-silent-provider-signals-classes-and-sonar-bench.md) named the signal classes (A billing, B identity+cadence, C silent-provider welcome/ToS/anniversary) the parser needs to catch. Together those pin a forwarding-based ingestion path: users forward subscription mail to a pod-specific alias and SubSounder parses what arrives.

The open question this ADR answers: **given the wedge ICP and the forwarding mechanism, how should the ingestion be architected?** Three sub-questions, each independent, each shaping the others:

1. **Trust boundary** — how much access does SubSounder ask for? Forwarding (narrow-or-zero mailbox access), browser extension (mailbox-write during setup), or OAuth direct inbox read (full mail read)?
2. **Filter shape** — what mail does the user's forwarding rule actually catch? Provider names? Generic keywords? Which keywords?
3. **Delivery channel** — how does the rule get installed in the user's mail provider? Server-rendered XML import, OAuth-managed push, browser-extension automation, or manual?

This document answers all three.

## Decision

### 1. Trust boundary — forwarding, not extension, not direct read

Forwarding-based ingestion is dominant for the wedge ICP across the three positions on the trust spectrum:

- **Forwarding-based ingestion** (chosen). Narrowest technical posture on the spectrum. On Gmail, SubSounder has zero mailbox access — we receive only what the user's forwarding rule sends, and the rule itself is opaque to us. On Outlook, OAuth via Microsoft Graph grants `MailboxSettings.ReadWrite` — narrow programmatic access to inbox rules, auto-reply, time zone, and other mailbox-settings surfaces, with no message-content read. The trade-off across both channels is the most-invasive *perceived* posture: forwarding feels active ("I'm sending them my email") in a way server-side scanning does not ("they're reading what's there"). Perceived-invasiveness is mitigated by the alias being user-owned, the data flow being one-way (SubSounder never writes back to the user's inbox), and the user being able to revoke at any time — by removing the forward rule on Gmail, or revoking the OAuth grant on Outlook.

- **Browser extension with mailbox write access**. Mid technical posture (extension carries read/modify scope on mail-domain hosts during setup, even if used write-only). Familiar perceived posture for some segments. Trade-off goes the other way — broader technical access in exchange for a more-familiar setup gesture. Trust composition (open-source, read-nothing, use-once-and-uninstall) is achievable but the wedge ICP either audits the code and accepts, or pattern-matches "Chrome extension wanting Gmail" to risk and bails. Reserved as a Beyond-M1 option (see Alternatives).

- **OAuth direct inbox read** (CASA Tier 2 for Gmail, M365 App Certification at scale for Outlook). Worst technical posture (full mail read). Most-familiar perceived posture — users have granted this scope to many apps. Best for product capability (12-month backfill on connect). Deferred to Beyond M2 once paid base justifies the review cost.

For the wedge — engineers and operators who scrutinize permissions — forwarding's narrow technical posture is what makes the trust ask defensible. Crossing trust boundaries is reserved for downstream stages where the capability gain has been validated against the larger trust ask.

### 2. Filter architecture — split-filter (detection + discovery)

The forwarding filter does two structurally different jobs, and the architecture splits them rather than pooling them:

- **Detection filter** — catches mail from *known* providers when the user has an active subscription. Driven by provider names (and aliases) from the `products` registry. High volume. Precision via the downstream matcher (resolves to known subscriptions; dedups by `dedupe_key`).
- **Discovery filter** — surfaces mail from *unknown* providers, just enough to add them to the registry. Driven by a small SaaS-vocabulary keyword set. Low volume. Precision via dogfood review and registry expansion.

Pooling them as a single filter would conflate two structurally different jobs: discovery noise pollutes detection metrics; broad terms waste matcher effort on receipts that should have been name-matched; cutoff-narrowing decisions can't be reasoned about per channel. Splitting makes each channel's purpose legible at the rule level and the cutoff story (§8) cleaner.

**Observability is content-side, not filter-side.** Channel attribution is inferred at parser time from the inbound mail content against the current registry — did this mail come from a provider on the detection list, or only match the discovery vocabulary? Inference works on what arrived, not on metadata embedded by the rule, which makes it robust to filter-state opacity and user mutation (§7). Telemetry for the §8 cutoff and the §5 exclusion-list growth uses content-side signals plus catalog-source distribution, not filter metadata.

### 3. Generic-term set — SaaS vocabulary only

The discovery filter's generic terms: `subscription`, `renewal`, `trial`, `recurring`.

Explicitly excluded from day one: `billing`, `invoice`, `receipt`. The excluded terms are dominated by commerce mail for the wedge ICP — Shopify orders, Etsy purchases, Amazon shipping confirmations, conference tickets, cloud-usage notices, hardware orders, B2B receipts. For this user base the false-positive volume would drown the useful subscription signals at three levels: parser cost (smallest concern), onboarding perception (a user reviewing what's been forwarded should see plausible subscription mail, not their last Etsy order), and signal-to-noise of any review surface downstream.

The position is start narrow by design; expand on evidence only if dogfood shows we're missing subscription signals because billing/invoice/receipt was the only catch path. Burden of proof on inclusion, not exclusion.

### 4. Provider names — registry-derived, collider-aware

The detection filter's provider list is derived server-side from the `products` registry. Implementation specifics (which column drives the filter list, the gating mechanism for common-word colliders like `Apple` / `Linear` / `Notion`) are deferred to the implementation issue (#111).

Open schema question: should the registry compile filter terms at the **provider** level (`Adobe`, `Google`) or **product** level (`Photoshop`, `Lightroom`, `Acrobat`)? Provider-level catches all Adobe mail whether the user has Photoshop or not — over-recalls in a way the matcher dedups but feels noisier to the user. Product-level is more precise but costs filter-budget faster. The answer may differ per channel (detection vs discovery). Tracked at [#114](https://github.com/udog21/subsounder/issues/114).

### 5. Exclusion list — global, registry-maintained, observability-driven

False-positive senders observed during dogfood and alpha feed a global, pod-agnostic exclusion list. Exclusions compound across pods via the registry — a personal-sub sender excluded by one user's observation benefits all wedge users.

**Granularity caveat**: a blanket `-from:X` exclusion silently drops *all* mail from that sender, including useful signals from senders with mixed streams (a provider that sends both personal-purchase receipts and subscription renewal notices). Exclusions may need to grow finer than blanket sender filters — `from:X AND subject:Y` patterns, or per-class exclusions wired to observed parser outcomes. The exact granularity model is deferred to the implementation layer, but the constraint is recorded here so the simple-sender exclusion design doesn't accumulate invisible false negatives.

Storage shape (table, JSON column, seed file), maintenance discipline, and LLM-suggested-candidate review surface deferred to implementation.

### 6. Delivery channel — asymmetric: Gmail XML, Outlook OAuth via Graph

Delivery mechanisms are not symmetric across mail providers:

- **Gmail** exposes a documented user-importable filter file (`filters.xml` via Settings → Filters → Import). One-action import, no OAuth, no installed software, no Google verification gate at our scale (the import flow is user-side, not API-mediated). Chosen for Gmail delivery.
- **Modern Outlook** (outlook.com, outlook.office.com, M365 OWA) has no equivalent user-importable rule file format. Desktop Outlook supports `.rwz` (proprietary binary; the wedge audience is on web/OWA). The only programmatic install path is Microsoft Graph `messageRules`, scope `MailboxSettings.ReadWrite` (verified narrow: no message-content read implied, no folder access, only mailbox-settings read/write). Chosen for Outlook delivery.

Asymmetric delivery is dominant over the alternatives (see Alternatives Considered):

- *Symmetric XML import for both*: impossible — Outlook has no such format.
- *Symmetric OAuth for both* (Gmail OAuth via `gmail.settings.basic` + Outlook Graph): Gmail OAuth is CASA Tier 2 gated; once that review is being paid for, direct ingest (Beyond M2) is strictly more valuable than filter-managed forwarding.
- *Symmetric manual rule instructions*: Outlook's field-by-field rule UI plus single-line input for term lists makes copy-paste construction of a recall-first ruleset high-friction at the onboarding step. Acceptable as a dogfood stopgap, not a product surface.

**Outlook delivery requires Microsoft Publisher Verification before alpha invites.** Risk-based step-up consent (Microsoft Entra, enabled by default on increasing share of work/school tenants) blocks unverified apps for scopes beyond basic sign-in, and `MailboxSettings.ReadWrite` qualifies. Publisher Verification is free, ~1 week wall-clock realistic, 2-3 weeks worst-case on Microsoft's CPP queue. Pre-alpha gate. Founder dogfood with personal MSA accounts (outlook.com) can proceed unverified (the warning appears but doesn't block consent).

### 7. Filter state and user mutations

Filter state is opaque to SubSounder on Gmail and partially observable on Outlook. After we render Gmail's `filters.xml` and the user imports it, we never see what's installed — Gmail provides no API surface for SubSounder to inspect or modify the user's filter rules. On Outlook the Graph `MailboxSettings.ReadWrite` scope grants read/write authority over inbox rules, so we can list, update, and delete rules we installed (and, in principle, any other rule — narrowness is enforced by our usage discipline, not by the scope).

**Drift management follows directly from this asymmetry:**

- **Gmail** — stale-tolerant. We render fresh XML on demand and prompt to re-import after material registry changes. Gmail's import is append-only — re-importing does not replace old rules — so stale ones accumulate and the user manages cleanup. Rule-name markers (e.g. `[SubSounder]`) help the user identify and remove SubSounder rules in their settings UI.
- **Outlook** — actively reconciled. When the registry changes materially we re-push via Graph: identify our existing rules by marker, remove or update them, install the fresh set. No user-side cleanup needed.

**User-initiated mutations are an accepted property of the system, not a failure mode.** The user owns their mailbox. They may delete one of our rules, edit its terms, add exceptions, or build their own forwarding rule to the alias.

- On **Gmail** the mutation is undetectable from our side. If a rule's been deleted or narrowed, we just see fewer signals; graceful degradation. Content-side telemetry (§2) may flag "this provider's catch rate dropped" but cannot tell us why; recovery is user-side.
- On **Outlook** the mutation is detectable via Graph. The reconciliation policy is to **surface, not overwrite** — if our installed rule has been edited or deleted, we notify the user and offer to restore, but we do not silently revert their changes. Silent reconciliation would be the kind of paternalism the wedge ICP rejects.

Because filter state is unreliable as a substrate, all evidence-triggered decisions (§5 exclusion-list growth, §8 cutoff) work from content-side signals — inbound mail content against the current registry, plus catalog-source distribution — rather than from filter metadata. The system is observably correct on what arrives, not on what the filter ought to have caught.

### 8. Cutoff evolution — one cutoff, and it's a category shift

The discovery filter narrows on evidence: when registry coverage and user-initiated paths (manual forward of first receipt, in-app catalog edits) dominate new-provider discovery, the discovery filter's generic terms are dropped entirely. The detection filter persists; new providers enter the catalog only via explicit user action or via SubSounder adding them to the registry.

**Crossing this cutoff is a category shift, not a precision refinement.** Pre-cutoff the product is "we discover what you have." Post-cutoff the product is "you tell us what you have and we watch it." That changes the magic-moment, the onboarding promise, the marketing copy, and the relationship between catalog completeness and user agency. Future product decisions should re-evaluate against the new category — not assume the old one carries through.

The cutoff is evidence-triggered and reversible (re-add the generic terms if a measurable problem emerges). Trigger mechanism: content-side channel inference (§2) on inbound mail, combined with catalog-source distribution — e.g., "of net-new subscriptions added in the last N weeks, X% came from providers already on the detection list, only Y% came from discovery-only matches." When discovery-only matches no longer produce net-new providers worth their noise, the discovery filter sunsets. Threshold numbers deferred to the implementation issue; the mechanism (content-side, not filter-metadata) is pinned.

### 9. Tenant-policy ceiling — accepted

Microsoft 365 work tenants can disable external auto-forwarding at the tenant-policy level. Where disabled, the Graph-installed rule is created but the forward action doesn't fire. SubSounder's served population is explicitly scoped to: users with personal mail accounts, or with self-managed work accounts (the user is the tenant admin, or the tenant policy allows external forwarding). Locked-down enterprise inboxes are outside the served population.

This is consistent with the ADR-0005 wedge — operators on modern stacks tend to control their own org or use personal accounts for personal SaaS spend. **Marketing implication**: landing-page copy is explicit about scope ("Works with personal Gmail and Outlook, or self-managed work accounts. Not designed for locked-down enterprise inboxes"). This filters out the segment we couldn't serve anyway and preserves trust with the segment we do.

### 10. Out-of-catalog provider workflow (post-cutoff)

Once the discovery filter is sunset (§8), a user signing up for a tool not yet in the registry has three paths:

- **Manual forward** of the first receipt — the parser still processes any received mail; this is the implicit path.
- **In-app card creation** — currently rejected by [ADR-0003](0003-no-bank-connection-ingestion-strategy.md) on the grounds that manual-add defeats the helper purpose during the discovery era. The post-cutoff state shifts the product from passive-detect to active-curate, which materially changes the premise of that rejection. Reopening ADR-0003's manual-add exclusion is recorded here as a follow-up decision triggered by the cutoff, not pre-judged in this ADR.
- **Wait** for SubSounder to add the provider to the global registry via dogfood discovery, public-registry contribution, or alpha/beta user reports.

Picking a default UX is deferred to the cutoff implementation moment. The option set is recorded here so it is not relitigated as a fresh question later.

## Consequences

**Positive:**

- Trust boundary is the narrowest of the three options on the technical-access axis. Aligned with the wedge ICP's audit-and-uninstall expectations and consistent with ADR-0005 §3's "system-managed, user-controllable" intent. The trust framing is honest about asymmetry: zero mailbox access on Gmail, narrow mailbox-settings access on Outlook.
- Split-filter architecture decouples two structurally different jobs (detection, discovery). Each evolves independently; cutoff decisions are reasoned about per channel; the discovery-channel sunset is a single legible move.
- Dropping `billing`/`invoice`/`receipt` from day one preempts the dominant false-positive class (commerce mail) for the wedge ICP. Recall-first is preserved on the dimensions where it matters (SaaS vocabulary in discovery, provider names in detection).
- Asymmetric delivery follows the trust boundary cleanly. Each mail provider's narrowest install path is used; no design is compromised by the other.
- Microsoft Publisher Verification (CPP track) is free and faster than Gmail's CASA Tier 2; unlocks Outlook ingestion under a genuinely narrow scope (`MailboxSettings.ReadWrite`, verified against MS Graph docs to be the minimum-privileged permission for `messageRules`).
- Marketing posture is honest: "personal accounts and self-managed work accounts" filters the unservable segment up front, preserving trust with the segment we serve.
- Observability is content-side (§2, §7), robust to filter-state opacity and user mutation. Cutoff and exclusion-list decisions work on what arrives, not on what the filter ought to have caught — which is the only honest substrate given that Gmail filter state is opaque to us and both channels permit user mutation.

**Negative:**

- Two filter rules per user on Gmail plus an OAuth flow on Outlook. Setup is slightly longer than a single-rule design — but each rule has a single coherent job, which helps user comprehension during setup.
- Microsoft Publisher Verification is wall-clock-bound on Microsoft's review queue. Single point of dependency that can extend by weeks if Microsoft requests additional documentation. Pre-alpha critical path.
- The cutoff framing has collapsed to a single sunset event. If evidence later suggests finer steps (drop one generic term but not all), the framework will need to re-decompose.
- The cutoff is a category shift, not a precision tweak. Future product positioning must re-evaluate against the new category at trigger time. Underestimating this is the most expensive future mistake the ADR is structured to prevent.
- Tenant-locked users (locked-down enterprise inboxes) are explicitly outside the served population. Smaller addressable market than a bank-connection or extension-based design — but consistent with the ADR-0005 wedge.
- Filter-state opacity on Gmail means we cannot detect user mutation; if a user deletes or narrows our rule we just see reduced inbound signal, and the recovery path is user-side. Content-side telemetry can flag the symptom but not the cause.
- Discovery-filter granularity question (provider-level vs product-level compilation) is acknowledged but unresolved. Tracked at [#114](https://github.com/udog21/subsounder/issues/114).
- The Gmail XML filter has practical length limits (community-cited ~1500 chars per rule; ~2500-4000 sometimes accepted on import); the split-filter design plus multi-rule splitting within the XML keeps this from being a binding constraint at plausible registry sizes, but it is a constraint to keep in view as the registry grows.

**Neutral:**

- Parser and matcher unchanged. Filter architecture affects which signals reach them, not how they process.
- Doesn't override [ADR-0003](0003-no-bank-connection-ingestion-strategy.md) (no bank connection) or [ADR-0004](0004-silent-provider-signals-classes-and-sonar-bench.md) (signal classes). The post-cutoff workflow flag for reopening ADR-0003's manual-add exclusion remains a flagged future trigger, not an immediate change.
- Refines [ADR-0005](0005-wedge-icp-modern-software-stacks.md) §3. The strategic intent (system-managed forwarding, registry compounding, importable filters, future OAuth-managed installation) is preserved verbatim; the mechanism specification is updated from "name-based with billing-domain narrowing as the post-cutoff-B state" to "split-filter (detection + discovery) with asymmetric delivery (Gmail XML, Outlook Graph OAuth)."

## Alternatives Considered

**Single-filter design with provider names plus broad generic terms.** Rejected on conflation grounds (§2): detection and discovery are structurally different jobs with different volume profiles and precision needs. Pooling them obscures the cutoff narrative and degrades both signals. Split-filter cleanly addresses this.

**Including `billing`, `invoice`, `receipt` in the discovery filter.** Rejected on §3 grounds: commerce-mail volume for the wedge ICP would drown subscription signals — not just at parser-cost level but at user-perception level (forwarding rule feels invasive when its catches are mostly unrelated commerce mail). Re-adding on evidence is straightforward; pruning under noise is harder.

**Per-filter forwarded-mail attribution as the observability substrate.** Considered as a way to track which rule caught which mail, with version markers on rules supporting cutoff evidence accumulation over time. Rejected because filter state is opaque on Gmail (we can't verify what's installed) and mutable by the user on both channels — building telemetry on filter-side metadata would be elaborate scaffolding over genuinely unreliable signal. Content-side channel inference (§2) replaces it: more honest, more robust, simpler.

**Symmetric XML-download-and-import for Gmail and Outlook.** Implicit in PR #109's framing. Rejected: modern Outlook has no equivalent user-importable rule format. `filters.xml` is Gmail-specific. Treating them as parallel constrains the Gmail design against an Outlook limitation that has no actual mechanism behind it.

**Symmetric OAuth for both platforms (`gmail.settings.basic` + Microsoft Graph).** `gmail.settings.basic` is CASA Tier 2 gated. Once that review is being paid for, direct ingest via `gmail.readonly` + Pub/Sub watch (12-month backfill on connect) is strictly more valuable than OAuth-managed filter installation. Deferred to Beyond M2 per ADR-0005's framing of CASA Tier 2 work.

**Manual rule instructions for both platforms (copy-paste from server-rendered guides).** Acceptable for dogfood as a temporary stopgap before Microsoft Publisher Verification lands. Rejected as a launch product surface: Outlook's field-by-field rule UI plus single-line input for term lists makes copy-paste construction of a recall-first ruleset high-friction at exactly the onboarding step where new-user trust is most fragile.

**Browser extension covering both platforms (max-transparency composition: open source, read-nothing write-only, use-once-and-uninstall, MV3 optional-host-permissions).** Cross-platform UX is appealing. Rejected on three grounds: (a) trust posture (broad `host_permissions` on mail domains) is less defensible than forwarding's narrow technical posture for the wedge ICP, even with full transparency mitigations; (b) fragility against Gmail/Outlook web UI redesigns, plus Web Store review lag on each release; (c) engineering and maintenance burden disproportionate to the alternative (Microsoft Graph + Gmail XML). Reserved as a Beyond-M1 option if alpha telemetry reveals OAuth-revocation as a real failure mode, or if mobile-onboarding coverage becomes meaningful for the ICP.

**Silent server-side reconciliation of user-edited Outlook rules.** Considered as the Outlook drift-management policy: when Graph reads back a SubSounder rule whose terms have been mutated by the user, silently overwrite to restore canonical. Rejected on §7 grounds: silent overwrite of user-edited rules is the kind of paternalism the wedge ICP rejects; mutations are an accepted system property, not a failure mode. The policy is surface-and-offer-restore, not silent-reconcile.

**Per-pod filter exclusions instead of global.** Rejected: forks the registry-compounding effect ADR-0005 named. A personal-sub sender excluded by one user's observation should benefit all wedge users by default. Per-pod overrides remain available as a fallback at the margin.

**LLM-suggested keyword evolution as the cutoff mechanism.** Content-side channel inference (§2, §7-8) gives a transparent, auditable signal that an LLM-recommendation loop would not. LLM-suggested exclusion-list additions (a smaller, lower-stakes decision than keyword evolution) remain in scope as a downstream enhancement (§5).

**Domain-only filter shape with `products.billing_domains[]` as the precondition (PR #109's original mechanism).** Rejected on signal-heterogeneity grounds: trial confirmations, welcome emails, and Class C silent-provider signals overwhelmingly arrive from non-billing subdomains. Domain-based remains relevant as future infrastructure for post-cutoff closed-whitelist precision and for post-CASA OAuth-managed direct ingest. The work is not lost; it shifts to Phase 2 or Beyond M2.
