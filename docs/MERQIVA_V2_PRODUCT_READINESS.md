# Merqiva V2 Product Readiness

## Product promise
Merqiva is positioned as GCC maritime B2B sales intelligence: identify accounts that fit what a supplier sells, explain why the account matters now, verify the relevant decision maker, preserve evidence, prioritize the opportunity, and support targeted outreach.

## Implemented foundations in this branch
- Opportunity scoring and evidence-first qualification already present in the existing core.
- Public-site quality promise explaining replacement-based quality assurance rather than promising sales outcomes.
- Secure market-signal ingestion endpoint for authorized n8n/API workflows.
- Admin monitoring configuration and ingestion status endpoint.
- Admin operations dashboard for monitoring and guarantee status.
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
- Fully automated source-specific monitoring connectors.
- AI agent orchestration and autonomous research.
- Learned scoring model based on sufficient outcome history.
- Formal legal review of the privacy/terms copy for the actual operating jurisdiction and customer contracts.

These are intentionally separated from the current branch so the product does not claim capabilities that are not actually operational.
