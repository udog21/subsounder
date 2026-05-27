# ADR-0003: No-bank-connection ingestion — email forwarding + onboarding CSV backfill

- **Status:** Accepted
- **Date:** 2026-05-27
- **Deciders:** Lek
- **Related:** [docs/market-and-positioning.md](../market-and-positioning.md), [docs/active/ROADMAP.md](../active/ROADMAP.md)
- **Retires:** open-questions.md Q1 ("What recurring services is this app for?")

## Context

SubSounder's original framing — "AI parses subscription emails" — assumed that subscription providers reliably email receipts. Backfilling a real personal catalog from bank statements revealed the assumption is wrong for the most common consumer subscriptions (Netflix, Spotify, Adobe, Trupanion, most streaming/insurance/membership providers). These "silent providers" charge with no per-cycle email. They may send a welcome at signup, an annual statement, a TOS update, or a legally-required price-change notice — but no routine receipt.

Without an answer for the silent half, the product's "complete catalog of recurring spend" promise (per [ROADMAP](../active/ROADMAP.md) product principles) is unreachable, and the M1 Gate is at risk: alpha invitees whose catalogs are missing the most-recognizable subs will conclude the product is broken.

Three forks were considered:

1. **Narrow the promise** to "subs that email you" — accept that Netflix-class providers don't appear in the catalog.
2. **Email + ongoing bank/CSV connection** — add a recurring ingestion channel from bank/CC statements for silent providers.
3. **Email + one-time CSV backfill at onboarding + provider-side intelligence for silent updates** — keep email as the primary ongoing channel, seed legacy depth with CSV at signup, use the `products` table to track silent-provider price/plan changes.

[market-and-positioning.md](../market-and-positioning.md) argues that fork 3 is the only one that (a) keeps the catalog promise honest, (b) doesn't push SubSounder into Rocket Money's lane, and (c) preserves the privacy positioning that defines the addressable segment.

## Decision

**Ingestion model:**

1. **One-time CSV backfill at onboarding.** User uploads a bank/CC CSV. Third-party PDF→CSV converters cover format conversion upstream of SubSounder; the app parses standardized CSV column shapes only. SubSounder identifies recurring charges, matches against the `products` table, and creates subscription rows with amount, cadence, and the most recent observed charge. Backfill is *seeding*, not an ongoing channel — the user is not expected to upload regularly.
2. **Email forwarding as the primary ongoing channel.** Receipts (transactional providers), welcomes (new subs of any provider class), price-change notices, TOS updates, anniversary mails. The forwarding model is unchanged from MVP.
3. **Inline edit affordance for missing financials.** When an email gives merchant identity but not amount or period (common for silent-provider welcome emails), the user fills in two fields on an agent-created row. The agent never asks "what is this subscription?", only "what's the amount?" — a different friction class from manual-add. Issue [#6](https://github.com/udog21/subsounder/issues/6) (Edit subscription) covers the UI surface.
4. **Provider-side intelligence for silent updates.** Price changes, plan tier shifts, and cancellation difficulty are maintained in the `products` table (via the enrichment cron and forwarded price-change notices from any user). The catalog surfaces stale-amount suggestions ("Netflix raised prices on 2026-03-15; your row may be stale — confirm?") without any per-user transaction visibility.

**What this rules out:**

- **Live bank/card API connection** (Plaid, Teller, MX). Different product class, competes with Rocket Money, violates the privacy positioning of the addressable segment. The existing ROADMAP exclusion is reaffirmed by this ADR.
- **Recurring CSV uploads as a required channel.** UX-equivalent to bank-connection at higher friction. The friction gradient pushes users either to abandon the upload habit (catalog goes stale) or to demand a live connection (product drifts toward Rocket Money). Neither serves the segment.
- **Manual "Add subscription" from scratch.** Defeats the helper purpose; a user willing to type subs in by hand can use a spreadsheet. The inline edit affordance is the carefully-scoped exception (agent does identity, user fills financials).
- **"Common subs you might have" picker** at onboarding. Same reasoning as manual-add — the agent should derive identity from real signals, not solicit a checklist.

**What stays open for later:**

- **Optional CSV reupload** for spend-analytics (year-over-year baselines, "subscriptions were X% of your spending last year"). Not required for the catalog to stay current; deferred until the spend-analytics surface exists.
- **Gmail OAuth bulk-scan** at signup — beyond M2, CASA Tier 2 gated. Doesn't solve the silent-provider problem regardless (silent providers don't email).
- **Browser-extension forwarder** for capturing welcome flows at point-of-subscribe — beyond M2.

