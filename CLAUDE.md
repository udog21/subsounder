# SubSounder — Claude Code Context

## What this is
AI-powered subscription intelligence layer. Users forward subscription emails to a unique alias; the system parses them, builds a subscription catalog, and sends renewal reminders before surprise charges hit.

## Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Platform | Cloudflare Workers via `@opennextjs/cloudflare` |
| Database | Supabase (Postgres + Auth) |
| LLM | OpenAI `gpt-4o-mini` with structured outputs (`json_schema`, `strict: true`) |
| Email | Mailgun (inbound: `inbound.subsounder.com`; outbound: `mailgun.js`) |

## Key Architectural Decisions
- **Two-layer logging:** `parser_runs` (control plane, one per attempt) → `soundings_log` (data plane, one row per extracted signal)
- **Async parsing:** `after()` in inbound handler (immediate) + 5-minute cron sweep (reliable retry via `parser_status = 'pending'`)
- **Dedup:** `INSERT ... ON CONFLICT (pod_id, dedupe_key) DO NOTHING` — never a pre-check query
- **LLM output is always `signals[]` array** — supports 1:N extractions from day one
- **Service role key** for all server-side DB writes (bypasses RLS); anon key only for client auth

## Project Structure
```
app/
  api/
    mailgun/inbound/   Mailgun webhook receiver
    parse/             Mail parser orchestrator (POST { receipt_id, pod_id })
    cron/
      parse-sweep/     Retry pending receipts every 5min
      renewal-reminders/  Daily 9am reminder dispatch
  components/
    CopyButton.tsx     Client component: alias email clipboard button
  page.tsx             Subscription catalog UI (server component)
lib/
  parser/
    normalize.ts       HTML→text, forwarded block extraction, 12k truncation
    extract.ts         GPT-4 mini structured extraction
    validate.ts        Output validation + parser_run_status suggestion
    match.ts           Score-based subscription matching + write decision
  parse-trigger.ts     Shared helper: call /api/parse (used by inbound + cron)
  email/index.ts       Mailgun client + email templates (new/renewal notifications)
src/
  worker.ts            CF Worker entry: wraps OpenNext fetch + scheduled cron handler
supabase/
  migrations/          All schema DDL (run in order; db reset rebuilds from here)
  seed.sql             Top ~50 merchants: cancellation URL, difficulty, annual_discount_pct (Phase 7)
```

## Database Schema (key tables)
- `pods` — subscription group, one per user; holds `alias_email`
- `profiles` — user profile; `auth_user_id` links to `auth.users`
- `merchants` — canonical merchant data: `name`, `website`, `aliases[]`, `cancellation_url`, `cancellation_difficulty` (1–5), `annual_discount_pct` (Phase 7 adds last three columns)
- `inbound_receipts` — raw email signals; `parser_status` = `pending | parsed | ignored | error`
- `parser_runs` — control plane, one row per parse attempt; links to `inbound_receipts`
- `soundings_log` — data plane, one row per extracted signal; `parser_run_id` FK; `resolved_subscription_id` set after matching
- `subscriptions` — normalized current state per user; `cancellation_url`, `cancellation_difficulty`, `annual_discount_pct` denormalized from `merchants` at parse time
- `subscription_cycles` — billing history

## Local Development
```bash
supabase start          # Boot local Postgres + Auth (requires Docker Desktop)
supabase db reset       # Wipe + rebuild from migrations + seed.sql
npm run dev             # next dev at localhost:3000 — daily work
npm run preview         # wrangler dev — CF Workers simulator, run before deploy
npm run deploy          # Build + deploy to Cloudflare
```

## Testing Division of Labor
- **Backend (I test):** curl/HTTP calls to local API routes, DB row verification
- **UI (you verify):** browser at `localhost:3000`
- **End-to-end (you test):** real email forwarded to alias on Cloudflare preview deployment

## Environment Variables
All go in `.dev.vars` locally and Cloudflare dashboard secrets for production.
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MAILGUN_SIGNING_KEY
MAILGUN_API_KEY
OPENAI_API_KEY
PARSE_SECRET
CRON_SECRET
ADMIN_EMAIL
WORKERS_URL
```

## Conventions
- No comments unless the WHY is non-obvious (invariant, workaround, hidden constraint)
- TypeScript throughout; `strict: true`
- No `export const runtime = 'edge'` — must use Node.js runtime for CF Workers compat
- Server components fetch data directly via Supabase server client; no useEffect data fetching
- Catalog UI (`app/page.tsx`) uses a CSS Module (`app/page.module.css`) — Figma CSS exports can be pasted directly into the module; computed colors (difficulty dots, trial countdown urgency) stay inline since they're runtime values
- Errors surface as typed responses, not thrown exceptions in API routes

## IDE
VS Code with the Claude Code extension. MCP logs are in the Output panel → "Claude Code" or "Claude Code MCP" dropdown after reloading the window (`Ctrl+Shift+P` → "Developer: Reload Window").

## Full Plan Reference
`docs/plan.md` — implementation phases, schema changes, file map, verification checklist
