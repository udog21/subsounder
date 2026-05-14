# ADR-0001: In-process invocation for parse and cron jobs

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Lek
- **Related:** [docs/architecture.md](../architecture.md), [docs/how-it-runs.md](../how-it-runs.md)

## Context

SubSounder has two paths that need to run slow background work:

1. **Inbound webhook → parse.** Mailgun POSTs an email to `/api/mailgun/inbound`. The handler must respond `200 OK` within seconds (Mailgun retries aggressively on slow responses), but the actual parse takes 10–30 seconds (LLM call + DB writes). The slow work must happen *after* the response is sent.
2. **Scheduled cron → 4 jobs.** Cloudflare's cron triggers fire `parse-sweep`, `product-enrichment`, `admin-digest`, `renewal-reminders` on different intervals.

The original design used HTTP self-fetches for both:

- Inbound handler used `after(() => fetch('https://app.subsounder.com/api/parse', ...))` — relying on Next.js's `after()` to defer the work past the response, but doing the actual work via an HTTP call back to itself.
- `src/worker.ts scheduled()` handler called `fetch('https://${WORKERS_URL}/api/cron/<name>')` for each cron tick.

Both paths produced runtime errors in production:

- `522` (connection timeout) and `403` (blocked) responses from Cloudflare's own infrastructure
- Root cause: Cloudflare's loop-detection, Bot Fight Mode, and similar edge protections treat a Worker calling its own public hostname as suspicious / recursive

## Decision

Replace HTTP self-fetches with **in-process function calls**. The architecture is now:

- All parse/cron logic lives in `lib/parser/run.ts` and `lib/cron/*.ts` as plain async functions
- The Next.js HTTP routes (`/api/parse`, `/api/cron/*`) become thin auth-wrapped wrappers — kept for manual debugging via `curl`
- The inbound webhook's `after()` calls `runParse()` directly (no HTTP)
- `src/worker.ts scheduled()` imports the cron functions and calls them in `ctx.waitUntil()` (no HTTP)

The Mailgun timeout protection — the original reason for the deferred-work pattern — is preserved by `after()` / `ctx.waitUntil()`, which extend the worker's lifetime past the response. The HTTP indirection was never load-bearing on that concern; it just happened to be in the same code path.

## Consequences

**Positive:**
- Removes a class of bugs (522/403 from edge protections)
- Drops one TLS handshake, DNS lookup, and billed subrequest per parse / per cron tick
- Faster end-to-end (no extra HTTP round-trip)
- `WORKERS_URL` env var becomes unused — one fewer secret to manage
- Easier to reason about: scheduled cron is now "call function" instead of "make HTTP request to yourself"

**Negative:**
- Slightly less "modular feel" — the parse function isn't a freestanding service. Mitigated by keeping HTTP routes as thin wrappers (so manual `curl` testing still works).
- The worker bundle now includes the parse + cron code directly (small size increase, negligible vs. the 1MB CF limit).

**Neutral:**
- The HTTP routes still exist and still work — anything currently triggering them (manual curl, future external integrations) is unaffected.

## Alternatives Considered

**Service Bindings.** Cloudflare's native worker-to-worker invocation that bypasses the public network. Considered overkill: requires deploying a second worker, more wrangler config, more deploy complexity. Worth revisiting only if we eventually split the parser into a separate service for scaling reasons (not soon).

**Disable Bot Fight Mode / add WAF allowlist for the worker's IPs.** Considered fragile — Cloudflare doesn't publish stable worker egress IPs, and disabling protections to work around an architectural smell is the wrong direction.

**Use workers.dev hostname instead of custom domain for self-fetches.** Tested — still produces 522s. The loop-detection appears to apply regardless of hostname when the target resolves back to the same worker.

**Keep HTTP self-fetch and accept occasional failures.** Considered unacceptable: renewal reminders are a core product feature, and silent cron failures aren't recoverable without external monitoring we don't have yet.
