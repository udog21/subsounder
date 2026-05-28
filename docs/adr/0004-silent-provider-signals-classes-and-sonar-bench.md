# ADR-0004: Silent-provider signals — confidence classes A/B/C and the sonar bench

- **Status:** Accepted
- **Date:** 2026-05-28
- **Deciders:** Lek
- **Related:** [docs/market-and-positioning.md](../market-and-positioning.md), [ADR-0003](0003-no-bank-connection-ingestion-strategy.md), [docs/active/ROADMAP.md](../active/ROADMAP.md), [#46](https://github.com/udog21/subsounder/issues/46)
- **Retires:** open-questions.md "How can SubSounder capture silent-provider subscription signals, including ultimately in the user's main catalog?"

## Context

[ADR-0003](0003-no-bank-connection-ingestion-strategy.md) named the silent-provider ingestion channels (one-time CSV backfill at onboarding; welcome / TOS / price-change emails forwarded going forward) but did not resolve how those signals flow through to a coherent catalog representation. Without that:

- Alpha invitees who forward Netflix-class non-billing emails see nothing happen.
- CSV-seeded rows can't be enriched by later forwarded emails without a uniform identity-and-confidence model.
- The catalog can't honestly distinguish "we know about this sub from a statement line" from "we know from a confirmed receipt."

Separately, [#46](https://github.com/udog21/subsounder/issues/46) settled a `confirmed | unconfirmed` row state on `subscriptions`, with an explicit hook to add an intermediate state without a migration burden ("future-proof the representation… do not ship as a tight 2-value enum"). This ADR fills that hook and names the rules for placing rows in each state.

The product is in Stage 1 (Visibility) per the [ROADMAP product principles](../active/ROADMAP.md#visibility--prioritization--active-management). The model chosen here must serve Stage 1 without precluding the per-field fidelity that Stages 2–3 will eventually want.

## Decision

### 1. Confidence classes as the row-level model

Row-level confidence stored as a single-letter class on `subscriptions`, written by the matcher at insert/update time:

- **Class A** — full evidence. Identity (provider + product) confirmed, cadence known, amount known — all from observed signals (forwarded receipt, CSV recurrence, user-entered).
- **Class B** — identity + cadence confirmed; amount filled from `products.pricing` (an estimate, not a signaled amount).
- **Class C** — identity asserted but cadence and/or amount not derivable, even from `products.pricing`. **Sonar pill, not a card.**

Class values use letters, not adjectives, to avoid relitigating semantics every time the model grows. Adding Class D later is a CHECK-constraint expansion, not a rename.

### 2. Bright line for card vs. pill

A row becomes a card (Class A or B) iff **identity is asserted AND cadence is known AND amount is either signaled or fillable from `products.pricing`**. Otherwise it stays as a pill (Class C).

Cadence is the load-bearing field: a row without cadence cannot generate meaningful renewal reminders, cannot contribute to a spend total, and cannot honestly call itself a subscription. Identity-only rows go to the bench until cadence arrives.

### 3. Multi-tier `products.pricing` resolution

When a product has multiple plan tiers in `products.pricing` (e.g. Netflix Basic / Standard / Premium) and the incoming signal does not specify which tier, the Class B amount is the **median tier**. Not cheapest (consistently low), not highest (consistently high). The card carries a visual cue that the amount is estimated; #6 Edit lets the user correct it.

### 4. Same table, derived surfaces

Pills (C) live in the same `subscriptions` table as cards (A/B). The catalog UI queries `WHERE class IN ('A','B') AND deleted_by_user IS NOT TRUE`. The sonar bench queries `WHERE class = 'C' AND deleted_by_user IS NOT TRUE`. Promote = column update, not row migration. Dedupe + identity logic is shared across pills and cards.

### 5. Sonar bench UI

A fixed-height component above the catalog, rendering one provider-name pill per Class C row. Two pill actions: **Dismiss** (same DB write as #4) and **Promote to card** (opens #6 Edit in "create from pill" mode). The implementation can evolve to a collapsible widget later; v1 ships fixed-height. Design must not foreclose the collapse mode.

Bench renders only when ≥1 Class C row exists.

Implementation issue: [#83](https://github.com/udog21/subsounder/issues/83).

### 6. Dismiss is permanent

A dismissed row stays dismissed. The matcher's existing identity-key behavior (per [CLAUDE.md](../../CLAUDE.md) — `(pod_id, product_id, instance) WHERE deleted_by_user IS NOT TRUE`) means a fresh strong signal for the same `(provider, product, plan)` tuple creates a *new* row, not a resurrection of the dismissed one. No new dismiss-suppression table needed.

### 7. Auto-promote C → B

Any later signal that fills cadence on a Class C row, where a `products.pricing` match exists for the product, upgrades the row in place to Class B. The matcher handles this on the next inbound; no user action required.

C → A auto-promotion happens when both cadence and a signaled amount arrive.

### 8. Totals rollup

The catalog header carries two totals (per [#46](https://github.com/udog21/subsounder/issues/46)):

- **Confirmed spend** — Class A only.
- **Total spend** — Class A + Class B, with a visual cue that B contributes estimates.

Class C never contributes to either total — pills are not yet subscriptions.

### 9. Renewal reminders decoupled from class

Renewal reminders are gated by **annualized spend**, not by Class. A Class B card with an estimated $24.99/mo Netflix amount above the floor receives reminders; a Class A $1.99/mo confirmed sub below the floor does not. This avoids conflating trust (Class) with importance (spend).

- v1 (parked): fixed annualized-spend floor — [#85](https://github.com/udog21/subsounder/issues/85), deferred out of M1 to protect the Jul 5 target.
- v2 (future): per-pod user-configurable threshold.

### 10. Prompt vocabulary expansion

The extractor stays as one prompt with expanded vocabulary, not a two-pass split (`signal_listener` + `card_info_extractor`). New emitted `signal_type` values: `welcome`, `tos_update`, `anniversary`. (`price_change` already exists.) Each emitted signal carries a new `signal_strength` field (`strong` | `weak`) that the matcher reads to assign Class.

Implementation issue: [#84](https://github.com/udog21/subsounder/issues/84).

## Consequences

**Positive:**

- The catalog honestly represents the silent-provider half of consumer subs (per ADR-0003's segment definition) without inventing fake amounts.
- The sonar bench surfaces uncertain signals without polluting the catalog or training the user to curate routine cases (per the autonomous-by-default principle).
- Class letters make schema extension cheap. The next confidence tier is `D`, not a rename and re-migration.
- The user can proactively promote pills from a bank-app side-glance (the bank-app-as-second-screen use case raised in the planning chat). They can also quickly dismiss pills they're certain don't apply.
- Decoupling reminders from class means trust-quality (Class) and reminder-eligibility (annualized spend) evolve on independent axes.

**Negative:**

- Every existing `subscriptions` query needs `WHERE class IN ('A','B')` discipline. Risk: a forgotten filter shows pills as if they were cards. Mitigation: a SQL view wrapping the catalog filter, or a `subscriptions_cards` view used by the UI.
- The median-tier estimate for multi-tier products is conservative-but-wrong — Netflix Premium users will see Standard's estimate until they confirm. Mitigation: the Class B "estimated" cue + [#79](https://github.com/udog21/subsounder/issues/79) stale-amount flag + [#6](https://github.com/udog21/subsounder/issues/6) Edit affordance.
- New prompt vocabulary requires a new `prompt_templates` row + matcher branch logic. Adds surface to the LLM-eval work eventually queued under the `llm` track.
- Pills look like a "new surface to maintain" until you internalize that they're a query-filtered view of the same table.

**Neutral:**

- [#46](https://github.com/udog21/subsounder/issues/46)'s UI scope (catalog filters + two header totals) carries through unchanged; this ADR just supplies what `state` values exist and what rule the matcher follows.
- View Source from [#43](https://github.com/udog21/subsounder/issues/43) applies to all rows including pills (already noted in #46's body).
- The dismiss mechanism from [#4](https://github.com/udog21/subsounder/issues/4) is reused as-is for pills.

## Alternatives Considered

**Per-field confidence in v1.** More truthful: model each field's source (`amount_source`, `cadence_source`, `identity_source`) and derive row state from them. Rejected for now because (a) only amount has a meaningful "known vs. estimated" axis at Stage 1, and (b) the Class A/B/C rollup serves Stage 1 (Visibility) without locking out the per-field model later. Reconsider when Stage 2 (Prioritization) or Stage 3 (Active management) needs field-level UI.

**Separate `subscription_pings` table for pills.** Avoids the `WHERE class IN` query discipline. Cost: forks the schema, doubles dedupe surface, makes promote = INSERT + DELETE instead of a column update, and complicates the matcher (pills and cards would each need their own identity logic). Rejected — the friction tax of the `WHERE` filter is lower than the friction tax of a forked schema.

**Adjective-named class values (`confirmed` / `unconfirmed` / `pinged`).** Each generation invites renaming. Class letters duck that noise; the data carries a tier ordinal, not a label.

**Cheapest-tier amount estimate for multi-tier products.** Conservative-er, but consistently *low* — every Netflix Premium user sees Basic's estimate. Median splits the systematic error in half.

**Class-gated renewal reminders** (reminders for A, not B). Conflates trust with importance. A small confirmed sub doesn't need a pre-renewal reminder; a large estimated sub does. Spend-gated reminders separate the two axes.

**Two-pass prompt split** (`signal_listener` + `card_info_extractor`). Cleaner separation of concerns, but adds operational surface (two prompts, two versions, two failure modes) without a demonstrated quality reason to split. Reconsider only if observation shows the unified prompt sacrificing financial-extraction precision while chasing classification recall.

**Auto-resurrect dismissed rows on any new signal.** Rejected — a dismissed row is a user assertion of "not mine" and should not be silently overridden. The existing matcher behavior (fresh signal → new row at the same identity slot) is the right resolution: the user gets a new pill / card they can act on, while the dismissed row remains a record of their earlier judgment.