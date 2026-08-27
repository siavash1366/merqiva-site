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

function clean(value, max = 4000) {
  return String(value || "").trim().slice(0, max);
}

function list(value, max = 30) {
  return Array.isArray(value)
    ? value.map((v) => clean(v, 500)).filter(Boolean).slice(0, max)
    : [];
}

async function getIndex(env) {
  return JSON.parse(await env.LEADS_KV.get("research:jobs:index") || "[]");
}

async function saveIndex(env, index) {
  await env.LEADS_KV.put("research:jobs:index", JSON.stringify(index.slice(-200)));
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await checkSession(request, env))) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

  try {
    const index = await getIndex(env);
    const jobs = [];
    for (const id of [...index].reverse().slice(0, 50)) {
      const job = await env.LEADS_KV.get("research:job:" + id, { type: "json" });
      if (job) jobs.push(job);
    }
    return jsonResponse({ success: true, jobs });
  } catch (error) {
    console.error("Research jobs GET error:", error);
    return jsonResponse({ success: false, error: "Failed to load research jobs" }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await checkSession(request, env))) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

  try {
    const body = await request.json();
    const productName = clean(body.productName, 240);
    const researchQuestion = clean(body.researchQuestion, 2500);
    const targetMarket = clean(body.targetMarket, 500);

    if (!productName || !researchQuestion) {
      return jsonResponse({
        success: false,
        error: "productName and researchQuestion are required"
      }, 400);
    }

    const id = "RES" + Date.now();
    const now = new Date().toISOString();

    const job = {
      id,
      status: "QUEUED",
      createdAt: now,
      updatedAt: now,
      productName,
      productId: clean(body.productId, 160),
      targetMarket,
      researchQuestion,
      targetCompanyTypes: list(body.targetCompanyTypes),
      targetVesselTypes: list(body.targetVesselTypes),
      relevantSignals: list(body.relevantSignals),
      targetDecisionMakerRoles: list(body.targetDecisionMakerRoles),
      maxOpportunities: Math.max(1, Math.min(25, Number(body.maxOpportunities) || 10)),
      language: ["en", "ar"].includes(body.language) ? body.language : "en",
      dispatch: {
        provider: env.RESEARCH_N8N_WEBHOOK_URL ? "N8N" : "NOT_CONFIGURED"
      },
      resultCount: 0
    };

    await env.LEADS_KV.put("research:job:" + id, JSON.stringify(job));

    const index = await getIndex(env);
    index.push(id);
    await saveIndex(env, index);

    if (env.RESEARCH_N8N_WEBHOOK_URL) {
      try {
        const dispatchResponse = await fetch(env.RESEARCH_N8N_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            ...(env.RESEARCH_N8N_WEBHOOK_SECRET
              ? { "X-Merqiva-Research-Secret": env.RESEARCH_N8N_WEBHOOK_SECRET }
              : {})
          },
          body: JSON.stringify({
            jobId: id,
            callbackUrl: new URL("/api/research/callback", request.url).toString(),
            callbackSecretConfigured: Boolean(env.RESEARCH_CALLBACK_SECRET),
            job
          })
        });

        if (!dispatchResponse.ok) {
          job.status = "DISPATCH_FAILED";
          job.dispatch.error = "Research workflow rejected the dispatch request.";
          job.updatedAt = new Date().toISOString();
          await env.LEADS_KV.put("research:job:" + id, JSON.stringify(job));
          return jsonResponse({ success: false, error: "Research workflow dispatch failed", job }, 502);
        }

        job.status = "RUNNING";
        job.dispatch.dispatchedAt = new Date().toISOString();
        await env.LEADS_KV.put("research:job:" + id, JSON.stringify(job));
      } catch (error) {
        console.error("Research dispatch error:", error);
        job.status = "DISPATCH_FAILED";
        job.dispatch.error = "Research workflow could not be reached.";
        job.updatedAt = new Date().toISOString();
        await env.LEADS_KV.put("research:job:" + id, JSON.stringify(job));
        return jsonResponse({ success: false, error: "Research workflow is unreachable", job }, 502);
      }
    }

    return jsonResponse({ success: true, job }, 201);
  } catch (error) {
    console.error("Research job POST error:", error);
    return jsonResponse({ success: false, error: "Failed to create research job" }, 500);
  }
}
