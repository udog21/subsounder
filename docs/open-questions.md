# Open Product Questions

_Pending product decisions that the codebase needs answered. Each question stays here until decided; resolved entries flip to "Decided" and link to the roadmap or PR that implemented the answer. New questions get appended at the bottom of the relevant section._

---

## Product scope

### Q: What recurring services is this app for?

**Status:** Open
**Context:** "SubSounder" parses subscription emails. That naturally fits digital/SaaS subscriptions and service subscriptions that send receipts. It does not naturally fit HOA fees, condo dues, leases, utilities, car insurance — these usually auto-debit silently or send paper bills. The product positioning, marketing copy, and what we tell users to forward all depend on this answer.
**Options:**
- **Digital + service subscriptions that email receipts** (Spotify, Netflix, Adobe, gym memberships, magazine subs, app subs via Apple/Google Play). Natural fit for email parsing. Recommended.
- **All recurring expenses including auto-debited bills.** Would require Plaid or bank-connection integration. Different product class — competes with Rocket Money. Much bigger lift.
- **Email-only but explicitly only "digital" stuff** (no physical service subs). Narrower than option 1.
**Recommendation:** Option 1 — "track every recurring service that emails you a receipt." Use bank integration only if a future milestone needs it.
**Decision:** _(pending)_

---

## Data model & temporal state

### Q: Out-of-order receipts for the same subscription

**Status:** Open · **Affects:** [lib/parser/match.ts](../lib/parser/match.ts), [lib/parser/run.ts](../lib/parser/run.ts)
**Context:** A user can forward an old receipt *after* a newer one for the same service. Concrete: today they forward Spotify Apr 2026, tomorrow they forward Spotify Jan 2024. Currently `match.ts` returns `action='update'` for the older receipt and `run.ts` updates `subscriptions` unconditionally — so the older signal overwrites the newer state (next_renewal_at, last_observed_content_date, current_cycle_id, etc.).
**What should happen:**
- `subscription_cycles` row should still be inserted for the older receipt (historical record).
- `subscriptions` row should only update fields if the new signal's `event_date` is newer than `last_observed_content_date`.
- `current_cycle_id` should point to the cycle with the most recent `period_start` or `event_date`.
**Options:**
- A: Add an event_date comparison in `run.ts` before applying the update payload. Simple, ~10 lines.
- B: Move the comparison logic into `match.ts` and have it return a richer payload (which fields to update, which to skip).
**Recommendation:** A first — cheap fix that addresses the bug. B is the cleaner long-term home but can wait.
**Decision:** _(pending)_

### Q: Subscriptions that haven't been seen recently — stale vs. cancelled vs. still active

**Status:** Open
**Context:** If a sub's most recent receipt is older than 2× its cadence (e.g. monthly sub last seen 4 months ago), is it still "active"? Today everything stays `status='active'` forever, and the catalog just shows the renewal date as overdue. Confusing for users — they don't know if SubSounder thinks the sub is current or stale.
**Options:**
- A: Auto-mark `status='stale'` if no signal in 2× cadence (cron job). Visible in catalog as a separate state. User can manually move to cancelled or refresh.
- B: Just show "last seen X days ago" on the card and let user decide. No new status.
- C: Auto-mark cancelled after some threshold. Aggressive — might delete data the user wanted.
**Recommendation:** B for alpha (cheapest, lets user decide). Revisit A after seeing alpha feedback.
**Decision:** _(pending)_

### Q: Trial → paid conversion

**Status:** Open · **Affects:** [lib/parser/match.ts](../lib/parser/match.ts)
**Context:** A `trial_start` signal creates a sub with no amount. When the first paid `charge` or `receipt` signal arrives for the same merchant, should it update the existing trial-sub or create a new sub? Schema supports either.
**Options:**
- A: Match against the trial sub, update it to active with amount/cadence from the new signal.
- B: Treat as a new sub. Trial sub becomes orphan or auto-resolved.
**Recommendation:** A — same merchant_domain, the trial sub is clearly the precursor. Matcher should already do this via merchant_domain scoring; needs verification with a real conversion email.
**Decision:** _(pending)_

### Q: Plan changes / upgrades

**Status:** Open · **Affects:** [lib/parser/match.ts](../lib/parser/match.ts)
**Context:** If a user upgrades from Spotify Individual to Family, does that produce a `price_change` signal that updates the existing sub, or a new sub? Today the schema has both `price_change` as a signal_type and supports new-sub-creation. Match logic is untested for this case.
**Options:**
- A: Always update existing sub when merchant matches, regardless of signal type. Plan history lives in `subscription_cycles`.
- B: Create new sub on plan change, link via a `superseded_by` FK or similar.
**Recommendation:** A — `subscriptions` is identity ("which service"), `subscription_cycles` is the bill ledger. Plan history belongs in cycles. Simpler model.
**Decision:** _(pending)_

### Q: Dedupe across renewal-notice + charge-receipt emails for the same cycle

**Status:** Open
**Context:** Some services send a "your subscription renews in 30 days" email AND a charge receipt on renewal day. Both reference the same billing cycle. Today the parser will create two `subscription_cycles` rows for one actual cycle.
**Options:**
- A: Dedupe in match.ts by `(subscription_id, period_start)` proximity. If a cycle exists within ±7 days of the new signal's period_start, update instead of insert.
- B: Use a unique constraint on `(subscription_id, period_start_truncated_to_month)`.
- C: Accept the duplication. Treat each signal as an independent observation.
**Recommendation:** A — easier than DB-level constraint, lets the matcher decide on a case-by-case basis.
**Decision:** _(pending)_

---

## Onboarding & seeding

### Q: First-run experience — how does a brand-new user populate their catalog?

**Status:** Open
**Context:** A user signs up, gets an alias, lands on an empty catalog page. The pipeline only sees subscriptions they forward. Without guidance, most users will forward one or two emails and bounce.
**Options (not mutually exclusive):**
- A: Empty-state copy that explicitly says "Forward your 5-10 most recent subscription receipts to seed your catalog. We'll catalog them and remind you before renewals."
- B: Manual "Add subscription" button for services that don't email receipts.
- C: Gmail OAuth → scan last 90 days of inbox for subscription-shaped emails. High trust ask, high payoff.
- D: A welcome email after signup with examples of what to forward.
**Recommendation:** A + D for alpha. B for beta. C is a V1+ bet.
**Decision:** _(pending)_

### Q: What should the app assume about a subscription where the only signal is an old receipt?

**Status:** Open
**Context:** Related to "stale vs cancelled" above. Concrete: Art Store receipt from Jan 2024 is the only data point. Is the sub still active? Cancelled? The user might be using SubSounder to *remember* a sub they cancelled years ago, or to track one they still pay for.
**Options:**
- A: Default to `status='active'`, show "last seen" date prominently, let user manually mark cancelled.
- B: Prompt the user at ingestion time: "We saw this receipt from N months ago — is this still active?"
- C: Auto-mark stale after some threshold.
**Recommendation:** A for alpha (simplest, matches current behavior). B if alpha feedback shows confusion.
**Decision:** _(pending)_

---

## How to use this doc

- **Add questions** when a real codebase question depends on a product call that hasn't been made.
- **Don't add** questions you can answer alone or that are pure-implementation choices.
- **When deciding:** delete the entry from this doc. If the decision is non-trivial or has implications worth preserving, write a corresponding ADR in `docs/adr/` (next numbered file). Trivial decisions (e.g. naming choices) can just disappear once implemented.
- This doc reflects *only what is currently undecided*. The ADR folder is the historical log of what was decided and why.
