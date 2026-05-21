# SubSounder docs

This folder holds everything we keep around about the product that isn't code. Three layers:

| Layer | Lives in | Edited? |
|---|---|---|
| **Active** (planning) | `docs/active/` | Yes — kept in sync with code as features land |
| **Reference** (how the system works today) | `docs/` root and `docs/adr/` | Yes — corrected when wrong, but doesn't track day-to-day work |
| **Archive** (frozen snapshots) | `docs/archive/` | No — historical record only |

## Active

Planning docs. Keep these honest — if behavior changes, update the matching doc in the same PR.

| File | Role |
|---|---|
| [active/ROADMAP.md](active/ROADMAP.md) | Current milestone narrative (MVP → Private Alpha → Public Beta → V1). Strategic priorities. Read first when asked "what should I work on next." |
| [active/open-questions.md](active/open-questions.md) | Pending product decisions the codebase depends on. Each entry stays until decided; resolved entries become an ADR. |
| [active/glossary.md](active/glossary.md) | The SubSounder vocabulary (pod, sounding, signal, cycle, product, etc.). Read first if a term in code or chat is unfamiliar. |

## Reference

Standing context about how the system is built. Less churn than planning docs; updated when they go wrong.

| File | Role |
|---|---|
| [architecture.md](architecture.md) | Non-obvious design choices and why they exist. |
| [how-it-runs.md](how-it-runs.md) | Plain-English walkthrough of the product loop from forwarded email to renewal reminder. |
| [competitive-analysis.md](competitive-analysis.md) | Market landscape and SubSounder's positioning. |
| [adr/](adr/) | Architecture Decision Records — preserved log of decisions worth remembering. New decisions get a new numbered file. |

## Archive

Frozen snapshots. Do not edit. Corrections belong in `docs/active/*` or a new ADR.

| File | Role |
|---|---|
| [archive/mvp-plan.md](archive/mvp-plan.md) | Historical MVP implementation plan (Phases 0-7). Captured the build; superseded by the running code and the active roadmap. |

## Active vs. archive — the rule

A doc lives in `active/` when its content must be kept in sync with code as features change. A doc moves to `archive/` when it captures a past state worth preserving but no longer reflects current reality. Archived docs are read-only references; if something in them is now wrong, fix the active doc (or write an ADR), don't edit the archive.

GitHub issues are the tactical queue underneath the active docs. Each milestone item in `active/ROADMAP.md` typically spawns one or more issues.

## Known gaps

Drift between docs and code that's been spotted but not yet fixed. Tracked here so it's visible instead of silent. Resolve by either updating the doc or filing an issue.

- **CLAUDE.md "Project Structure" omits `lib/cron/` and the rest of `lib/`.** The block lists `lib/parser/`, `lib/parse-trigger.ts`, `lib/email/index.ts` but skips `lib/cron/{parse-sweep,renewal-reminders,admin-digest,product-enrichment}.ts`, `lib/supabase/*`, `lib/auth.ts`. Out of scope for the governance PR that introduced this index — fix in a follow-up content edit.
- **CLAUDE.md describes `lib/parse-trigger.ts` as "call /api/parse"** which is the pre-ADR-0001 design. Per [adr/0001-in-process-cron-and-parse.md](adr/0001-in-process-cron-and-parse.md), parse is now invoked in-process via `lib/parser/run.ts`; the helper's actual current role should be re-checked and the description corrected.
