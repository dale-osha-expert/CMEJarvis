# Jarvis — Developer Handoff

Internal operations cockpit for **certifyme.net**. This document is for the engineer wiring up **RBE** (real backend revenue) and deploying Jarvis to the internal server.

> **Scope of this handoff:** the app is feature-complete and runs against **real Google Ads + Meta Ads data** (read-only). Two things are intentionally left for you: (1) connecting **RBE** so revenue/sales figures are real, and (2) **deploying** to the internal server. Both are called out below.

> **Note on paths:** file paths and variable names below reflect the build as delivered. Verify against the actual repo tree before relying on any single path — a `grep` for the symbol names will find anything that has moved.

---

## 1. Quickstart (local)

```bash
npm install
cp .env.example .env.local      # then fill in the values (see §3)
npx prisma migrate dev          # or `npx prisma db push` for SQLite
npm run dev                     # http://localhost:3000
```

Stack: **Next.js (App Router) + TypeScript + Tailwind**, **Prisma** (SQLite locally, Postgres-swappable), **Anthropic SDK** (orchestrator/agents + live web search), **OpenAI TTS** (spoken briefing).

---

## 2. The RBE integration (primary handoff task)

The Summary tab shows three values sourced from **RBE — the real storefront/backend revenue**. They currently return `null` and render as **"— / Pending RBE"**. Your job is to make them real.

### Where to wire it

**File:** `lib/adapters/rbe/rbe.placeholder.ts`

It implements the `RbeAdapter` interface (`lib/adapters/rbe/types.ts`):

```ts
getActualRevenue(start: Date, end: Date): Promise<number | null>   // real revenue for the window
getTotalSales(start: Date, end: Date): Promise<number | null>      // real order/sales count for the window
```

Replace the placeholder bodies (which return `null`) with real queries against the storefront. Both methods are **range-aware** — they receive the exact start/end of the window the Summary tab is showing, so return figures scoped to that range. Keep the adapter exported via `lib/adapters/rbe/index.ts`.

### Credentials

`.env.example` has a commented **RBE** section:

```
# RBE_API_URL=
# RBE_API_KEY=
```

Uncomment and fill these (or swap for a direct DB connection string if RBE is a database rather than an API — your call, just keep it behind the adapter).

### What lights up once it's wired

The Summary tab (`app/(app)/ads/page.tsx`, `SummaryTab`) automatically computes and displays:

| Card | Formula | Notes |
|---|---|---|
| **RBE Actual Rev** | `getActualRevenue(start, end)` | real backend revenue |
| **RBE Total Sales** | `getTotalSales(start, end)` | real order count |
| **Actual MER** | `RBE Actual Rev / Total Ad Spend` | the trustworthy headline metric — see below |

**Why MER matters:** "Actual MER" (Marketing Efficiency Ratio) divides *real backend revenue* by *real ad spend*, so it does **not** depend on either platform's self-reported conversion tracking. Platform-reported "Blended ROAS" is unreliable right now because Google's conversion value is under-reporting (see §6). Once RBE is live, **MER is the number to trust**, and it's worth promoting to the top of the daily briefing (currently the briefing still uses blended ROAS — `lib/briefing.ts` / `lib/spoken-briefing.ts`).

The Summary tab also shows **"Platform Revenue (Google+Meta reported)"** next to **RBE Actual Rev** on purpose: the gap between those two cards is the size of the platform attribution/tracking shortfall, visualized.

### Do NOT

- Do **not** backfill the RBE fields from the stubbed analytics revenue. `null` → "Pending RBE" is the correct resting state until real data is connected. A fabricated value here would make MER look real while being fiction.

### Also still stubbed (related)

`AnalyticsAdapter` (revenue/orders for the **dashboard revenue chart and the daily briefing**) is **also stub data** — it was never wired to the storefront. While you're connecting RBE, consider pointing the analytics revenue at the same real source, otherwise the morning briefing keeps reciting invented revenue. Same adapter pattern: `lib/adapters/` → swap the stub for a real implementation behind the existing interface.

---

## 3. Environment variables

