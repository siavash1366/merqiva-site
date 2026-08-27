const MONITORING_URL = "/api/admin/monitoring";
const GUARANTEE_URL = "/api/admin/guarantee";
let session = localStorage.getItem("admin_session");

function escapeHTML(value) {
  return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
}

async function request(url, options = {}) {
  if (!session) throw new Error("Admin session not found. Please log in again.");
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", "Bearer " + session);
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem("admin_session");
    throw new Error("Session expired. Please log in again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || "Request failed");
  return data;
}

function setStatus(message, error = false) {
  const el = document.getElementById("statusMessage");
  el.textContent = message;
  el.className = "status show" + (error ? " error" : "");
  setTimeout(() => el.classList.remove("show"), 3500);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "—";
}

async function loadAll() {
  try {
    const [monitoring, guarantee] = await Promise.all([
      request(MONITORING_URL),
      request(GUARANTEE_URL)
    ]);

    const mc = monitoring.config;
    const ms = monitoring.status;
    document.getElementById("monitorBadge").textContent = mc.enabled ? "ENABLED" : "READY";
    document.getElementById("signalsCount").textContent = ms.signalsCount;
    document.getElementById("lastIngest").textContent = formatDate(ms.lastIngestAt);
    document.getElementById("ingestState").textContent = ms.ingestConfigured ? "Configured" : "Secret missing";
    document.getElementById("interval").textContent = mc.intervalMinutes + " min";
    document.getElementById("monitorEnabled").checked = !!mc.enabled;
    document.getElementById("monitorInterval").value = mc.intervalMinutes;
    document.getElementById("monitorSources").value = (mc.sources || []).join("\n");
    document.getElementById("monitorNotes").value = mc.notes || "";

    const gc = guarantee.config;
    const gs = guarantee.status;
    document.getElementById("guaranteeBadge").textContent = gs.status;
    document.getElementById("delivered").textContent = gs.delivered;
    document.getElementById("target").textContent = gs.target;
    document.getElementById("remaining").textContent = gs.remaining;
    document.getElementById("progress").textContent = gs.progressPercent + "%";
    document.getElementById("targetQualified").value = gc.targetQualifiedOpportunities;
    document.getElementById("periodDays").value = gc.periodDays;
    document.getElementById("minimumScore").value = gc.minimumScore;
    document.getElementById("requireEvidence").checked = gc.requireVerifiedEvidence !== false;
    document.getElementById("requireWhyNow").checked = gc.requireWhyNowHigh !== false;
    document.getElementById("replacementPolicy").value = gc.replacementPolicy || "REPLACE";

    const rejected = document.getElementById("rejectedList");
    rejected.innerHTML = gs.rejected?.length
      ? gs.rejected.map((item) => `<div class="reject-item"><strong>${escapeHTML(item.companyName || item.id)}</strong><span>Score ${escapeHTML(item.score)}</span><small>${escapeHTML(item.reasons.join(" "))}</small></div>`).join("")
      : "<p class='small-note'>No recent non-qualified opportunities in the current period.</p>";
  } catch (error) {
    setStatus(error.message, true);
    if (error.message.includes("log in")) setTimeout(() => location.href = "/admin/", 700);
  }
}

document.getElementById("monitorForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request(MONITORING_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: document.getElementById("monitorEnabled").checked,
        intervalMinutes: Number(document.getElementById("monitorInterval").value),
        sources: document.getElementById("monitorSources").value.split("\n").map((v) => v.trim()).filter(Boolean),
        notes: document.getElementById("monitorNotes").value
      })
    });
    setStatus("Monitoring settings saved.");
    loadAll();
  } catch (error) { setStatus(error.message, true); }
});

document.getElementById("guaranteeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request(GUARANTEE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetQualifiedOpportunities: Number(document.getElementById("targetQualified").value),
        periodDays: Number(document.getElementById("periodDays").value),
        minimumScore: Number(document.getElementById("minimumScore").value),
        requireVerifiedEvidence: document.getElementById("requireEvidence").checked,
        requireWhyNowHigh: document.getElementById("requireWhyNow").checked,
        replacementPolicy: document.getElementById("replacementPolicy").value
      })
    });
    setStatus("Guarantee rules saved.");
    loadAll();
  } catch (error) { setStatus(error.message, true); }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("admin_session");
  location.href = "/admin/";
});

loadAll();
