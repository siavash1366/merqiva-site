import {
  normalizeOpportunityPayload,
  OPPORTUNITY_STATUSES
../../lib/opportunity-core.js
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
  return !!(await env.ADMIN_SESSIONS_KV.get(`session:${sessionId}`));
}

async function getIndex(env) {
  return JSON.parse(await env.LEADS_KV.get("opportunities:index") || "[]");
}

async function saveIndex(env, index) {
  await env.LEADS_KV.put("opportunities:index", JSON.stringify(index));
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await checkSession(request, env))) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const url = new URL(request.url);
    const requestedStatus = String(url.searchParams.get("status") || "").trim();
    const minScore = Number(url.searchParams.get("minScore"));
    const index = await getIndex(env);
    const opportunities = [];

    for (const id of index) {
      const opportunity = await env.LEADS_KV.get(`opportunity:${id}`, { type: "json" });
      if (opportunity) opportunities.push(opportunity);
    }

    opportunities.sort((a, b) => Number(b.opportunityScore || 0) - Number(a.opportunityScore || 0));

    const filtered = opportunities.filter((item) => {
      if (requestedStatus && item.status !== requestedStatus) return false;
      if (Number.isFinite(minScore) && Number(item.opportunityScore || 0) < minScore) return false;
      return true;
    });

    return jsonResponse({
      success: true,
      count: filtered.length,
      statuses: OPPORTUNITY_STATUSES,
      opportunities: filtered
    });
  } catch (error) {
    console.error("Opportunity GET error:", error);
    return jsonResponse({ success: false, error: "Failed to load opportunities" }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await checkSession(request, env))) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const body = await request.json();
    const normalized = normalizeOpportunityPayload(body);

    if (!normalized.companyName) {
      return jsonResponse({ success: false, error: "Company name is required" }, 400);
    }

    if (!normalized.productName) {
      return jsonResponse({ success: false, error: "Product name is required" }, 400);
    }

    const id = `OPP${Date.now()}`;
    const now = new Date().toISOString();
    const opportunity = {
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
      outcome: null
    };

    await env.LEADS_KV.put(`opportunity:${id}`, JSON.stringify(opportunity));
    const index = await getIndex(env);
    index.push(id);
    await saveIndex(env, index);

    return jsonResponse({ success: true, opportunity }, 201);
  } catch (error) {
    console.error("Opportunity CREATE error:", error);
    return jsonResponse({ success: false, error: "Failed to create opportunity" }, 500);
  }
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  if (!(await checkSession(request, env))) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!id) return jsonResponse({ success: false, error: "Missing opportunity id" }, 400);

    const existing = await env.LEADS_KV.get(`opportunity:${id}`, { type: "json" });
    if (!existing) return jsonResponse({ success: false, error: "Opportunity not found" }, 404);

    const merged = normalizeOpportunityPayload({ ...existing, ...body });
    const updated = {
      ...existing,
      ...merged,
      id,
      outcome: body.outcome !== undefined ? body.outcome : (existing.outcome || null),
      updatedAt: new Date().toISOString()
    };

    await env.LEADS_KV.put(`opportunity:${id}`, JSON.stringify(updated));
    return jsonResponse({ success: true, opportunity: updated });
  } catch (error) {
    console.error("Opportunity UPDATE error:", error);
    return jsonResponse({ success: false, error: "Failed to update opportunity" }, 500);
  }
}
