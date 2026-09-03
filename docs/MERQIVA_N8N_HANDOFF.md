# Merqiva n8n Handoff

## Current observed state — 2026-09-03

The n8n instance is being accessed at `n8n.merqivaintel.com`.

The screen recording shows two workflows:

1. `My workflow 2`
   - Webhook (`POST`) → Telegram `Send a text message`.
   - Webhook path shown in the editor: `merqiva-sales-alert`.
   - The Telegram credential named `Telegram account` is already available and the Telegram connection has been tested successfully.
   - The editor currently shows `Basic Auth` on the Webhook while the Basic Auth credential selector is empty. This should not be used as the final production security configuration.
   - The workflow list shows this workflow as Published, but the editor may contain unpublished changes. Production behavior must be re-tested after the final version is published.

2. `My workflow`
   - Telegram Trigger → Telegram `Send a text message`.
   - This is currently a basic Telegram connectivity/test workflow and is not the Merqiva production assistant.

## Repository workflow templates

### 1. Website Lead → Telegram Alert

File:

`n8n/Merqiva_Website_Lead_Telegram_Alert.json`

Purpose:

`Merqiva website lead → authenticated n8n webhook → normalized lead → Telegram alert`

Security model:

- Header: `X-Merqiva-Alert-Secret`
- n8n environment variable: `MERQIVA_SALES_ALERT_SECRET`
- Telegram destination: `MERQIVA_TELEGRAM_CHAT_ID`
- No Telegram chat ID or secret is stored in GitHub.

The workflow is intentionally committed with `active: false` so it cannot become live before the required values and Telegram credential are configured.

### 2. AI Maritime Research Agent

File:

`n8n/Merqiva_AI_Maritime_Research_Agent_MVP.json`

Purpose:

`Merqiva Admin → authenticated n8n research webhook → public signals → LLM qualification → structured opportunities → callback to Merqiva`

This is the next major workflow after the lead alert is stable.

## Required n8n/VPS environment variables

Do not put these values in GitHub.

For Telegram lead alerts:

- `MERQIVA_SALES_ALERT_SECRET`
- `MERQIVA_TELEGRAM_CHAT_ID`

For AI research:

- `MERQIVA_RESEARCH_WEBHOOK_SECRET`
- `MERQIVA_RESEARCH_CALLBACK_SECRET`
- `MERQIVA_LLM_API_KEY`
- `MERQIVA_LLM_API_URL`
- `MERQIVA_LLM_MODEL`

## Required Cloudflare environment variables

These are configured on the Merqiva website deployment, not in GitHub source.

Research integration:

- `RESEARCH_N8N_WEBHOOK_URL`
- `RESEARCH_N8N_WEBHOOK_SECRET`
- `RESEARCH_CALLBACK_SECRET`

The repository already exposes configuration booleans through `/api/health` and the admin system-check endpoint for the research integration.

For the website lead alert integration, the website-side dispatch will be added only after the n8n production webhook is ready and tested. The notification must be best-effort: an n8n/Telegram outage must never make the customer contact form fail.

## Recommended production order

1. Keep the existing simple workflows as test/reference workflows; do not delete them yet.
2. Import `Merqiva_Website_Lead_Telegram_Alert.json` into n8n.
3. Select the already-working `Telegram account` credential on `Send Lead Alert to Telegram`.
4. Configure `MERQIVA_SALES_ALERT_SECRET` and `MERQIVA_TELEGRAM_CHAT_ID` on the n8n server.
5. Publish the workflow and copy its Production URL.
6. Test the webhook with one controlled sample payload.
7. Only after the Telegram alert test succeeds, connect the Merqiva website contact flow to the production webhook.
8. Import/configure the AI Maritime Research Agent.
9. Run an end-to-end research job and confirm callback storage in Merqiva.
10. Audit the n8n chatbot separately before connecting the public website Chatbox to it.
11. Add WhatsApp Business only after the website chat, CRM handoff, and human-escalation behavior are stable.

## Important architecture rules

- n8n is an orchestration layer; it should not become the only copy of customer data.
- Merqiva CRM/KV remains the system of record for website leads and opportunity state.
- Telegram is an operator notification channel, not the CRM.
- Never expose n8n webhook secrets in browser-side JavaScript.
- Never hard-code API keys, Telegram bot tokens, chat IDs, or webhook secrets into the public repository.
- Public chat must have a human-handoff path.
- AI research must keep `verified fact`, `inference`, and `unknown` separate.
- Failure of Telegram/n8n notifications must not block lead capture or customer-facing forms.

## Next manual checkpoint

The next point that requires the account owner is inside n8n/VPS because ChatGPT does not currently have authenticated access to the n8n account.

At that point the owner should be guided one click at a time. The first manual task will be importing the prepared Lead → Telegram workflow and selecting the existing Telegram credential. No passwords, bot tokens, API keys, or webhook secrets should be pasted into chat.
