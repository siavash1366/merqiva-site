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
    enabled: false,
    intervalMinutes: 60,
    sources: ["Authorized public company/news sources", "n8n workflows"],
    mode: "INGEST_ONLY",
    notes: "External monitoring is performed by an authorized scheduler/workflow and ingested through /api/signals/ingest.",
    updatedAt: new Date().toISOString()
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await checkSession(request, env))) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

  const config = await env.LEADS_KV.get("monitoring:config", { type: "json" }) || defaultConfig();
  const lastIngestAt = await env.LEADS_KV.get("monitoring:lastIngestAt");
  const signalsCount = Number(await env.LEADS_KV.get("monitoring:signalsCount") || 0);

  return jsonResponse({
    success: true,
    config,
    status: {
      lastIngestAt,
      signalsCount,
      ingestConfigured: Boolean(env.MONITORING_INGEST_SECRET)
    }
  });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!(await checkSession(request, env))) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

  try {
    const body = await request.json();
    const config = {
      ...defaultConfig(),
      ...body,
      enabled: Boolean(body.enabled),
      intervalMinutes: Math.max(15, Math.min(1440, Number(body.intervalMinutes) || 60)),
      sources: Array.isArray(body.sources) ? body.sources.map((v) => String(v).trim()).filter(Boolean).slice(0, 20) : [],
      notes: String(body.notes || "").trim().slice(0, 3000),
      updatedAt: new Date().toISOString()
    };
    await env.LEADS_KV.put("monitoring:config", JSON.stringify(config));
    return jsonResponse({ success: true, config });
  } catch (error) {
    console.error("Monitoring config error:", error);
    return jsonResponse({ success: false, error: "Failed to save monitoring configuration" }, 500);
  }
}
