# Merqiva V2 Product Readiness

## Product promise
Merqiva is positioned as GCC maritime B2B sales intelligence: identify accounts that fit what a supplier sells, explain why the account matters now, verify the relevant decision maker, preserve evidence, prioritize the opportunity, and support targeted outreach.

## Implemented foundations in this branch
- Opportunity scoring and evidence-first qualification already present in the existing core.
- Public-site quality promise explaining replacement-based quality assurance rather than promising sales outcomes.
- Secure market-signal ingestion endpoint for authorized n8n/API workflows.
- Admin monitoring configuration and ingestion status endpoint.
- Admin operations dashboard for monitoring, research jobs and guarantee status.
- Provider-agnostic AI Research Agent orchestration: secure research-job creation, optional n8n dispatch, authenticated callback and opportunity creation.
- Configurable guarantee criteria: minimum score, verified evidence, Why Now confidence, decision-maker verification, period and replacement policy.
- Public privacy and service-terms pages.
- GitHub Actions JavaScript syntax/file validation.

## Important operational distinction
The monitoring endpoint is an ingestion boundary, not a claim that Merqiva independently crawls the entire web. Continuous monitoring must be supplied by authorized APIs, feeds or workflows. The external workflow should validate source permission, rate limits, terms of use and data rights before sending a signal.

## Recommended production sequence
1. Deploy the branch to a staging environment.
2. Configure `MONITORING_INGEST_SECRET` as a secret; never commit it.
3. Connect one permitted n8n signal source and send a test signal.
4. Verify deduplication, evidence normalization and opportunity creation.
5. Configure guarantee criteria based on the actual paid plan, not marketing assumptions.
6. Test contact form, Turnstile, email delivery, suppression and unsubscribe paths.
7. Review the public pages on desktop/mobile and both supported languages.
8. Run the GitHub Actions validation workflow.
9. Only then merge to `main` and deploy production.

## Not represented as finished yet
- Payment processor/subscription billing integration.
- Customer self-service authentication and tenant isolation.
- Fully automated source-specific monitoring connectors and source-specific research workflows.
- Learned scoring model based on sufficient outcome history.
- Formal legal review of the privacy/terms copy for the actual operating jurisdiction and customer contracts.

These are intentionally separated from the current branch so the product does not claim capabilities that are not actually operational.

## AI Research Agent contract
The Admin Research Agent creates a job describing the product, market, research question and qualification context. If `RESEARCH_N8N_WEBHOOK_URL` is configured, Merqiva dispatches the job to the authorized n8n workflow. The workflow must return results to `/api/research/callback` with `X-Merqiva-Research-Callback-Secret`.

Each returned opportunity should include:
- companyName and productName
- scoring inputs
- whyNow
- buyingSignals
- decisionMaker data
- evidence items with sourceName/sourceUrl/observedAt/evidenceLevel

Merqiva normalizes the result through the shared Opportunity Intelligence core before storing it. The callback is intentionally authenticated and does not accept unauthenticated research results.

### Recommended n8n flow
Trigger/Schedule -> Retrieve permitted sources -> AI research/extraction -> Evidence validation -> Structured JSON -> POST /api/research/callback

The workflow should obey each source's terms, rate limits and applicable data/privacy requirements.

## n8n starter workflow
Import `n8n/Merqiva_AI_Maritime_Research_Agent_MVP.json` into n8n. The workflow:
1. receives the Merqiva research job webhook,
2. rejects requests without the shared `X-Merqiva-Research-Secret`,
3. normalizes the job,
4. retrieves a public Google News RSS search result as a starter signal source,
5. parses the feed,
6. asks an OpenAI-compatible LLM endpoint for evidence-first structured research,
7. validates the JSON shape,
8. POSTs results to the authenticated Merqiva callback.

### Activation variables
In n8n:
- `MERQIVA_RESEARCH_WEBHOOK_SECRET` — shared secret used to authorize Merqiva -> n8n.
- `MERQIVA_RESEARCH_CALLBACK_SECRET` — shared secret used by n8n -> Merqiva.
- `MERQIVA_LLM_API_URL` — optional OpenAI-compatible chat-completions endpoint; defaults to the OpenAI endpoint.
- `MERQIVA_LLM_API_KEY` — secret API key for the selected provider.
- `MERQIVA_LLM_MODEL` — model name for the selected provider.

In Merqiva/Cloudflare Pages:
- `RESEARCH_N8N_WEBHOOK_URL` — n8n production webhook URL.
- `RESEARCH_N8N_WEBHOOK_SECRET` — same value as n8n `MERQIVA_RESEARCH_WEBHOOK_SECRET`.
- `RESEARCH_CALLBACK_SECRET` — same value as n8n `MERQIVA_RESEARCH_CALLBACK_SECRET`.

Cloudflare Pages Functions expose runtime environment variables/secrets through `context.env`; secrets should be stored as encrypted secrets in the Pages project rather than committed to Git. citeturn0search0turn0search1

Before activation:
- configure the four shared/provider secrets without committing them,
- import the workflow into n8n,
- verify the webhook URL and secret match on both sides,
- run one small research job,
- verify the callback creates opportunities and updates the research job to `COMPLETED`,
- only then activate scheduled/continuous research.

This starter workflow is intentionally conservative: it is not a general web crawler and does not claim unrestricted source access. Add additional permitted source connectors only after validating their terms and data rights.

## Final-product implementation status (excluding n8n activation)
Implemented in the final-product branch/main path:
- strategic public positioning: Signal → Evidence → Qualified Opportunity → Sales Action
- transparent opportunity scoring and qualification gate
- evidence-first research boundaries and decision-maker verification
- sales action pack with recommended person/channel, sales angle, outreach draft and follow-ups
- structured opportunity outcome capture
- commercial performance metrics and outcome summaries
- measurable guarantee-claim workflow
- provider-neutral billing plans/readiness surface (actual payment provider activation remains external configuration)
- public Privacy and Service Terms
- operations and quality dashboard
- automated validation for required product files and n8n workflow contract

Not implemented/activated because they require external infrastructure or live credentials:
- live n8n activation and source connector configuration
- payment-provider account/checkout activation
- production end-to-end test against live external sources
- learned/predictive ranking trained on meaningful historical customer outcomes
- self-service multi-tenant SaaS billing/authentication
