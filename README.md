# Jarvis — CertifyMe.net Operations Cockpit

Internal AI-powered operations dashboard for CertifyMe.net (OSHA forklift/equipment certification e-commerce).

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your Anthropic API key
cp .env.example .env.local
# Edit .env.local — set ANTHROPIC_API_KEY

# 3. Initialize database
npm run db:push

# 4. Seed with stub data
npm run db:seed

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — log in with `admin` / `changeme` (or whatever you set in `.env.local`).

---

## Architecture

```
/app                  Next.js App Router pages and API routes
  /(app)              Authenticated app shell (with nav)
    /dashboard        Daily briefing + KPI cards + pending approvals
    /chat             Conversational Jarvis interface
    /approvals        ProposedAction review queue
    /support          Support inbox (read-only)
    /ads              Ad performance tables
    /research         Web search interface
  /api                REST API routes
    /api/chat         POST: send message to Jarvis
    /api/approvals    GET/PATCH: list and act on proposed actions
    /api/briefing     GET: today's briefing
    /api/support      GET: support messages
    /api/research     GET: search results
    /api/auth/login   POST: login
    /api/auth/logout  POST: logout

/lib
  /adapters           Data source abstraction layer
    types.ts          TypeScript interfaces for all adapters
    index.ts          Registry — selects stub vs real based on USE_STUBS
    /stub             Stub implementations with realistic fake data
  /agents             Agent definitions (name, systemPrompt, tools[])
    analytics.agent   Revenue, orders, traffic, course data
    support.agent     Read messages, propose replies
    ads.agent         Ad performance, propose budget changes
    research.agent    Web search
    content.agent     (stub — coming soon)
    dev.agent         (stub — coming soon)
  orchestrator.ts     Jarvis chat function — Anthropic SDK + agentic tool loop
  briefing.ts         Daily briefing assembly + DB cache
  actions.ts          ProposedAction CRUD + approve/reject/execute
  auth.ts             Session cookie auth (see hardening TODO inside)
  prisma.ts           Prisma client singleton

/prisma
  schema.prisma       DB schema: Conversation, Message, ProposedAction, DailyBriefing
  seed.ts             Seed script with realistic stub data

middleware.ts         Auth gate — redirects unauthenticated requests to /login
```

### How the Orchestrator Works

1. User message hits `POST /api/chat`
2. `lib/orchestrator.ts` loads conversation history from DB
3. Sends to Claude (model set by `ANTHROPIC_MODEL` env var, default `claude-sonnet-4-6`) with all agent tools attached
4. If the model calls a tool → execute it, feed result back, loop
5. Read tools (analytics, support reads, ads reads, research) execute immediately
6. Write tools (propose_reply, propose_budget_change, etc.) call `createProposedAction()` — never side-effect directly
7. Final assistant reply is persisted and returned to the UI

### Action / Approval Flow

```
Agent proposes action → ProposedAction(status=pending)
Operator reviews in /approvals → approve or reject
If approved → operator clicks Execute → status=executed
(In this pass: execute just marks status. Real side effects plug in to executeAction() in lib/actions.ts)
```

---

## Where Real Integrations Plug In

Each adapter has a stub and a clear interface. To wire up a real service:

1. Create `lib/adapters/real/<name>.ts` implementing the interface from `lib/adapters/types.ts`
2. Register it in `lib/adapters/index.ts` (the `resolveAdapter` call)
3. Set `USE_STUBS=false` in `.env.local`
4. Add the required API keys to `.env.local` (see `.env.example` for the full list)

| Adapter | Interface | Real Service | Key env vars |
|---------|-----------|--------------|--------------|
| `analyticsAdapter` | `AnalyticsAdapter` | Shopify Admin API (orders/revenue) + GA4 Data API (traffic) | `SHOPIFY_ACCESS_TOKEN`, `GA4_PROPERTY_ID`, `GA4_SERVICE_ACCOUNT_JSON` |
| `adsAdapter` | `AdsAdapter` | Facebook Marketing API + Google Ads API | `FACEBOOK_ACCESS_TOKEN`, `FACEBOOK_AD_ACCOUNT_ID`, `GOOGLE_ADS_*` |
| `supportAdapter` | `SupportAdapter` | Gmail API (or Helpscout/Zendesk) | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` |
| `researchAdapter` | `ResearchAdapter` | Brave Search API or Perplexity | `BRAVE_SEARCH_API_KEY` |

### Executing Approved Actions

`lib/actions.ts → executeAction()` has a commented-out switch statement. Fill it in per action type:

| Action type | Real execution |
|-------------|----------------|
| `SEND_REPLY` | Gmail API `users.messages.send` |
| `CHANGE_BUDGET` | Facebook Graph API `adset/{id}` PATCH or Google Ads API |
| `PAUSE_CREATIVE` | Facebook/Google Ads API — set status to PAUSED |

---

## Security Hardening Before Remote Hosting

See the TODO block in `lib/auth.ts` for the full checklist. Short version:

- Replace env-based credentials with NextAuth.js + a real provider
- Enforce HTTPS
- Add rate limiting on `/api/auth/login`
- Use a strong `SESSION_SECRET`
- Consider IP allowlisting for internal-only access

---

## Database

SQLite locally. To switch to Postgres:

1. Change `prisma/schema.prisma` `provider` from `"sqlite"` to `"postgresql"`
2. Update `DATABASE_URL` in `.env.local` to a Postgres connection string
3. Run `npm run db:migrate` (not `db:push`) for production migrations
