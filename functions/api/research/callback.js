import { normalizeOpportunityPayload } from "../lib/opportunity-core.js";

const API_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: API_HEADERS });
}

function clean(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function researchEvidence(items) {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    try {
      const url = new URL(item.sourceUrl);
      if (url.protocol !== "https:" || url.username || url.password) return [];
      const title = clean(item.title, 500);
      const summary = clean(item.summary, 2000);
      if (!title || !summary) return [];
      return [{
        title,
        summary,
        sourceName: clean(item.sourceName, 160),
        sourceUrl: url.href,
        observedAt: "",
        // Authentication and a source link do not establish factual accuracy.
        evidenceLevel: item.evidenceLevel === "INFERENCE" ? "INFERENCE" : "UNKNOWN"
      }];
    } catch { return []; }
  }).slice(0, 12);
}

async function saveOpportunity(env, payload, job, jobId, sourceIndex) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const evidence = researchEvidence(payload.evidence);
  if (!evidence.length) return null;
  // Allow only research fields. Older workflows must not inject verified contacts,
  // sales scores, outreach, or a won/paid outcome through this AI-only boundary.
  const normalized = normalizeOpportunityPayload({
    companyName: clean(payload.companyName, 240),
    productName: clean(job.productName || payload.productName, 240),
    productId: clean(job.productId || payload.productId, 160),
    whyNow: clean(payload.whyNow || payload.whyNowSummary, 2000),
    evidence,
    status: "New"
  });
  if (!normalized.companyName || !normalized.productName) return null;
  normalized.recommendedAction = "Review source claims, purchase need, timing and decision-maker identity before outreach.";
  normalized.recommendedActionSource = "SYSTEM_RULES";
  normalized.salesAngle = "";
  normalized.outreachDraft = "";

  const fingerprint = await sha256(`${jobId}|${sourceIndex}|${normalized.companyName}|${normalized.productName}`);
  const existing = await env.LEADS_KV.get("research:opportunity:" + fingerprint);
  if (existing) return JSON.parse(existing);

  const id = "OPP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const now = new Date().toISOString();
  const opportunity = {
    id,
    ...normalized,
    createdAt: now,
    updatedAt: now,
    ingestion: {
      source: "AI_RESEARCH",
      researchJobId: jobId,
      evidenceGated: true,
      humanReviewRequired: true,
      ingestedAt: now
    }
  };

  await env.LEADS_KV.put("opportunity:" + id, JSON.stringify(opportunity));
  await env.LEADS_KV.put("research:opportunity:" + fingerprint, JSON.stringify(opportunity));

  const index = JSON.parse(await env.LEADS_KV.get("opportunities:index") || "[]");
  if (!index.includes(id)) index.push(id);
  await env.LEADS_KV.put("opportunities:index", JSON.stringify(index));
  return opportunity;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const supplied = request.headers.get("X-Merqiva-Research-Callback-Secret");
  if (!env.RESEARCH_CALLBACK_SECRET || !supplied || supplied !== env.RESEARCH_CALLBACK_SECRET) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ success: false, error: "Invalid JSON" }, 400); }
    if (!body || !["COMPLETED", "FAILED"].includes(body.status) || !Array.isArray(body.opportunities)) {
      return jsonResponse({ success: false, error: "Valid status and opportunities array are required" }, 400);
    }
    const jobId = clean(body.jobId, 160);
    if (!jobId) return jsonResponse({ success: false, error: "jobId is required" }, 400);

    const job = await env.LEADS_KV.get("research:job:" + jobId, { type: "json" });
    if (!job) return jsonResponse({ success: false, error: "Research job not found" }, 404);

    if (job.status === "COMPLETED" && Array.isArray(job.opportunityIds)) {
      return jsonResponse({ success: true, jobId, status: "COMPLETED", createdOpportunityIds: job.opportunityIds, idempotent: true }, 200);
    }

    const limit = Math.max(1, Math.min(25, Math.floor(Number(job.maxOpportunities) || 25)));
    const resultItems = body.status === "FAILED" ? [] : body.opportunities.slice(0, limit);
    const created = [];
    for (let i = 0; i < resultItems.length; i += 1) {
      const opportunity = await saveOpportunity(env, resultItems[i], job, jobId, i);
      if (opportunity) created.push(opportunity.id);
    }

    job.status = body.status === "FAILED" || (resultItems.length > 0 && created.length === 0) ? "FAILED" : "COMPLETED";
    job.updatedAt = new Date().toISOString();
    job.completedAt = new Date().toISOString();
    job.resultCount = created.length;
    job.opportunityIds = created;
    job.callback = {
      receivedAt: new Date().toISOString(),
      provider: clean(body.provider || "N8N", 120),
      notes: clean(body.notes, 2500)
    };
    await env.LEADS_KV.put("research:job:" + jobId, JSON.stringify(job));

    return jsonResponse({ success: true, jobId, status: job.status, createdOpportunityIds: created }, 201);
  } catch (error) {
    console.error("Research callback error:", error);
    return jsonResponse({ success: false, error: "Research callback failed" }, 500);
  }
}
