const SALES_ALERT_URL = "https://n8n.merqivaintel.com/webhook/merqiva-sales-alert";
const SALES_ALERT_TIMEOUT_MS = 6000;

function field(formData, name, maxLength = 1000) {
  const value = formData.get(name);
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

async function sendSalesAlert(request, env, leadId) {
  if (!env.N8N_SALES_ALERT_SECRET) {
    console.warn("N8N sales alert skipped: N8N_SALES_ALERT_SECRET is not configured");
    return;
  }

  let formData;

  try {
    formData = await request.formData();
  } catch (error) {
    console.error("N8N sales alert form parsing failed:", error);
    return;
  }

  const payload = {
    id: String(leadId || "").slice(0, 120),
    name: field(formData, "name", 120),
    company: field(formData, "company", 180),
    email: field(formData, "email", 220),
    country: field(formData, "country", 120),
    offering: field(formData, "offering", 300),
    market: field(formData, "market", 180),
    source: "website-contact-form",
    message: field(formData, "message", 1800),
    createdAt: new Date().toISOString()
  };

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SALES_ALERT_TIMEOUT_MS
  );

  try {
    const response = await fetch(SALES_ALERT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Merqiva-Alert-Secret": env.N8N_SALES_ALERT_SECRET
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error(
        "N8N sales alert failed:",
        response.status,
        details.slice(0, 300)
      );
    }
  } catch (error) {
    console.error("N8N sales alert request failed:", error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const isContactSubmission =
    request.method === "POST" &&
    url.pathname === "/api/contact";

  let alertRequest = null;

  if (isContactSubmission) {
    try {
      alertRequest = request.clone();
    } catch (error) {
      console.error("Unable to clone contact request for n8n alert:", error);
    }
  }

  const response = await context.next();

  if (!isContactSubmission || !alertRequest || !response.ok) {
    return response;
  }

  let result;

  try {
    result = await response.clone().json();
  } catch {
    return response;
  }

  if (!result?.success || !result?.leadId) {
    return response;
  }

  const alertPromise = sendSalesAlert(
    alertRequest,
    context.env,
    result.leadId
  );

  if (typeof context.waitUntil === "function") {
    context.waitUntil(alertPromise);
  } else {
    await alertPromise;
  }

  return response;
}
