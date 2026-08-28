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

function hasUsableEvidence(item) {
  if (!Array.isArray(item?.evidence) || item.evidence.length === 0) return false;
  return item.evidence.some((e) => {
    if (!e || typeof e !== "object") return false;
    const url = clean(e.sourceUrl, 1500);
    const title = clean(e.title, 500);
    const summary = clean(e.summary, 2000);
    return /^https:\/\//i.test(url) && title && summary;
  });
}

async function saveOpportunity(env, payload, jobId, sourceIndex) {
  const normalized = normalizeOpportunityPayload(payload);
  if (!normalized.companyName || !normalized.productName) return null;
  if (!hasUsableEvidence(payload)) return null;

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
    const body = await request.json();
    const jobId = clean(body.jobId, 160);
    if (!jobId) return jsonResponse({ success: false, error: "jobId is required" }, 400);

    const job = await env.LEADS_KV.get("research:job:" + jobId, { type: "json" });
    if (!job) return jsonResponse({ success: false, error: "Research job not found" }, 404);

    if (job.status === "COMPLETED" && Array.isArray(job.opportunityIds)) {
      return jsonResponse({ success: true, jobId, status: "COMPLETED", createdOpportunityIds: job.opportunityIds, idempotent: true }, 200);
    }

    const resultItems = Array.isArray(body.opportunities) ? body.opportunities.slice(0, job.maxOpportunities || 25) : [];
    const created = [];
    for (let i = 0; i < resultItems.length; i += 1) {
      const opportunity = await saveOpportunity(env, resultItems[i], jobId, i);
      if (opportunity) created.push(opportunity.id);
    }

    job.status = body.status === "FAILED" ? "FAILED" : "COMPLETED";
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