| Variable | Purpose | Status |
|---|---|---|
| `DATABASE_URL` | Prisma connection (SQLite local → Postgres on server) | set |
| `ANTHROPIC_API_KEY` | Orchestrator, agents, live web search | set |
| `ANTHROPIC_MODEL` | Model string (single source of truth, `lib/config.ts`) — default `claude-sonnet-4-6` | set |
| `USE_STUBS` | Global stub toggle for adapters | set |
| **Google Ads** | | |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | API access (must be **Basic** access or higher — see §6) | set |
| `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` | OAuth client (refresh token is bound to this exact client) | set |
| `GOOGLE_ADS_REFRESH_TOKEN` | OAuth refresh token (see §6 if it expires) | set |
| `GOOGLE_ADS_CUSTOMER_ID` | 10 digits, no dashes | set |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Manager/MCC id (header) | set |
| `GOOGLE_ADS_USE_STUB` | Force Google stub (debug/fallback) | optional |
| **Meta Ads** | | |
| `META_APP_ID` / `META_APP_SECRET` | Meta app | set |
| `META_ACCESS_TOKEN` | Should be scoped **`ads_read`** only (read-only at the credential) | set |
| `META_AD_ACCOUNT_ID` | The `act_<id>` account id | set |
| `META_GRAPH_VERSION` | Pinned Graph API version | set |
| `META_ADS_USE_STUB` | Force Meta stub (debug/fallback) | optional |
| **Spoken briefing (TTS)** | | |
| `TTS_PROVIDER` | `stub` \| `openai` \| `elevenlabs` | set (`openai`) |
| `OPENAI_API_KEY` | Required when `TTS_PROVIDER=openai` | set |
| `OPENAI_TTS_MODEL` | default `gpt-4o-mini-tts` | set |
| `TTS_VOICE` | OpenAI voice (e.g. `echo`) | set |
| `CRON_SECRET` | Protects the daily-briefing cron endpoint — **keep this even after login removal** | set |
| `BRIEFING_TIMEZONE` | Cron schedule tz (default `America/New_York`) | set |
| **RBE** | | |
| `RBE_API_URL` / `RBE_API_KEY` | **You fill these** (§2) | **TODO** |

Never log secret values. The startup line logs only resolved *modes* (e.g. `[ADS] google=real meta=real`) and whether keys are present.

---

## 4. Architecture (orientation)

- **Adapters** (`lib/adapters/`) — data sources behind interfaces, each with a stub + real impl: `analytics`, `ads` (provider pattern: `google`, `meta`, aggregated by `service.ts`), `research` (live web search), `rbe`, and `support` (**parked**, see below).
- **Agents** (`lib/agents/`) — Analytics, Ads, Research (active); Support, Content, Dev (stubbed/parked).
- **Orchestrator** (`lib/orchestrator.ts`) — Anthropic tool-use loop. Read tools run inline; **write tools never side-effect** — they create a `ProposedAction` row for human approval. History capped at last ~40 messages/turn.
- **Approval system** (`ProposedAction` table, `lib/actions.ts`) — **parked but intact**. `executeAction()` has **no dispatch path to Google or Meta** (the write switch is commented). This is the safety gate for if/when write actions are ever enabled. Do not wire writes without re-introducing approval enforcement.
- **Briefing** — `lib/briefing.ts` (text) and `lib/spoken-briefing.ts` (script → TTS → `storage/briefings/{date}.mp3` + DB row). Persona/voice are named consts at the top of those files / `lib/tts/openai.provider.ts`.
- **Cron** — `instrumentation.ts` runs an in-process `node-cron` job at 01:00 (`BRIEFING_TIMEZONE`) hitting the generation path. See §5 for the server-side recommendation.
- **Chat memory** — `components/ChatContext.tsx` holds conversation state above the router, so it survives tab switches. **Resets on full page reload** (by design; no persistence layer).

**Read-only is a hard constraint.** The app never creates/updates/pauses/deletes anything on Google or Meta. Meta uses GET-only; Google uses query/report only (never `mutate*`). A grep for write calls should return only comments.

---

## 5. Deploying to the internal server

