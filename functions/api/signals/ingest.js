import { normalizeOpportunityPayload } from "../lib/opportunity-core.js";

const API_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: API_HEADERS });
}

function clean(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function list(value, max = 20) {
  return Array.isArray(value)
    ? value.map((v) => clean(v, 500)).filter(Boolean).slice(0, max)
    : [];
}

function makeSignalId() {
  return "SIG" + Date.now().toString(36).toUpperCase();
}

async function createOpportunity(env, payload) {
  const normalized = normalizeOpportunityPayload(payload);
  if (!normalized.companyName || !normalized.productName) {
    return { ok: false, status: 400, error: "companyName and productName are required" };
  }

  const id = "OPP" + Date.now();
  const now = new Date().toISOString();
  const opportunity = {
    id,
    ...normalized,
    createdAt: now,
    updatedAt: now,
    ingestion: {
      source: "MARKET_SIGNAL",
      signalId: payload.signalId || null,
      ingestedAt: now
    }
  };

  await env.LEADS_KV.put("opportunity:" + id, JSON.stringify(opportunity));
  const index = JSON.parse(await env.LEADS_KV.get("opportunities:index") || "[]");
  index.push(id);
  await env.LEADS_KV.put("opportunities:index", JSON.stringify(index));
  return { ok: true, status: 201, opportunity };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const supplied = request.headers.get("X-Merqiva-Ingest-Secret");
  const expected = env.MONITORING_INGEST_SECRET;

  if (!expected || !supplied || clean(supplied, 500) !== clean(expected, 500)) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const body = await request.json();
    const signalId = clean(body.signalId || makeSignalId(), 160);
    const sourceUrl = clean(body.sourceUrl, 1000);
    const now = new Date().toISOString();

    if (sourceUrl) {
      const existingId = await env.LEADS_KV.get("signal:url:" + sourceUrl.toLowerCase());
      if (existingId) {
        return jsonResponse({ success: true, deduped: true, signalId, existingOpportunityId: existingId });
      }
    }

    const evidence = Array.isArray(body.evidence) ? body.evidence.slice(0, 20) : [];
    if (body.sourceUrl || body.sourceName || body.signalType) {
      evidence.unshift({
        title: clean(body.signalType || "Market signal", 240),
        summary: clean(body.signalSummary || body.whyNow || "Imported market signal", 1000),
        sourceName: clean(body.sourceName, 160),
        sourceUrl,
        observedAt: clean(body.observedAt || now, 64),
        evidenceLevel: body.evidenceLevel === "INFERENCE" ? "INFERENCE" : "VERIFIED FACT"
      });
    }

    await env.LEADS_KV.put(
      "signal:" + signalId,
      JSON.stringify({ signalId, signalType: clean(body.signalType, 160), sourceName: clean(body.sourceName, 160), sourceUrl, observedAt: clean(body.observedAt || now, 64), companyName: clean(body.companyName, 240), createdAt: now }),
      { expirationTtl: 60 * 60 * 24 * 180 }
    );

    const result = await createOpportunity(env, {
      ...body,
      signalId,
      companyName: clean(body.companyName, 240),
      companyId: clean(body.companyId, 160),
      productId: clean(body.productId, 160),
      productName: clean(body.productName, 240),
      vesselIds: list(body.vesselIds, 50),
      buyingSignals: list(body.buyingSignals, 20),
      evidence,
      whyNow: clean(body.whyNow || body.signalSummary, 2000),
      outreachDraft: clean(body.outreachDraft, 5000)
    });

    if (!result.ok) return jsonResponse({ success: false, error: result.error }, result.status);

    if (sourceUrl) {
      await env.LEADS_KV.put("signal:url:" + sourceUrl.toLowerCase(), result.opportunity.id, { expirationTtl: 60 * 60 * 24 * 180 });
    }

    await env.LEADS_KV.put("monitoring:lastIngestAt", now);
    const count = Number(await env.LEADS_KV.get("monitoring:signalsCount") || 0);
    await env.LEADS_KV.put("monitoring:signalsCount", String(count + 1));

    return jsonResponse({ success: true, deduped: false, signalId, opportunity: result.opportunity }, 201);
  } catch (error) {
    console.error("Signal ingest error:", error);
    return jsonResponse({ success: false, error: "Signal ingestion failed" }, 500);
  }
}
