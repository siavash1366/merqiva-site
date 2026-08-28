import {
  calculateOpportunityScore,
  deriveWhyNowConfidence,
  deriveDecisionMakerIntelligence,
  deriveRecommendedAction,
  deriveSalesAngle
} from "../lib/opportunity-core.js";

const HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: HEADERS });
}

async function sessionOK(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return !!(await env.ADMIN_SESSIONS_KV.get("session:" + auth.slice(7)));
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await sessionOK(request, env))) return json({ success: false, error: "Unauthorized" }, 401);

  const checks = [];
  const add = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

  try {
    const evidence = [{
      title: "Synthetic recent signal",
      summary: "Synthetic test evidence only; must never be used for customer outreach.",
      sourceName: "Merqiva System Check",
      sourceUrl: "https://example.invalid/system-check",
      observedAt: new Date().toISOString(),
      evidenceLevel: "VERIFIED FACT"
    }];

    const score = calculateOpportunityScore({
      companyFit: 90, productFit: 90, fleetFit: 80,
      buyingSignalStrength: 85, signalRecency: 95,
      decisionMakerConfidence: 80, commercialRelevance: 90,
      timingUrgency: 80, evidence
    });
    add("Opportunity scoring", score.score >= 75 && score.score <= 100, `score=${score.score}`);

    const whyNow = deriveWhyNowConfidence(evidence, "A recent verified signal exists.");
    add("Why Now confidence", whyNow === "HIGH", `confidence=${whyNow}`);

    const dm = deriveDecisionMakerIntelligence({
      name: "Synthetic Contact",
      role: "Procurement Director",
      relevance: 85,
      influence: 80,
      confidence: 80,
      verificationStatus: "VERIFIED",
      verificationEvidence: {
        sourceName: "Merqiva System Check",
        sourceUrl: "https://example.invalid/system-check",
        verifiedAt: new Date().toISOString(),
        notes: "Synthetic verification evidence only."
      }
    });
    add("Decision-maker verification rules", dm.verificationStatus === "VERIFIED" && dm.contactPriority === "HIGH", `status=${dm.verificationStatus}, priority=${dm.contactPriority}`);

    const action = deriveRecommendedAction({
      opportunityScore: score.score,
      whyNowConfidence: whyNow,
      decisionMakerConfidence: 80,
      decisionMakerVerificationStatus: dm.verificationStatus,
      evidence
    });
    add("Recommended action", Boolean(action), action);

    const angle = deriveSalesAngle({
      productName: "Synthetic Product",
      decisionMakerRole: dm.verificationStatus === "VERIFIED" ? "Procurement Director" : "UNKNOWN",
      decisionMakerVerificationStatus: dm.verificationStatus,
      opportunityScore: score.score,
      whyNowConfidence: whyNow,
      evidence
    });
    add("Sales angle generation", Boolean(angle), angle);

    const envChecks = {
      leadsKV: Boolean(env.LEADS_KV),
      adminSessionsKV: Boolean(env.ADMIN_SESSIONS_KV),
      monitoringIngestSecret: Boolean(env.MONITORING_INGEST_SECRET),
      researchN8nWebhook: Boolean(env.RESEARCH_N8N_WEBHOOK_URL),
      researchCallbackSecret: Boolean(env.RESEARCH_CALLBACK_SECRET),
      researchDispatchSecret: Boolean(env.RESEARCH_N8N_WEBHOOK_SECRET)
    };
    add("Core KV bindings", envChecks.leadsKV && envChecks.adminSessionsKV, JSON.stringify({ leadsKV: envChecks.leadsKV, adminSessionsKV: envChecks.adminSessionsKV }));
    add("Signal ingest configuration", envChecks.monitoringIngestSecret, envChecks.monitoringIngestSecret ? "Configured" : "Missing MONITORING_INGEST_SECRET");
    add("Research callback configuration", !envChecks.researchN8nWebhook || envChecks.researchCallbackSecret, envChecks.researchN8nWebhook ? (envChecks.researchCallbackSecret ? "Configured" : "Missing RESEARCH_CALLBACK_SECRET") : "n8n dispatch not configured");
    add("Research dispatch secret", !envChecks.researchN8nWebhook || envChecks.researchDispatchSecret, envChecks.researchN8nWebhook ? (envChecks.researchDispatchSecret ? "Configured" : "Missing RESEARCH_N8N_WEBHOOK_SECRET") : "n8n dispatch not configured");

    const passed = checks.filter((x) => x.pass).length;
    const total = checks.length;
    return json({
      success: true,
      environment: env.CF_PAGES_BRANCH || "unknown",
      status: passed === total ? "PASS" : "ATTENTION_REQUIRED",
      summary: { passed, total },
      checks,
      note: "Synthetic scoring/contact tests do not create or store customer opportunities."
    });
  } catch (error) {
    console.error("System check error:", error);
    return json({ success: false, error: "System check failed" }, 500);
  }
}
