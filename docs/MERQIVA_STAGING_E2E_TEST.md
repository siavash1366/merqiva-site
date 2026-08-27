# Merqiva V2 — Staging E2E Test Runbook

## Goal
Validate the complete Research → Qualification → Opportunity pipeline without creating a real customer-facing claim or sending outreach.

## Preconditions
- Deploy the `merqiva-v2-product-finalization` branch to a staging environment.
- Configure `RESEARCH_N8N_WEBHOOK_URL`.
- Configure `RESEARCH_N8N_WEBHOOK_SECRET`.
- Configure `RESEARCH_CALLBACK_SECRET`.
- Configure the same callback secret in n8n as `MERQIVA_RESEARCH_CALLBACK_SECRET`.
- Configure an authorized LLM provider in n8n using environment variables; never commit credentials.
- Use a permitted public signal source/feed/API and respect its terms, rate limits and privacy requirements.

## Test case E2E-001
1. Open Admin → Operations & Quality.
2. Create a research job with a narrow test query, e.g. a maritime product and GCC market.
3. Confirm the job is created as `QUEUED` and then becomes `RUNNING` only when dispatch succeeds.
4. Confirm n8n receives the job and rejects requests with an invalid dispatch secret.
5. Confirm the workflow retrieves only the configured/authorized source data.
6. Confirm the AI returns strict JSON and does not invent a company, signal, person, score or URL.
7. Confirm every returned opportunity has evidence fields and that unknown decision-maker fields remain `UNKNOWN` rather than being guessed.
8. Confirm n8n sends the callback with the correct callback secret.
9. Confirm Merqiva rejects an invalid callback secret with HTTP 401.
10. Confirm valid results are normalized through Opportunity Intelligence and stored once.
11. Confirm the Research Job becomes `COMPLETED` and its `resultCount` matches created opportunities.
12. Open the resulting opportunity in CRM/Admin and verify scoring, evidence, why-now and decision-maker fields are visible.
13. Verify no outreach/email/message was sent during this test.

## Negative tests
- Missing dispatch secret → configuration error / no dispatch.
- Invalid callback secret → 401.
- Missing productName or researchQuestion → 400.
- Malformed AI JSON → workflow fails; no malformed opportunity is stored.
- Opportunity without companyName/productName → ignored.
- Empty evidence → opportunity may be stored only if the existing normalization policy permits it; otherwise reject and document.

## Acceptance criteria
- No secret appears in Git history or browser-visible source.
- A valid test job travels through the complete pipeline.
- Invalid authentication cannot create or modify research results.
- No fabricated evidence is accepted as verified fact.
- Research output is traceable to a job ID.
- No customer outreach is triggered automatically by the staging test.

## Result recording
Record PASS/FAIL for each test and capture only non-sensitive IDs, timestamps, error classes and screenshots. Do not place API keys, bearer tokens, customer PII or private source credentials in the repository.

## Production gate
Do not merge or advertise autonomous research as production-ready until E2E-001 and all negative tests pass in staging and customer-facing terms/privacy/compliance have been reviewed.