## Consequences

**Positive:**
- Catalog completeness becomes achievable: CSV backfill captures legacy silent-provider subs; email forwarding captures new ones; provider-side data keeps known subs current on price/plan changes.
- "No bank, no inbox" privacy positioning stays intact and becomes the segment's defining feature, not a corner-case asterisk.
- M1 Gate becomes credibly achievable for alpha testers whose sub mix includes silent providers — i.e. essentially all real users.
- LLM extraction quality and cancellation intel — SubSounder's two real moats — remain core to the product loop rather than getting diluted by a bank-statement channel that doesn't need them.
- Welcome-email forwarding becomes a routine user habit, which incidentally also seeds new merchants in `products` for the registry/enrichment pipeline.

**Negative:**
- Backfill UX is new surface area. CSV format variation across banks/CC issuers is non-trivial; the dogfood/alpha approach is to lean on third-party PDF→CSV tools upstream and parse only standardized CSV column shapes, deferring a full CSV extractor until market is proven.
- Silent providers that go fully email-silent for years (no TOS update, no price change, no anniversary mail) will hold stale amount data in the catalog. Provider-side price tracking via `products` mitigates but does not eliminate this; remaining drift is accepted error.
- Users without forwarded welcome emails will see new silent-provider subs enter the catalog only at the next email trace (which could be months). Onboarding-CSV closes the *legacy* gap but does not close the *post-onboarding silent-provider* gap.
- Inline financial enrichment is a small user task — distinct from manual-add, but still a small friction point that the product needs to make pleasant in the catalog UI.

**Neutral:**
- Doesn't change the existing email-parser or matcher behavior. Both work as designed for transactional providers and for whatever welcome/price-change/TOS emails silent providers do send.
- Doesn't preclude future re-evaluation if the segment hypothesis ([market-and-positioning.md](../market-and-positioning.md)) doesn't hold. The bank-connection exclusion is a positioning choice grounded in segment definition, not an architectural lock-in.

## Alternatives Considered

**Narrow the promise to email-emitting subs only.** Honest but small — drops Netflix-class subs from the catalog entirely. The user-profile doc argues the segment that would accept this is too narrow to sustain the product, since the most valuable subs to track (high-cost, easy-to-forget, hard-to-cancel streaming/insurance) are exactly the silent ones.

**Recurring CSV upload as a primary ongoing channel.** UX-equivalent to live-bank-connection at higher friction. Either the user gives up on routine uploads (catalog goes stale) or demands a live connection (product evolves into Rocket Money). Neither outcome serves the segment this product is for.

**Live bank-connection (Plaid/Teller/MX).** Excluded by existing ROADMAP as a different product class. This ADR reaffirms the exclusion. SubSounder's structural advantages (LLM identity extraction, cancellation intel, agentic future) don't depend on bank data; bank data dilutes the privacy positioning without unlocking proportionate value.

**Manual "Add subscription" from scratch + common-subs picker.** Quickest unblock but defeats the helper premise. A user willing to manually type in subscriptions can use a spreadsheet; SubSounder's job is to derive identity from real signals. The inline-edit-financials path is the carefully-scoped exception that keeps the agent doing identity work and only delegates the dollar number.

**Gmail OAuth bulk-scan as the seeding mechanism.** Solves a different problem (legacy *email-emitting* subs) and is CASA Tier 2 gated. Doesn't help with silent providers, which is the actual gap. Parked beyond M2 regardless.
