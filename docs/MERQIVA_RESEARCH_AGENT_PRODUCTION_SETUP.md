# Merqiva AI Maritime Research Agent — Production Setup

## Purpose

This workflow accepts a research job from the Merqiva admin backend, immediately acknowledges the dispatch, runs evidence-first web research, validates evidence URLs, and posts qualified opportunities back to Merqiva.

Production flow:

Merqiva Admin → Cloudflare `/api/admin/research` → n8n `/webhook/merqiva-research`
→ OpenAI Responses API + Web Search → Evidence Gate → Merqiva callback
→ Opportunities stored in `LEADS_KV`

## Why this production template is different from the old MVP

- Webhook uses n8n Header Auth instead of `$env` authentication logic.
- Dispatch is acknowledged immediately with HTTP 202 so Merqiva does not wait for a long research run.
- Uses OpenAI Responses API web search instead of only a Google News RSS feed.
- `store:false` is used for the model request.
- Callback URL is restricted to the approved Merqiva HTTPS endpoint.
- Evidence URLs are validated against URLs returned by the web-search response.
- A candidate with no matched VERIFIED FACT evidence is dropped.
- Decision-maker verification is downgraded when its verification URL is not backed by the search response.
- No API keys or callback secrets are committed to GitHub.

## Required n8n credentials

Create three separate Header Auth credentials.

### 1. Merqiva Research Dispatch Auth

Used by node: `Merqiva Research Job`

- Header Name: `X-Merqiva-Research-Secret`
- Header Value: generate a long random secret
- Keep the value private.
- The same value must later be stored in Cloudflare as `RESEARCH_N8N_WEBHOOK_SECRET`.

### 2. OpenAI API Auth

Used by node: `OpenAI Web Research`

- Header Name: `Authorization`
- Header Value: `Bearer <OPENAI_API_KEY>`
- OpenAI API billing is separate from a ChatGPT subscription.

### 3. Merqiva Research Callback Auth

Used by node: `Send Results to Merqiva`

- Header Name: `X-Merqiva-Research-Callback-Secret`
- Header Value: generate a different long random secret
- The same value must later be stored in Cloudflare as `RESEARCH_CALLBACK_SECRET`.

## Cloudflare production variables

After the n8n workflow is configured and published, configure:

- `RESEARCH_N8N_WEBHOOK_URL`
  - `https://n8n.merqivaintel.com/webhook/merqiva-research`
- `RESEARCH_N8N_WEBHOOK_SECRET`
  - same secret as n8n dispatch Header Auth
- `RESEARCH_CALLBACK_SECRET`
  - same secret as n8n callback Header Auth

Do not commit these values to GitHub.

## Model

The production template currently uses:

`gpt-5.6-luna`

The workflow uses the OpenAI Responses API with the hosted `web_search` tool.

This is intentionally the cost-sensitive default. It can later be changed to a stronger model if research quality requires it.

## Expected workflow nodes

1. `Merqiva Research Job`
2. `Normalize Research Job`
3. `Acknowledge Research Job`
4. `OpenAI Web Research`
5. `Validate Evidence & Structure`
6. `Send Results to Merqiva`

## Testing order

Do not publish before credentials are configured.

1. Import the workflow.
2. Configure the three credentials.
3. Test the OpenAI node with a controlled job payload.
4. Test the callback.
5. Publish the workflow.
6. Add the Cloudflare variables.
7. Redeploy Merqiva.
8. Start a research job from Merqiva Admin.
9. Verify:
   - n8n execution accepted the job.
   - OpenAI web research completed.
   - evidence gate retained only sourced opportunities.
   - callback returned 2xx.
   - research job becomes `COMPLETED`.
   - generated opportunities appear in the Merqiva Opportunities interface.

## Security notes

- Never paste API keys or secret values into screenshots or chat.
- Dispatch and callback secrets must be different values.
- Keep the old MVP unpublished after the production workflow is activated so the webhook path does not conflict.
- The callback validator on Merqiva requires evidence items with an HTTPS `sourceUrl`, a title, and a summary.
