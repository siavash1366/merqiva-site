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

function list(value, max = 20) {
  return Array.isArray(value)
    ? value.map((v) => v && typeof v === "object" ? v : clean(v, 500)).slice(0, max)
    : [];
}

async function saveOpportunity(env, payload, jobId) {
  const normalized = normalizeOpportunityPayload(payload);
  if (!normalized.companyName || !normalized.productName) {
    return null;
  }

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
      ingestedAt: now
    }
  };

  await env.LEADS_KV.put("opportunity:" + id, JSON.stringify(opportunity));

  const index = JSON.parse(await env.LEADS_KV.get("opportunities:index") || "[]");
  index.push(id);
  await env.LEADS_KV.put("opportunities:index", JSON.stringify(index));

  return opportunity;
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

    const resultItems = Array.isArray(body.opportunities) ? body.opportunities.slice(0, job.maxOpportunities || 25) : [];
    const created = [];

    for (const item of resultItems) {
      const opportunity = await saveOpportunity(env, item, jobId);
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

    return jsonResponse({
      success: true,
      jobId,
      status: job.status,
      createdOpportunityIds: created
    }, 201);
  } catch (error) {
    console.error("Research callback error:", error);
    return jsonResponse({ success: false, error: "Research callback failed" }, 500);
  }
}