1. **PROTECT THE APP AT THE NETWORK LAYER — REQUIRED.** The in-app login has been removed (handled elsewhere). The app now authenticates nothing itself, yet it holds live Google + Meta tokens and can read all ad data. **It must sit behind SSO / a reverse proxy / VPN / network isolation.** Do not expose it on an open URL.
2. **Keep `CRON_SECRET`.** The daily-briefing endpoint (`POST /api/cron/daily-briefing`) stays protected by the `X-Cron-Secret` header independently of user auth — otherwise anyone hitting it triggers paid TTS generation.
3. **Database:** swap SQLite → **Postgres** by changing `DATABASE_URL` and running `npx prisma migrate deploy`. Prisma schema is Postgres-compatible.
4. **Cron:** prefer an **OS crontab** (or the platform scheduler) hitting `POST /api/cron/daily-briefing` with the `X-Cron-Secret` header, rather than the in-process `node-cron` — Next.js can spawn multiple workers, so the in-process job can fire more than once. The endpoint is idempotent (skips if today is already `ready` unless `?force=true`), and the `SpokenBriefing.date` unique constraint guards duplicates, but one external cron is the sturdier pattern.
5. **Persistent storage:** `storage/briefings/` must persist (volume mount) — generated MP3s live there and are served via `/api/briefings/[date]/audio`.
6. **Secrets:** move everything in `.env.local` into the server's secret manager / environment. Don't bake secrets into the image.
7. Build & run: `npm run build && npm run start`.

---

## 6. Troubleshooting

### Google Ads

- **`invalid_grant`** — refresh token issue. Most common cause: the OAuth consent screen is in **"Testing"** publishing status, which expires refresh tokens after 7 days. Fix: set publishing status to **"In production."** Regenerate via the OAuth2 Playground (Use-your-own-credentials, scope `https://www.googleapis.com/auth/adwords`, offline access). The refresh token is **bound to the exact `CLIENT_ID`** that generated it — if you regenerate with a different client, update `GOOGLE_ADS_CLIENT_ID/SECRET` to match.
- **MFA requirement (since Apr 21, 2026):** generating a *new* refresh token requires the authorizing Google account to have 2-Step Verification enabled. Without it, token generation fails.
- **`USER_PERMISSION_DENIED` / empty results on a real account** — usually the **developer token is at "Test" access**, which can only query test accounts. Request **Basic** access in the Google Ads API Center. Also confirm `GOOGLE_ADS_LOGIN_CUSTOMER_ID` is the **manager (MCC)** id, not the child account.
- **`CUSTOMER_NOT_FOUND`** — `GOOGLE_ADS_CUSTOMER_ID` must be 10 digits, no dashes.
- **Suspiciously low ROAS (e.g. < 0.5x on high spend)** — this is almost certainly a **conversion-tracking / value-import gap**, NOT the channel failing. Google's `metrics.conversions_value` only reflects what the conversion action captures; if it tracks lead-form submits (or has no value assigned) instead of the $59.95 sale, ROAS reads far too low. **Verify against the Google Ads UI** for the same date range; fix is in the conversion action config, not in this app. Jarvis is prompted to treat this as "verify tracking," not as a verdict — but it distorts every Google ROAS the dashboard shows until corrected. **This is an open item worth resolving early.**

### Meta Ads

- **OAuth/permission errors** — confirm `META_ACCESS_TOKEN` is valid and scoped `ads_read`. Account id must include the `act_` prefix as expected by the provider.
- **Deprecated Graph version** — bump `META_GRAPH_VERSION` to a current stable version.
- **Null/missing ROAS on some days** — days with no purchase events return `null` ROAS (intentional gap in the chart line), not an error.

### Model / API

- **`not_found_error` on the model** — a model string was retired. It's pinned in **one place**: `ANTHROPIC_MODEL` in `.env` (default in `lib/config.ts`). Update that single value; there are no hardcoded model strings elsewhere.

### TTS / spoken briefing

- **Generation fails** — the row is marked `failed` with the error; the dashboard button shows a retry. Falls back gracefully; you can set `TTS_PROVIDER=stub` to keep the pipeline running (stub emits a **silent** WAV — silence is expected, not a bug).
- **Wrong content-type on audio** — OpenAI path writes `.mp3` (`audio/mpeg`); stub writes `.wav`. Each sets its own mimeType on the DB row; the streaming route serves per-file.

### Chat

- **Conversation resets** — expected on full page reload (memory lives in React context, no persistence by design). It survives tab/route changes.
- **Raw markdown in bubbles** — assistant messages render via `react-markdown`; if you see literal `**`/`#`, confirm that component is in the render path.

---

## 7. Known data caveats (read before trusting a number)

- **Revenue & orders in the daily briefing / revenue chart are STUB** until the analytics adapter is wired (§2). The **ads** half of the briefing is real; the **revenue** half is not, yet.
- **RBE Actual Rev / Actual MER / RBE Total Sales** show "Pending RBE" until you connect RBE (§2).
- **Google ROAS is understated** due to the conversion-tracking gap (§6) until fixed in Google Ads.
- **Meta data is real and trustworthy** (read-only, real purchase values).
