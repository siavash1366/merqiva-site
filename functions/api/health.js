const HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, nosnippet"
};

export async function onRequestGet({ env }) {
  const bindings = {
    leadsKV: Boolean(env.LEADS_KV),
    adminSessionsKV: Boolean(env.ADMIN_SESSIONS_KV),
    ingestSecret: Boolean(env.MONITORING_INGEST_SECRET),
    researchN8nWebhook: Boolean(env.RESEARCH_N8N_WEBHOOK_URL),
    researchCallbackSecret: Boolean(env.RESEARCH_CALLBACK_SECRET),
    researchDispatchSecret: Boolean(env.RESEARCH_N8N_WEBHOOK_SECRET)
  };

  return new Response(JSON.stringify({
    ok: true,
    service: "merqiva-site",
    environment: env.CF_PAGES_BRANCH || "unknown",
    timestamp: new Date().toISOString(),
    bindings
  }), { headers: HEADERS });
}
