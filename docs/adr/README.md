# Architecture Decision Records

Historical log of non-trivial product and architectural decisions. Each file captures *what was decided, when, and why* — so future-you (or future agents) don't have to reconstruct the reasoning from code archaeology.

## Convention

- One ADR per non-trivial decision.
- Filename: `NNNN-kebab-case-title.md` (e.g. `0001-out-of-order-receipts-event-date-wins.md`). Use the next free 4-digit number.
- Body structure:
  ```markdown
  # ADR NNNN: <title>

  - **Status:** Accepted / Superseded by ADR NNNN
  - **Date:** YYYY-MM-DD
  - **Context:** the problem, why a decision was needed
  - **Decision:** what we chose
  - **Consequences:** what changes in the codebase / product as a result, including tradeoffs accepted
  ```

## What goes in ADRs vs. other docs

- `docs/open-questions.md` — pending decisions only. Entries get deleted when decided.
- `docs/adr/NNNN-*.md` — preserved record of decisions worth remembering.
- `docs/ROADMAP.md` — strategic plan (WHAT we're building, by milestone).
- GitHub issues — tactical work units (HOW the work is broken up).

## What does NOT need an ADR

Naming choices, refactors, bug fixes, implementation details that don't change product behavior. If the only reason to write it down is "I won't remember which one I picked," skip the ADR — git history is enough.

## What DOES need an ADR

- Product scope and boundary decisions
- Data model choices with non-obvious tradeoffs
- Auth / privacy / billing posture
- External integrations (which vendor, which API, why)
- Anything that overrides a default someone might re-litigate later
