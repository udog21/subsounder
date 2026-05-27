# Market & Positioning — SubSounder

_Last updated: 2026-05-27. Supersedes the former `competitive-analysis.md`._

This doc answers two questions in order: **who is SubSounder for**, and **given that audience, how does SubSounder differ from other tools in the recurring-spend-tracking space**. The user profile motivates the competitive framing — not the other way around. Implementation plans (cancellation-intel pipeline mechanics, CASA Tier 2 process, etc.) live in [ROADMAP](active/ROADMAP.md) and the issues underneath it; they don't live here.

## Why this doc exists

The product was originally framed as "AI parses subscription emails." Backfilling a real personal catalog from bank statements revealed the assumption underneath that framing is wrong for the most common consumer subscriptions. Netflix, Spotify, Adobe, Trupanion, and most streaming/insurance/membership providers charge silently. They have a structural disincentive to remind users they're paying, since receipt emails create unsubscribe friction.

That partition (transactional providers vs. silent providers) reshapes who the product can serve and how. The architectural decision that follows — how ingestion handles both classes of provider — is recorded in [ADR-0003](adr/0003-no-bank-connection-ingestion-strategy.md).

## The provider partition

**Transactional providers** (Stripe-style)
- Send a receipt for every charge, often before and after the cycle.
- B2B SaaS, app-store purchases, payment aggregators (Stripe, Paddle, Apple, Google Play, Samsung Checkout), domain registrars, one-off prosumer SaaS.
- Email is rich: amount, period, sometimes plan tier and cancel link.

**Silent providers** (Netflix-style)
- Charge with no per-cycle email. May send a welcome at signup, an annual statement, a TOS update, or a legally-required price-change notice — but no routine receipt.
- B2C streaming (Netflix, Disney+, Spotify), software with auto-renewing seats (Adobe Creative Cloud), insurance (Trupanion), most memberships and subscriptions sold as "ongoing relationships."
- Email is sparse: identity yes, financial state no.

This is not a rare edge case. In a typical household catalog, the silent group includes most of the largest, most-forgotten subscriptions — which are also the ones renewal reminders are most valuable for. The product wants them most and emails reach them least.

## Primary user profile

SubSounder's user is best described by what they want from a subscription tool and what they explicitly *won't* do to get it.

