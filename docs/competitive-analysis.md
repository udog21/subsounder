# Competitive Analysis — SubSounder

_Last updated: 2026-05-05_

## Competitors at a Glance

| | Subkai | Vexly | Feenko | Rocket Money | **SubSounder** |
|---|---|---|---|---|---|
| **Discovery method** | Gmail OAuth scan | Manual only | Bank sync | Bank sync | Email alias forwarding |
| **Auto-discovery** | Yes (Gmail only) | No | Yes (bank only) | Yes (bank only) | Yes (any email provider) |
| **AI parsing** | Detection only | Entry assist | Unknown | Unknown | Deep extraction (amount, cancel URL, difficulty) |
| **Cancellation intel** | No | No | Basic instructions | Human concierge (Premium) | Cancel URL + difficulty score |
| **Renewal reminders** | Yes | Yes | Unknown | Yes | Yes |
| **Spend analytics** | Basic | Strong | Basic | Strong | Planned post-MVP |
| **Free trial tracking** | No | Yes | No | No | Planned post-MVP |
| **Bank connection** | No | No | Yes (required) | Yes (required) | No |
| **Inbox access** | Yes (read-only OAuth) | No | No | No | No |
| **Multi-currency** | No | Yes | No | No | No |
| **Family sharing** | No | Yes | No | Yes | No |
| **Pricing** | Free | $0 / $24yr / $39 lifetime | Unknown | Free + Premium tier | TBD |
| **User scale** | ~2,000 | Early adopter | Unknown | 10M+ members |  |

---

## Player Profiles

### Subkai (subkai.com)
- Completely free, no credit card, no auto-renewing trial
- Uses Google CASA Tier 2 certified read-only Gmail OAuth — scans inbox for recurring charges automatically
- Stores only email IDs, not content; end-to-end encryption
- ~2,000 users; claims $200+ in monthly savings identified per user
- **Weakness:** Gmail-only; requires inbox access which many users distrust; no cancellation guidance

### Vexly (vexly.app)
- Manual entry only; AI assists with quick data input
- Free tier: 3 subscriptions max
- Paid: $24/year or $39 lifetime (50% early-adopter discount in effect)
- Duplicate detection, free trial countdown, family sharing, multi-currency
- "No subscription irony" — one-time payment model; 30-day money-back guarantee
- **Weakness:** No auto-discovery at all; high friction to maintain

### Feenko (feenko.com)
- Bank sync required for discovery — same trust barrier as Mint/Rocket Money
- Provides basic cancellation instructions for identified subscriptions
- No pricing details publicly available
- **Weakness:** Bank connection is a deal-breaker for privacy-conscious users

### Rocket Money (rocketmoney.com)
- Dominant player, 10M+ members, $2.5B in claimed member savings
- Bank sync + human concierge for cancellations and bill negotiation (Premium)
- Positioned as Mint replacement; broad personal finance tool, not subscription-focused
- **Weakness:** Overkill for subscription-only use case; bank access required; Premium pricing opaque

---

## SubSounder's Differentiation

**Positioning:** *Automatic like Subkai, private like Vexly, actionable like Rocket Money — without giving up your inbox or bank.*

| Differentiator | Why it matters |
|---|---|
| **Alias forwarding** | Works with any email provider; no inbox OAuth; user controls what gets tracked by what they forward |
| **No bank, no inbox** | Neither large-scale competitors (bank sync) nor the Gmail scanner approach; lowest trust ask |
| **Deep email parsing** | Extracts renewal amount, cancel URL, cancellation difficulty from email content — nobody else does this |
| **Cancel intel** | Surfacing the cancel URL and difficulty score is a genuinely novel feature; positions SubSounder as the tool that helps you *act*, not just *know* |

---

## MVP Scope Decisions

### Keep (core differentiators)
- Email alias forwarding
- AI extraction: renewal amount, cancel URL, cancellation difficulty
- Renewal reminders

### Add before launch (table stakes)
- **Monthly/annual spend total** on catalog page — Vexly has it; users will notice its absence
- **Free trial countdown** — Vexly surfaces this; it's a high-anxiety moment SubSounder emails naturally capture

### Post-MVP
- Inbox parsing / Gmail OAuth (post-trust-building; see CASA Tier 2 note below)
- Spend analytics charts
- Multi-currency
- Family sharing
- Push notifications

---

## Cancellation Intel — How It Should Work

This is the most defensible moat and needs a concrete implementation plan.

### The problem
Cancel URLs and difficulty scores can't be reliably extracted from individual emails alone — most subscription emails don't include a "here's how to cancel" link. The intel needs to come from a structured provider database.

### Proposed approach

**Layer 1 — Seed DB (immediate)**
Pre-populate `subscriptions` (or a new `providers` table) with the top ~200 merchants:
- Cancel URL
- Cancellation difficulty (1–5 scale: easy self-serve → requires phone call)
- Cancellation notes (e.g. "must call during business hours", "online chat only")

Source: manual research + existing `seed.sql` merchant list. One-time effort, covers the vast majority of real-world sounding volume.

**Layer 2 — AI scrape on new provider entry (automated)**
When the parser encounters a merchant not in the DB:
1. AI identifies the merchant name from the email
2. A background job fetches the provider's support/cancel page
3. GPT-4o-mini extracts: cancel URL, difficulty estimate, notes
4. Result is written to the provider record, flagged `confidence = 'ai'`
5. Optionally: queue for human review before surfacing to users

**Layer 3 — User signals (long-term)**
Users who successfully cancel can confirm or correct the cancel URL and difficulty — crowdsourced accuracy improvement. Layer 3 is realized publicly as **Subsounder Society** — a free browsable cancellation-intel site that also serves as top-of-funnel SEO. See [ADR-0002](adr/0002-subsounder-society-boundary.md) for the data, editorial, publishing, and sequencing boundary.

### What to build for MVP
- Seed DB with top ~100–200 providers (covers ~80% of real emails based on Pareto)
- Match parsed merchant name against provider DB during the parse step
- Attach `cancel_url` and `cancellation_difficulty` to the subscription record when matched
- Display both on the catalog UI

### What to defer
- AI scrape pipeline (Layer 2) — build after seed DB is live and match rate is measured
- User correction signals (Layer 3) — exposed publicly as Subsounder Society; export pipeline ships in Public Beta, public site launches at V1. See [ADR-0002](adr/0002-subsounder-society-boundary.md).

---

## Google CASA Tier 2 — Inbox Parsing (Post-MVP)

CASA Tier 2 is required by Google before any app can use restricted Gmail OAuth scopes (reading inbox content). It's a security assessment run by an App Defense Alliance authorized lab.

**Process:**
1. Complete OWASP ASVS-based security scan (static + dynamic)
2. Submit results to an authorized lab for verification (~4 lab hours estimated)
3. Google reviews the lab report and grants restricted scope access
4. Annual re-assessment required to maintain access

**Realistic timeline:** 4–12 weeks depending on lab queue and how many remediations are required.

**Cost:** Not publicly listed; authorized labs set their own rates. Ballpark from community reports: $2,000–$8,000 USD depending on app complexity.

**Our verdict:** Worth pursuing post-MVP once SubSounder has demonstrated traction and user trust. The alias forwarding approach is a stronger near-term story anyway — it never needs inbox access, which is a cleaner pitch to privacy-conscious early adopters.
