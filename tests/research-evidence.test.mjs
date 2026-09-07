import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import test from 'node:test';

globalThis.crypto ??= webcrypto;
// Override only for demonstrating that the same regression tests fail on main.
const root = process.env.MERQIVA_TEST_ROOT || new URL('../', import.meta.url);
const read = (path) => readFileSync(root instanceof URL ? new URL(path, root) : resolve(root, path), 'utf8');
const workflow = JSON.parse(read('n8n/Merqiva_AI_Maritime_Research_Agent_AvalAI_Production.json'));
const code = workflow.nodes.find((node) => node.name === 'Validate Evidence & Structure').parameters.jsCode;
const execute = new Function('$json', '$node', code);
const moduleUrl = (source) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const coreUrl = moduleUrl(read('functions/api/lib/opportunity-core.js'));
const { normalizeOpportunityPayload } = await import(coreUrl);
const { onRequestPost } = await import(moduleUrl(
  read('functions/api/research/callback.js').replace('"../lib/opportunity-core.js"', JSON.stringify(coreUrl))
));

const url = 'https://example.com/company-update';
const job = {
  jobId: 'RES_TEST_1', productName: 'Marine radio', productId: 'PRODUCT_TEST',
  callbackUrl: 'https://merqivaintel.com/api/research/callback', maxOpportunities: 3
};
function candidate(level = 'VERIFIED FACT') {
  return {
    companyName: 'Synthetic Operator', productName: 'Untrusted product',
    whyNowSummary: 'Synthetic fleet update; equipment demand is unconfirmed.',
    evidence: [{ sourceUrl: url, title: 'Synthetic update', summary: 'Synthetic claim', evidenceLevel: level }],
    decisionMaker: { name: 'Invented Person', role: 'Buyer', confidence: 100, verificationStatus: 'VERIFIED', verificationEvidence: 'Model claim' },
    decisionMakerConfidence: 100, companyFit: 100, productFit: 100,
    scoringComponents: { companyFit: 100, productFit: 100, decisionMakerConfidence: 100 },
    opportunityScore: 100, status: 'Won', outcome: { status: 'PAID' },
    buyingSignals: ['Buy now'], outreachDraft: 'Unreviewed outreach', salesAngle: 'Confirmed demand'
  };
}
function response(items = [candidate()]) {
  return {
    status: 'completed',
    output_text: JSON.stringify({ status: 'COMPLETED', opportunities: items }),
    output: [{ type: 'web_search_call', results: [{ url }] }]
  };
}
function validate(input = response(), overrides = {}) {
  return execute(input, { 'Normalize Research Job': { json: { ...job, ...overrides } } })[0].json;
}
function fixture() {
  const kv = new Map([['research:job:' + job.jobId, JSON.stringify({ ...job, status: 'RUNNING' })]]);
  const env = {
    RESEARCH_CALLBACK_SECRET: 'synthetic-local-test-secret',
    LEADS_KV: {
      get: async (key, options) => options?.type === 'json' ? JSON.parse(kv.get(key) || 'null') : kv.get(key) ?? null,
      put: async (key, value) => { kv.set(key, value); }
    }
  };
  const call = (body, secret = env.RESEARCH_CALLBACK_SECRET, raw = false) => onRequestPost({
    env,
    request: new Request('https://example.com/api/research/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Merqiva-Research-Callback-Secret': secret },
      body: raw ? body : JSON.stringify(body)
    })
  });
  return { kv, call };
}

for (const level of ['VERIFIED FACT', undefined, 'CONFIRMED', 'UNKNOWN', 'INFERENCE']) {
  test(`validator stores ${String(level)} without auto-verification`, () => {
    const item = candidate();
    item.evidence[0].evidenceLevel = level;
    const result = validate(response([item]));
    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.opportunities.length, 1);
    assert.equal(result.opportunities[0].evidence[0].evidenceLevel, level === 'INFERENCE' ? 'INFERENCE' : 'UNKNOWN');
    assert.equal(result.opportunities[0].decisionMaker.name, '');
    assert.equal(result.opportunities[0].productName, job.productName);
    assert.equal(result.opportunities[0].outreachDraft, '');
  });
}