**Wants:**
- A complete catalog of recurring spend, not a probabilistic list.
- Warning *before* charges hit, not categorization *after*.
- Specific, actionable next steps (this is hard to cancel; this is easy; here's the URL).
- A tool that knows what Netflix Family means, not one that just says "NTFLX 1234."

**Will not:**
- Connect a bank account or credit card.
- Hand over read access to their email inbox.
- Spend their evenings manually entering subscriptions into a spreadsheet.

This combination — wants depth and proactivity, won't trade away financial-account access — defines the segment. It's narrower than "anyone who has subscriptions," and it's what makes a subscription-specific tool defensible against bank-connected personal finance apps.

## Who SubSounder is *not* for

- **Users who'd connect a bank account if it meant the catalog filled itself.** Rocket Money serves them better. This is most of the personal-finance-app audience.
- **Users who want a single-pane-of-glass for all recurring expenses including utilities, HOA, leases, insurance auto-debits.** That's a personal-finance-app problem and requires the bank-connection model SubSounder rejects.
- **Users tracking 1–3 subscriptions.** A calendar reminder is enough; no app needed.
- **Households with one shared subscription account where someone else handles billing.** No forwarded emails means no signal.

The first two — bank-connection-willing and all-recurring-expenses-tracker — are the largest cohorts in this space. We deliberately don't compete for them.

## What SubSounder does for this user (value proposition)

Independent of who else is in the market, SubSounder:

- **Knows what you're paying for, not just that you're paying.** Plan tier, trial vs. paid, Apple bundle decomposition, distinguishing co-provider products (Photoshop vs Lightroom under Adobe; multiple domains under one registrar). Identity precision comes from email content, not a statement line.
- **Warns before the charge, not after.** Pre-renewal reminders from observed cadence. Trial `cancel_by_at` extracted from welcome emails, so the user catches the cancel window — not the surprise charge.
- **Tells you how to act, not just what you have.** Each catalog row carries the cancellation URL, a difficulty rating, and the steps to follow. Future agent capabilities (auto-cancel, cancel-by-agent) build on the same data.
- **Keeps silent-provider amounts current via pooled product knowledge.** One user forwards a Disney+ price-change notice; every user with Disney+ benefits via shared `products` data. The catalog stays honest without per-user transaction visibility.
- **Respects user-defined trust scope.** The user controls what we see by choosing what to forward. No inbox OAuth, no bank credentials, no read access to broader financial history.

## Segment hypothesis (to test)

The bet:

> There is a meaningful population of recurring-spend-aware users who would rather forward subscription emails than connect a bank, and who today have no good tool because manual-entry apps (Vexly) are too high-friction and bank-connected apps (Rocket Money) require trust they won't give.

What "meaningful" needs to mean for SubSounder to be worth building:

- Large enough to sustain free + paid tiers at usable acquisition cost.
- Persistent — privacy preferences don't evaporate when a new feature ships elsewhere.
- Reachable — there are search queries, communities, or content surfaces that find them.

The alpha (M1 → M2) is the first real test:
- Whether alpha invitees stay engaged after the first forwarded email.
- Whether the cancellation-intel content (registry pages) attracts the right traffic.
- Whether "no bank connection" shows up in spontaneous user feedback as a positive vs. an indifferent feature.

If the segment turns out smaller than hoped, SubSounder's options are to either (a) narrow further into a niche/premium positioning, or (b) reopen the bank-connection exclusion. This doc's job is to make that "or" visible, not to pretend it's already decided.

## Competitive landscape

### Competitors at a glance

| | Subkai | Vexly | Feenko | Rocket Money | **SubSounder** |
|---|---|---|---|---|---|
| **Discovery method** | Gmail OAuth scan | Manual only | Bank sync | Bank sync | Email forwarding + CSV backfill |
| **Auto-discovery** | Yes (Gmail only) | No | Yes (bank only) | Yes (bank only) | Yes (any email provider) |
| **AI parsing** | Detection only | Entry assist | Unknown | Unknown | Deep extraction (amount, plan tier, cancel URL, difficulty) |
| **Cancellation intel** | No | No | Basic instructions | Human concierge (Premium) | Cancel URL + difficulty + steps |
| **Renewal reminders** | Yes | Yes | Unknown | Yes | Yes (pre-renewal, from cadence) |
| **Spend analytics** | Basic | Strong | Basic | Strong | Planned (Beyond M2) |
| **Free trial tracking** | No | Yes | No | No | Planned (Phase 2 / M1) |
| **Bank connection** | No | No | Yes (required) | Yes (required) | No |
| **Inbox access** | Yes (read-only OAuth) | No | No | No | No |
| **Multi-currency** | No | Yes | No | No | Planned (Phase 2 / M1) |
| **Family sharing** | No | Yes | No | Yes | Planned (Beyond M2) |
| **Pricing** | Free | $0 / $24yr / $39 lifetime | Unknown | Free + Premium tier | TBD |
| **User scale** | ~2,000 | Early adopter | Unknown | 10M+ members | Dogfood (M0) |

### Player profiles

#### Subkai ([subkai.com](https://subkai.com))
- Free, no credit card, no auto-renewing trial.
- Google CASA Tier 2 certified read-only Gmail OAuth — scans inbox for recurring charges automatically. Stores only email IDs, not content; end-to-end encryption.
- ~2,000 users; claims $200+ in monthly savings identified per user.
- **Weakness:** Gmail-only; inbox-access trust ask many users won't grant; detection-only (no cancellation guidance, no plan/cycle nuance).

#### Vexly ([vexly.app](https://vexly.app))
- Manual entry only; AI assists with quick data input.
- Free tier: 3 subscriptions max. Paid: $24/year or $39 lifetime (50% early-adopter discount in effect).
- Duplicate detection, free-trial countdown, family sharing, multi-currency.
- **Weakness:** No auto-discovery at all; catalog only ever as complete as the user's manual effort.

#### Feenko ([feenko.com](https://feenko.com))
- Bank sync required for discovery — same trust barrier as Mint/Rocket Money.
- Provides basic cancellation instructions for identified subscriptions.
- **Weakness:** Bank connection is a deal-breaker for the privacy-skeptical segment.

#### Rocket Money ([rocketmoney.com](https://rocketmoney.com))
- Dominant player, 10M+ members, $2.5B in claimed member savings.
- Bank sync + human concierge for cancellations and bill negotiation (Premium).
- Positioned as Mint replacement; broad personal-finance tool, not subscription-focused.
- **Weakness:** Overkill for subscription-only use case; bank access required; merchant identification limited to statement-line matching (no plan/cycle/trial nuance).

## How SubSounder differentiates

One-line positioning: *Automatic like Subkai, private like Vexly, actionable like Rocket Money — without giving up your inbox or bank.*

### vs. bank-connected personal-finance apps (Rocket Money, Feenko)

- **Identity precision.** Email content beats statement-line merchant matching. We know it's Netflix *Family*, not just "NTFLX 1234." They can't disambiguate without diving into each merchant's account.
- **Network-effect provider knowledge.** Forwarded price-change notices, cancellation procedures, and difficulty ratings derived once benefit every user with that product. Bank apps derive equivalent intelligence per-user from statement diffs — noisier and doesn't pool.
- **Privacy positioning.** They explicitly require what the SubSounder segment refuses to give.
- **Cancellation intel is a defensible moat.** Provider URLs, difficulty ratings, and step-by-step instructions accumulate in `products` over time. Bank apps can't credibly publish this surface because cancellation knowledge is incidental to their model, not core. The public face of the moat is [`subscriptionregistry.org`](https://subscriptionregistry.org), which also serves as SEO for "how to cancel X" search queries (see [ADR-0002](adr/0002-subsounder-society-boundary.md)).
- **Household / pod model.** Multiple members forward to one pod; no per-person bank connection required.
- **Agentic future is gated by knowledge, not transactions.** Auto-cancel requires (identity, state, intent, procedure). All four come from email + product data. Bank apps detect cancellation post-hoc; they can't initiate it.
- **No bank-side dependencies.** Plaid pricing, bank API outages, banks deauthorizing aggregators, OAuth re-consent prompts — none of these are SubSounder failure modes.

### vs. Gmail-OAuth-scanning apps (Subkai)

- **No inbox-access ask.** Significantly lower trust friction; serves a population that won't grant Gmail OAuth.
- **Any email provider.** Not Gmail-only.
- **Deep extraction.** Amount, plan tier, cancel URL, difficulty — not "this looks recurring."

### vs. manual-entry apps (Vexly)

- **Auto-discovery from forwarded emails.** Catalog grows itself once the forwarding habit is established.
- **CSV onboarding backfill** closes the legacy-sub depth that pure manual entry never reaches.
- **Provider knowledge surfaced automatically** (cancellation procedure, difficulty), not just whatever fields the user remembered to enter.

## Ingestion model (consequence)

Detailed in [ADR-0003](adr/0003-no-bank-connection-ingestion-strategy.md). Summary:

1. One-time CSV backfill at onboarding (seeds legacy silent-provider subs).
2. Email forwarding for everything emailable — receipts, welcomes, price changes, TOS updates, anniversary mails.
3. Inline edit affordance ([#6](https://github.com/udog21/subsounder/issues/6)) for filling in financial fields when an email gives identity but not amount or period.
4. Provider-side intelligence — `products` data flags surface as catalog suggestions when amounts drift.

## What this doc doesn't decide

- **Pricing.** Free / freemium / paid tier — parked until post-M2 (see [ROADMAP](active/ROADMAP.md)).
- **Family / multi-user pod model details.** The pod schema supports it; UX is a future scope.
- **Whether the segment is *actually* big enough.** This doc names the bet; the alpha tests it.
