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

function normalizeConfig(input = {}) {
  const list = (value, max = 50) => Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, max)
    : [];

  return {
    id: "default",
    productName: String(input.productName || "").trim().slice(0, 240),
    regions: list(input.regions),
    targetCompanyTypes: list(input.targetCompanyTypes),
    targetVesselTypes: list(input.targetVesselTypes),
    minVesselLength: Number.isFinite(Number(input.minVesselLength))
      ? Math.max(0, Number(input.minVesselLength))
      : null,
    targetSegments: list(input.targetSegments),
    relevantSignals: list(input.relevantSignals),
    targetDecisionMakerRoles: list(input.targetDecisionMakerRoles),
    notes: String(input.notes || "").trim().slice(0, 3000),
    updatedAt: new Date().toISOString()
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await checkSession(request, env))) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const config = await env.LEADS_KV.get("opportunity_config:default", { type: "json" });
  return jsonResponse({
    success: true,
    config: config || normalizeConfig({})
  });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!(await checkSession(request, env))) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const body = await request.json();
    const config = normalizeConfig(body);
    await env.LEADS_KV.put(
      "opportunity_config:default",
      JSON.stringify(config)
    );
    return jsonResponse({ success: true, config });
  } catch (error) {
    console.error("Opportunity config update error:", error);
    return jsonResponse({ success: false, error: "Failed to save opportunity configuration" }, 500);
  }
}
