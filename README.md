# Concierge

AI event-planning backend with a web intake flow and a Twilio-powered WhatsApp intake path.

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
```

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
