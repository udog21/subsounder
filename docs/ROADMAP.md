# SubSounder Roadmap

_Last updated: 2026-05-14. This is the strategic plan. For tactical work units, see [GitHub issues](https://github.com/) — each milestone item below typically spawns 1+ issues, tagged with the corresponding GH milestone._

## Milestone framework

| Milestone | Goal | Status |
|---|---|---|
| **MVP** | Pipeline works end-to-end (forward → parse → catalog → renewal reminder) | ✅ Done (2026-05-14) |
| **Private Alpha** | 5-10 invited testers, catalog correctness solid on real data, basic cleanup affordances exist | 🟡 In progress |
| **Public Beta** | Public sign-up, polished UX, no obvious data-quality landmines | ⚪ Not started |
| **V1** | Acquisition push (Reddit / ads), monetization clear | ⚪ Not started |

Each milestone is a *goal*, not a feature list. Work items attach to milestones via GH issue labels.

---

## MVP — Done

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

## Private Alpha (current)

**Goal:** Invite 5-10 friendly testers (people who'll tolerate rough edges and report bugs). Their catalogs should look correct after forwarding 5-10 receipts. No one should see obviously broken data.

### Required to start inviting

1. **Cleanup affordances.** Users WILL see false positives — orphan data from old prompt versions, parser misfires, services they cancelled long ago. Without a way to dismiss them, the catalog feels broken.
   - `deleted_by_user` status enum value on `subscriptions`
   - Catalog kebab menu with "Dismiss" action
   - Matcher in `lib/parser/match.ts` skips `deleted_by_user` rows when scoring
   - "Show dismissed" toggle for recovery
2. **Manual "Mark as cancelled" UI.** Most cancelled subs never send a cancellation email — user has to mark manually.
3. **v3 prompt iteration.** Known issues from MVP test data:
   - Trial signals should set `cancel_by_at` to trial-end date so warnings fire
   - Trial signals should not default `billing_cadence` to `one_time`
   - When stated cadence conflicts with date-gap math (e.g. n8n monthly tagged as annual), prefer date math or flag for review
   - For monthly cadences without explicit `next_renewal_at`, infer from `event_date + 1 month`
4. **Out-of-order receipt handling.** See [open-questions.md](open-questions.md#out-of-order-receipts) — match.ts currently lets older receipts overwrite newer subscription state.
5. **Onboarding empty state.** Guide first-time users to forward 5-10 recent receipts. Show example/expected timing.
6. **Test-account cleanup.** Delete orphan v1-era rows (`be19adc5` "Apple" with mismatched plan_name) so the demo looks clean.

### Nice-to-have for alpha
- Manual subscription entry UI (for services that don't email receipts — gym autopay, etc.)
- Cancellation_confirm signal handling tested end-to-end with a real cancellation email
- Better default sort order on the catalog

### Out of scope for alpha
- Marketing site
- Monetization decisions
- Gmail OAuth bulk scan
- Bank connection (Plaid)

---

## Public Beta

**Goal:** Open the gates. Anyone can sign up. UX is polished. Data quality stays trustworthy as cohort scales.

Key bets (will firm up after alpha feedback):
- Plan-change handling (`price_change` signal + matcher updates) tested with real upgrade emails
- Cancellation-helper enrichment cron (Phase 7) actually populates `cancellation_url` for new products users add
- Renewal reminder email validated against real user reactions
- UI polish round driven by alpha feedback
- Onboarding flow tightened
- Resolve at least the product-scope and data-model questions from [open-questions.md](open-questions.md)

---

## V1

**Goal:** Marketing and acquisition. Make people who don't know us start using it.

Likely scope:
- Marketing landing page (separate from app)
- Pricing decision: free / freemium / paid tier
- Reddit + Google ads campaign
- Possibly Gmail OAuth bulk-scan for instant catalog seed (huge UX win, high trust ask — may slip to V1.x)
- Cancellation-difficulty UI as a first-class feature, not a side note

---

## Where this doc lives in the workflow

- **Update this doc** when milestone goals shift, when a milestone is achieved, or when a major scope decision lands.
- **Don't** put bug fixes, individual refactors, or one-off chores here — those are gh issues.
- **Do** put each milestone item under the corresponding GH milestone (Private Alpha, etc.) when creating issues.
- When asking an agent "what should I work on next," the answer is: highest-priority unfinished item under the current milestone, ideally one that's been broken into a discrete gh issue.
