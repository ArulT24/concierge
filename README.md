# Concierge

AI event-planning backend with a web intake flow and a Twilio-powered WhatsApp intake path.

## Web app (Next.js)

The frontend in this repo is a small Next.js app focused on the **marketing landing** (`/`) and two authenticated surfaces:

- **`/chat`** — **Waitlist survey** only (scripted Bertram intros, then free-form interest). The client always sends `flow: waitlist_survey` on new sessions. Survey fields live on `events` (`planning_interest_raw`, `planning_interest_category`, `waitlist_survey_completed_at`); run migration [`backend/database/migrations/004_waitlist_survey_analytics.sql`](backend/database/migrations/004_waitlist_survey_analytics.sql) if you have not yet.
- **`/kids-bday`** — **Kids birthday intake** (`ConversationAgent`, vendor research when ready). The client sends `flow: party_intake`. Allowed only if the signed-in email has **party planning access** (table `party_planning_access` or env **`PARTY_PLANNING_ALLOWLIST_EMAILS`**). Others get HTTP 403. Send graduates to this URL after they’re off the waitlist.

- **Auth:** Google sign-in via Auth.js (`/api/auth/*`). The landing CTA uses `signIn` with `callbackUrl: /chat`.
- **New session API:** `POST /api/chat` must include JSON `flow`: `waitlist_survey` or `party_intake`. Next forwards `X-User-Email` when signed in. **WhatsApp** stays phone-based birthday intake only.
- **Optional hardening:** When **`INTERNAL_CHAT_SECRET`** is set in both Next (`INTERNAL_CHAT_SECRET`) and FastAPI (`internal_chat_secret`), the chat routes require matching header `X-Internal-Chat-Secret`.
- **API routes (Next → FastAPI):** `/api/chat`, `/api/chat/[sessionId]`, `/api/events/[sessionId]`, and `/api/waitlist` proxy to `BACKEND_URL` on the Python service.
- **Backend-only:** `POST /api/landing-waitlist` on FastAPI still accepts email-only signups for alternate landings or scripts. The default Next landing uses Google sign-in instead, and the old Next proxy for `landing-waitlist` was removed.
- **Run locally:** `npm install` then `npm run dev` (default [http://localhost:3000](http://localhost:3000)), with the backend on port 8000 and `BACKEND_URL` set accordingly (see `.env.example`).

`proxy.ts` can enable **landing-only** mode when **`LANDING_ONLY=1`** (opt-in). In that mode, random app routes return 404, but **`/api/chat`**, **`/api/waitlist`**, and **`/api/events`** are always allowlisted (they run on Node and proxy to FastAPI; blocking them on the Edge layer caused 404s before the route handler ran). By default the full Next app is served (no env var needed on Vercel).

Operational UIs for the vendor **search / pipeline** used to live under Next.js (`/pipeline`, `/search-dashboard`, etc.); those pages were removed. Pipeline and search HTTP APIs remain on **FastAPI** for workers, scripts, and direct calls (see **Vendor pipeline** below).

## Backend setup

### Prerequisites

- Python 3.12+
- Postgres
- OpenAI API key
- Twilio account with WhatsApp sandbox or production sender

### Install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

### Environment variables

Set these in `.env.local`:

```bash
DATABASE_URL=postgresql+asyncpg://...
OPENAI_API_KEY=...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=anant@bertram.cool

# Optional: enrich vendor URLs (Browserbase + Playwright)
BROWSERBASE_API_KEY=...
BROWSERBASE_PROJECT_ID=...
```

After installing deps, install the Playwright browser bundle (needed for the Playwright client, including CDP connects):

```bash
playwright install chromium
```

Vendor enrichment uses `backend.services.search.browserbase_client.scrape_vendor_page` (async) or `scrape_vendor_page_sync` (blocking). Celery workers need the same Browserbase env vars if you run enrichment in tasks.

**Anthropic** (fit scoring after scrape): set `ANTHROPIC_API_KEY` in `.env.local`. Optional: `ANTHROPIC_MODEL` (default `claude-3-5-sonnet-20241022`).

**Resend** (waitlist confirmation email): set `RESEND_API_KEY` and a verified sender `RESEND_FROM_EMAIL` (optional `RESEND_FROM_NAME`, defaults to `Bertram`). New `POST /api/landing-waitlist` signups enqueue a non-blocking confirmation email; repeated upserts do not resend it.

### Vendor pipeline (Exa → Browserbase → score)

After all four Exa category tasks finish, a **Celery chord** runs `finalize_vendor_pipeline`: shortlists top URLs per category, scrapes with Browserbase, scores with Anthropic vs `events.requirements`, writes **`vendor_candidates`** and **`event_options`**, then sets `events.status` to **`ready`**.

**Database upgrade (existing Supabase / Postgres):** run the SQL in `backend/database/migrations/002_vendor_pipeline.sql` once (SQL editor). New installs can use the full `backend/database/schema.sql`.

**Inspecting pipeline state:** use the FastAPI OpenAPI UI at [http://localhost:8000/docs](http://localhost:8000/docs) (tag **pipeline**), or call `GET /api/pipeline/{event_id}` on the backend—for example:

```bash
curl "http://localhost:8000/api/pipeline/<EVENT_UUID>"
```

That response includes per-candidate stages, counts, and ranked `event_options`. To enqueue finalize manually when Exa data exists but candidates are missing, use `POST /api/pipeline/{event_id}/finalize` (also documented under `/docs`). **Search** run status and category results are available under the **search** tag (`/api/search/...`) on the same server.

## Run the backend

```bash
source .venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

## WhatsApp webhook

The backend now exposes:

```bash
POST /webhooks/twilio/whatsapp
```

Twilio should send the standard inbound WhatsApp webhook fields:

- `From`
- `Body`
- `MessageSid`

The backend will:

1. Normalize the sender phone into `whatsapp:+15551234567` format.
2. Find or create the active event/session for that phone number.
3. Persist the inbound message and Twilio SID.
4. Run the existing conversation agent.
5. Send the assistant reply back through Twilio.
6. Persist the outbound messages with their returned Twilio SIDs.

Duplicate webhook retries are ignored by checking `MessageSid` before processing.

## Twilio sandbox setup

For development, use the Twilio WhatsApp sandbox:

1. Create a Twilio account.
2. Open the WhatsApp sandbox in the Twilio console.
3. Join the sandbox from your phone using the provided code.
4. Point the sandbox webhook to your public backend URL:

```bash
https://<your-public-host>/webhooks/twilio/whatsapp
```

If you are developing locally, expose your backend with a tunnel such as `ngrok`:

```bash
ngrok http 8000
```

Then copy the public HTTPS URL into the Twilio sandbox webhook config.

## Tests

Run the backend tests with:

```bash
source .venv/bin/activate
python -m pytest backend/tests/test_chat_flow.py
```
