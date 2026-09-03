# Merqiva n8n Production Status

Updated: 2026-09-03

## Production-verified flow

The following path has been tested end-to-end in production:

`Merqiva website contact form → Cloudflare /api/contact → lead storage/email → n8n production webhook → Normalize Lead → Telegram alert → HTTP 200 acknowledgment`

Verified outcomes:

- Website contact form submitted successfully.
- Customer confirmation email was delivered.
- n8n production webhook returned `{ success: true, delivered: "telegram" }`.
- Telegram received the `NEW MERQIVA LEAD` notification.
- Header Auth is enabled on the production n8n webhook.
- Cloudflare stores the matching secret as `N8N_SALES_ALERT_SECRET`.
- The website integration is fail-open for alert delivery: a temporary n8n/Telegram failure does not invalidate an otherwise successful contact-form submission.

## Production webhook

Path:

`https://n8n.merqivaintel.com/webhook/merqiva-sales-alert`

Method: `POST`

Authentication: Header Auth

Expected header name:

`X-Merqiva-Alert-Secret`

Do not store the secret value in Git, documentation, screenshots, or chat logs.

## Production n8n node chain

`Merqiva Sales Alert → Normalize Lead → Send Lead Alert to Telegram → Acknowledge Alert`

The older test workflow should remain unpublished so it does not conflict with the production webhook path.

## Website integration

Cloudflare middleware file:

`functions/api/_middleware.js`

The middleware only sends an n8n notification after `/api/contact` returns a successful response containing a `leadId`.

Cloudflare secret required:

`N8N_SALES_ALERT_SECRET`

## Security notes

- Keep Header Auth enabled.
- Never expose Telegram bot tokens or the webhook secret in client-side JavaScript.
- The website sends the alert server-to-server from Cloudflare Functions.
- Rotate the Header Auth secret if it is ever exposed.
- Keep the old conflicting workflow unpublished.

## Next recommended n8n work

1. Import and validate `Merqiva_AI_Maritime_Research_Agent_MVP.json` on the VPS-hosted n8n instance.
2. Connect the website/admin research job to the n8n research webhook and callback.
3. Audit the existing n8n chatbot before replacing the current website chat backend.
4. Add error notifications for failed production workflows.
5. Add WhatsApp Business only after the website chat + CRM handoff flow is stable.
