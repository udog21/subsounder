# Open Product Questions

_Pending product decisions that the codebase needs answered. Each question stays here until decided, then is deleted from this doc — see "How to use this doc" at the bottom. Non-trivial decisions are preserved as ADRs in `docs/adr/`; trivial ones disappear once implemented. Past commits hold earlier snapshots if you need to see what was previously open. New questions get appended at the bottom of the relevant section._

---

## Ingestion & catalog

### Q: How can SubSounder capture silent-provider subscription signals, including ultimately in the user's main catalog?

**Status:** Open · **Affects:** the full ingestion → matcher → catalog pipeline

**Context:** Per [ADR-0003](../adr/0003-no-bank-connection-ingestion-strategy.md), silent providers (Netflix-class) don't emit per-cycle receipts, so they can't enter the catalog through the email-receipt path that handles transactional providers. ADR-0003 named two channels (CSV backfill at onboarding; welcome / price-change / TOS emails forwarded going forward) but didn't resolve how those signals flow through to a coherent catalog representation. Without that, alpha invitees who forward Netflix-class non-billing emails see nothing happen; CSV-seeded rows can't easily be enriched as emails arrive; and the catalog can't honestly distinguish "we know about this sub from a statement line" from "we know about this sub from a confirmed receipt."

One umbrella question with coupled sub-decisions across:

- **Signal sources.** What counts as a silent-provider subscription signal? CSV-backfill rows, welcome emails, anniversary mails, TOS updates, price-change notices, account/content-drop marketing, future user-driven enrichment. How does each register as evidence?
- **Lifecycle and staging.** Do signals enter the catalog directly, or stage in a separate surface (the submarine "sonar return" before it becomes a confirmed contact) until promoted? When is promotion automatic vs. user-confirmed?
- **Parsing roles.** Split the extractor into `signal_listener` (broad provider-relationship classification, no billing data required) + `card_info_extractor` (deep billing extraction when present)? Or stay as one prompt with new signal types?
- **Matcher reconciliation.** Multiple signal sources for the same merchant (CSV seed + email forward + later price-change) — how do they merge without overwriting confirmed data? How are false positives (generic shopping promos for non-subscribers) kept from creating phantom rows?
- **Catalog representation.** How does the main catalog show different signal-confidence states (CSV-seeded, email-confirmed, partial-financials, existence-only)? Where does inline financial enrichment live? Is there a separate "signals" surface the user promotes from?

**Recommendation:** _(pending — dedicated planning chat)_

**Decision:** _(pending)_

---

## How to use this doc

- **Add questions** when a real codebase question depends on a product call that hasn't been made.
- **Don't add** questions you can answer alone or that are pure-implementation choices.
- **When deciding:** delete the entry from this doc. If the decision is non-trivial or has implications worth preserving, write a corresponding ADR in `docs/adr/` (next numbered file). Trivial decisions (e.g. naming choices) can just disappear once implemented.
- This doc reflects *only what is currently undecided*. The ADR folder is the historical log of what was decided and why.
