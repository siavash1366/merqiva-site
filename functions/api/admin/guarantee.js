const API_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: API_HEADERS });
}

async function checkSession(request, env) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const sessionId = authorization.substring(7);
  return !!(await env.ADMIN_SESSIONS_KV.get("session:" + sessionId));
}

function defaultConfig() {
  return {
    id: "default",
    targetQualifiedOpportunities: 25,
    periodDays: 30,
    minimumScore: 75,
    requireVerifiedEvidence: true,
    requireWhyNowHigh: true,
    allowedDecisionMakerStatuses: ["VERIFIED", "PARTIAL"],
    replacementPolicy: "REPLACE",
    updatedAt: new Date().toISOString()
  };
}

function qualification(item, config) {
  const score = Number(item.opportunityScore) || 0;
  const evidence = Array.isArray(item.evidence) ? item.evidence : [];
  const verified = evidence.filter((x) => x?.evidenceLevel === "VERIFIED FACT").length;
  const dm = String(item.decisionMaker?.verificationStatus || "UNKNOWN").toUpperCase();
  const whyNow = String(item.whyNowConfidence || "LOW").toUpperCase();
  const reasons = [];

  if (!String(item.companyName || "").trim()) reasons.push("Company is missing.");
  if (!String(item.productName || "").trim()) reasons.push("Product/service is missing.");
  if (score < config.minimumScore) reasons.push("Score is below the guarantee threshold.");
  if (config.requireVerifiedEvidence && verified < 1) reasons.push("No verified evidence is recorded.");
  if (config.requireWhyNowHigh && whyNow !== "HIGH") reasons.push("Why Now confidence is not HIGH.");
  if (!config.allowedDecisionMakerStatuses.includes(dm)) reasons.push("Decision-maker verification is insufficient.");

  return {
    qualified: reasons.length === 0,
    reasons,
    verifiedEvidenceCount: verified
  };
}

async function loadOpportunities(env) {
  const index = JSON.parse(await env.LEADS_KV.get("opportunities:index") || "[]");
  const items = [];
  for (const id of index) {
    const item = await env.LEADS_KV.get("opportunity:" + id, { type: "json" });
    if (item) items.push(item);
  }
  return items;
}

function buildStatus(config, opportunities) {
  const startedAt = Date.now() - config.periodDays * 24 * 60 * 60 * 1000;
  const evaluated = opportunities.filter((item) => {
    const created = Date.parse(item.createdAt || item.updatedAt || "");
    return Number.isFinite(created) && created >= startedAt;
  });

  const reviewed = evaluated.map((item) => ({ item, result: qualification(item, config) }));
  const qualified = reviewed.filter((x) => x.result.qualified);
  const target = Math.max(1, Number(config.targetQualifiedOpportunities) || 25);
  const delivered = qualified.length;
  const remaining = Math.max(0, target - delivered);

  return {
    status: delivered >= target ? "MET" : (evaluated.length && remaining > Math.ceil(target * 0.5) ? "AT_RISK" : "IN_PROGRESS"),
    target,
    delivered,
    remaining,
    progressPercent: Math.min(100, Math.round((delivered / target) * 100)),
    periodDays: config.periodDays,
    periodStartedAt: new Date(startedAt).toISOString(),
    evaluatedCount: evaluated.length,
    qualifiedIds: qualified.map((x) => x.item.id),
    rejected: reviewed.filter((x) => !x.result.qualified).slice(0, 50).map((x) => ({
      id: x.item.id,
      companyName: x.item.companyName,
      score: x.item.opportunityScore,
      reasons: x.result.reasons
    }))
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await checkSession(request, env))) return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  const config = await env.LEADS_KV.get("guarantee:config", { type: "json" }) || defaultConfig();
  const status = buildStatus(config, await loadOpportunities(env));
  return jsonResponse({ success: true, config, status });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!(await checkSession(request, env))) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

  try {
    const body = await request.json();
    const allowed = Array.isArray(body.allowedDecisionMakerStatuses)
      ? body.allowedDecisionMakerStatuses.map((v) => String(v).trim().toUpperCase()).filter(Boolean)
      : ["VERIFIED", "PARTIAL"];

    const config = {
      ...defaultConfig(),
      ...body,
      targetQualifiedOpportunities: Math.max(1, Math.min(500, Number(body.targetQualifiedOpportunities) || 25)),
      periodDays: Math.max(1, Math.min(90, Number(body.periodDays) || 30)),
      minimumScore: Math.max(0, Math.min(100, Number(body.minimumScore) || 75)),
      requireVerifiedEvidence: body.requireVerifiedEvidence !== false,
      requireWhyNowHigh: body.requireWhyNowHigh !== false,
      allowedDecisionMakerStatuses: allowed.length ? allowed : ["VERIFIED", "PARTIAL"],
      replacementPolicy: ["REPLACE", "CREDIT", "REFUND_REVIEW"].includes(body.replacementPolicy) ? body.replacementPolicy : "REPLACE",
      updatedAt: new Date().toISOString()
    };

    await env.LEADS_KV.put("guarantee:config", JSON.stringify(config));
    return jsonResponse({ success: true, config });
  } catch (error) {
    console.error("Guarantee config error:", error);
    return jsonResponse({ success: false, error: "Failed to save guarantee configuration" }, 500);
  }
}
