🧭 SubSounder — Vision Summary
🧠 Core Idea

SubSounder is an AI-powered subscription intelligence layer that passively ingests email + financial signals and turns them into a structured, queryable system of record for subscriptions.

The key differentiator is:

No manual entry. Everything is inferred from real-world signals (email, receipts, charges).

⚙️ Core Product Philosophy
1. “Email alias as the API”

Each user gets a unique alias email

Users:

Use it to sign up for services

Forward receipts / renewal notices

System parses all inbound signals → builds subscription records

👉 This is the primary ingestion mechanism (MVP-critical)

2. “Event → Subscription model”

You are not tracking subscriptions directly—you’re tracking:

Events (email, charge, renewal notice)

→ parsed into

Soundings (subscription insights)

Key tables (simplified mental model):

inbound_receipts → raw signals

soundings_log → parsed events

soundings → current subscription state

subscription_cycles → billing history

👉 This gives auditability + flexibility (important for later automation)

3. “LLM as interpreter, not source of truth”

Regex / deterministic parsing first

LLM fills gaps (classification, extraction)

Structured outputs only (confidence-scored)

🧩 MVP Feature Set (What you’ve already defined)
1. 📥 Ingestion Layer (MVP-critical)

Mailgun inbound parsing

Subdomain (e.g. inbound.subsounder.com)

Deduplication via dedupe_key

Email → parsed into:

merchant

amount

billing interval

renewal date

classification (subscription / not)

Also supports:

Gmail ingestion (later in MVP)

PDF / statement parsing (future phase)

2. 🧠 Subscription Detection Engine

Classifies signals into:

subscription

maybe_subscription

not_subscription

spam

Confidence scoring (0–1)

Handles:

Renewal notices

Receipts

“You will be charged…” emails

3. 📊 System of Record (Supabase)

Core entities:

profiles

pods (subscription groups)

soundings (active subscriptions)

soundings_log (event history)

subscription_cycles (billing instances)

Capabilities:

Track:

next renewal date

billing cadence

historical charges

Multi-tenant via RLS

4. 🔔 Alerts & Reminders (MVP-light)

Upcoming renewal alerts

Possibly:

“You’re about to be charged $X”

Delivered via email (Resend)

5. 📬 Outbound Communication

Early access invites (Resend broadcast/templates)

Future:

cancellation nudges

renewal summaries

6. 🧾 Subscription Visibility UI (MVP-simple)
Likely MVP UI (implied, not overbuilt):

List of subscriptions:

merchant

price

cadence

next renewal

Basic sorting/filtering

👉 No heavy UI—this is data-first MVP

🖥️ UI / UX Direction (Implied Vision)
Design principle:

“The product is mostly invisible—value comes from what it tells you, not what you enter.”

Likely surfaces:
1. Dashboard

Active subscriptions

Monthly burn estimate

Upcoming renewals

2. Subscription detail

Timeline of events (from soundings_log)

Charges over time

Source emails

3. Notifications layer (key UX lever)

“You’re about to be charged”

“We found a new subscription”

“This looks like a duplicate”

🧱 Architecture Shape (Important insight)

You asked this explicitly—here’s the answer:

This app is:

Workflow/integration-heavy, not code-heavy (at MVP)

Why:

Core complexity = ingestion + parsing + routing

Not UI or business logic

System is:

event-driven

LLM-assisted pipelines

external integrations (Mailgun, Gmail, Resend)

👉 This is why n8n currently fits well

🔄 Phasing (What’s already implied)
🟢 Phase 1 — MVP (current target)

Goal: Detect subscriptions reliably from email

Mailgun ingestion

LLM parsing

Supabase storage

Basic UI or even no UI (email-first possible)

Manual forwarding OK

👉 Success metric:

“User forwards emails → sees subscriptions correctly”

🟡 Phase 2 — Automation & Coverage

Gmail OAuth ingestion (auto-scan inbox)

Better deduplication

Subscription grouping + normalization

Improved classification accuracy

🟠 Phase 3 — Intelligence Layer

Spend analytics:

monthly burn

category breakdown

“Unused subscription” detection (stretch)

Cross-signal matching (email + bank)

🔴 Phase 4 — Action Layer (big unlock)

Cancellation assistance:

links

workflows

possibly automation

Benchmark dataset (you explicitly mentioned this):

“How hard is it to cancel X?”

👉 This becomes a data moat / monetizable asset

💡 Unique Strategic Angles You’ve Identified
1. Cancellation dataset

Scraping cancellation flows

Comparing friction across providers

👉 This is rare and valuable data

2. Email-native onboarding

No app friction

Works via:

alias

forwarding

3. “Passive tracking” vs competitors

Most tools:

require manual input

or bank linking

SubSounder:

builds truth from real-world signals automatically

⚠️ Constraints & Decisions You’ve Made
1. MVP speed > perfection

Prefer:

n8n workflows

LLM-assisted parsing

Avoid:

premature backend rewrites

2. Token + cost awareness

LLM used selectively

Structured outputs required

Logs include metadata

3. Multi-tenant from day 1

pods abstraction (even if hidden in MVP)

🧭 Where You Are Right Now

You are very close to a functional MVP backend:

✔ Mailgun ingestion
✔ Parsing workflow
✔ Supabase schema
✔ LLM classification
✔ Early email flows (Resend)

What’s left (high leverage):

Tighten parsing accuracy

Define “subscription creation rules”

Build minimal user-facing surface (even email-based)

Close the loop: user sees value quickly