test('validator requires completed provider response, schema and valid JSON', () => {
  for (const value of [null, {}, [], { opportunities: [] }, { status: 'FAILED', opportunities: [] }]) {
    assert.equal(validate({ ...response(), output_text: JSON.stringify(value) }).status, 'FAILED');
  }
  assert.equal(validate({ ...response(), output_text: '{"status":' }).notes, 'INVALID_JSON');
  assert.equal(validate({ ...response(), status: 'incomplete' }).status, 'FAILED');
  const result = validate({ error: { message: 'SYNTHETIC_PRIVATE_PROVIDER_DETAIL' } });
  assert.equal(result.status, 'FAILED');
  assert.ok(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE_PROVIDER_DETAIL'));
});

test('validator rejects links absent from provider metadata and insecure links', () => {
  for (const link of ['https://example.com/not-searched', 'http://example.com/company-update', 'https://user:pass@example.com/company-update']) {
    const item = candidate(); item.evidence[0].sourceUrl = link;
    assert.equal(validate(response([item])).status, 'FAILED');
  }
  assert.equal(validate({ ...response(), output: [] }).notes, 'MISSING_SEARCH_PROVENANCE');
});

test('validator accepts citation metadata but does not mistake output claims for provenance', () => {
  const input = response();
  input.output = [{ type: 'message', content: [{ type: 'output_text', text: input.output_text, annotations: [{ type: 'url_citation', url }] }] }];
  delete input.output_text;
  assert.equal(validate(input).opportunities.length, 1);
  input.output[0].content[0].annotations = [];
  assert.equal(validate(input).status, 'FAILED');
});

test('validator supports true zero results, deduplicates and respects the job limit', () => {
  assert.equal(validate(response([])).status, 'COMPLETED');
  assert.equal(validate(response([candidate(), candidate()])).opportunities.length, 1);
  const other = { ...candidate(), companyName: 'Second Synthetic Operator' };
  assert.equal(validate(response([candidate(), other]), { maxOpportunities: 1 }).opportunities.length, 1);
});

test('validator preserves the normalized callback destination', () => {
  const callbackUrl = 'https://www.merqivaintel.com/api/research/callback';
  assert.equal(validate(response(), { callbackUrl }).callbackUrl, callbackUrl);
});

test('actual workflow output survives callback and storage with review required', async () => {
  const { kv, call } = fixture();
  const payload = validate();
  const result = await (await call(payload)).json();
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.createdOpportunityIds.length, 1);
  const stored = JSON.parse(kv.get('opportunity:' + result.createdOpportunityIds[0]));
  assert.equal(stored.evidence[0].evidenceLevel, 'UNKNOWN');
  assert.equal(stored.whyNow, candidate().whyNowSummary);
  assert.equal(stored.ingestion.humanReviewRequired, true);
  assert.equal(stored.status, 'New');
  assert.equal(stored.decisionMaker.name, '');
  assert.equal(stored.decisionMaker.verificationStatus, 'UNKNOWN');
  assert.equal(stored.outreachDraft, '');
  const replay = await (await call(payload)).json();
  assert.equal(replay.idempotent, true);
  assert.deepEqual(replay.createdOpportunityIds, result.createdOpportunityIds);
  assert.equal([...kv.keys()].filter((key) => key.startsWith('opportunity:')).length, 1);
});

for (const level of ['VERIFIED FACT', undefined, 'INFERENCE']) {
  test(`callback independently constrains legacy/model fields (${String(level)})`, async () => {
    const { kv, call } = fixture();
    const item = candidate(); item.evidence[0].evidenceLevel = level;
    const result = await (await call({ ...job, status: 'COMPLETED', opportunities: [item] })).json();
    const stored = JSON.parse(kv.get('opportunity:' + result.createdOpportunityIds[0]));
    assert.equal(stored.evidence[0].evidenceLevel, level === 'INFERENCE' ? 'INFERENCE' : 'UNKNOWN');
    assert.equal(stored.ingestion.humanReviewRequired, true);
    assert.equal(stored.productName, job.productName);
    assert.equal(stored.whyNow, item.whyNowSummary);
    assert.equal(stored.status, 'New');
    assert.equal(stored.decisionMaker.name, '');
    assert.equal(stored.decisionMaker.confidence, 0);
    assert.equal(stored.scoringComponents.companyFit, 0);
    assert.equal(stored.salesAngle, '');
    assert.equal(stored.outreachDraft, '');
    assert.ok(!JSON.stringify(stored.outcome).includes('PAID'));
  });
}

test('callback rejects unauthorized and malformed requests without KV changes', async () => {
  const { kv, call } = fixture();
  const before = [...kv.entries()];
  assert.equal((await call({}, 'wrong')).status, 401);
  for (const body of [null, {}, { jobId: job.jobId, opportunities: [] }, { ...job, status: 'PENDING', opportunities: [] }, { ...job, status: 'COMPLETED' }]) {
    assert.equal((await call(body)).status, 400);
  }
  assert.equal((await call('{bad json', undefined, true)).status, 400);
  assert.deepEqual([...kv.entries()], before);
});

test('failed callbacks never ingest opportunities', async () => {
  const { kv, call } = fixture();
  const result = await (await call({ ...job, status: 'FAILED', opportunities: [candidate()] })).json();
  assert.equal(result.status, 'FAILED');
  assert.deepEqual(result.createdOpportunityIds, []);
  assert.equal([...kv.keys()].filter((key) => key.startsWith('opportunity:')).length, 0);
});

test('callback filters malformed evidence and fails an entirely unusable result', async () => {
  const { call } = fixture();
  const item = candidate(); item.evidence[0].sourceUrl = 'https://';
  const result = await (await call({ ...job, status: 'COMPLETED', opportunities: [null, item] })).json();
  assert.equal(result.status, 'FAILED');
  assert.deepEqual(result.createdOpportunityIds, []);
});

test('callback accepts explicit zero results', async () => {
  const { call } = fixture();
  const result = await (await call({ ...job, status: 'COMPLETED', opportunities: [] })).json();
  assert.equal(result.status, 'COMPLETED');
  assert.deepEqual(result.createdOpportunityIds, []);
});

test('manual normalization still preserves explicitly verified evidence', () => {
  assert.equal(normalizeOpportunityPayload(candidate()).evidence[0].evidenceLevel, 'VERIFIED FACT');
});
