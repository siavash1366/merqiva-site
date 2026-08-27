const MONITORING_URL = "/api/admin/monitoring";
const RESEARCH_URL = "/api/admin/research";
const GUARANTEE_URL = "/api/admin/guarantee";
const SYSTEM_CHECK_URL = "/api/admin/system-check";
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

async function runSystemCheck() {
  const button = document.getElementById("runSystemCheck");
  const badge = document.getElementById("systemCheckBadge");
  const summary = document.getElementById("systemCheckSummary");
  const results = document.getElementById("systemCheckResults");
  if (button) button.disabled = true;
  if (badge) badge.textContent = "RUNNING";
  try {
    const data = await request(SYSTEM_CHECK_URL);
    badge.textContent = data.status === "PASS" ? "PASS" : "ATTENTION";
    summary.textContent = `${data.summary.passed}/${data.summary.total} checks passed · ${data.environment}`;
    results.innerHTML = (data.checks || []).map((check) => `<div class="system-check-row ${check.pass ? "pass" : "fail"}"><strong>${check.pass ? "PASS" : "FAIL"}</strong><span>${escapeHTML(check.name)}</span><small>${escapeHTML(check.detail)}</small></div>`).join("");
    setStatus(data.status === "PASS" ? "System check passed." : "System check found configuration items requiring attention.", data.status !== "PASS");
  } catch (error) {
    badge.textContent = "ERROR";
    summary.textContent = error.message;
    results.innerHTML = "";
    setStatus(error.message, true);
  } finally {
    if (button) button.disabled = false;
  }
}

async function loadResearchJobs() {
  try {
    const data = await request(RESEARCH_URL);
    const box = document.getElementById("researchJobs");
    const badge = document.getElementById("researchBadge");
    const jobs = data.jobs || [];
    const active = jobs.filter((job) => ["QUEUED","RUNNING"].includes(job.status)).length;
    if (badge) badge.textContent = active ? active + " ACTIVE" : "READY";
    if (!box) return;
    box.innerHTML = jobs.length
      ? jobs.map((job) => {
          const statusClass = job.status === "COMPLETED" ? "job-completed" : (job.status === "FAILED" || job.status === "DISPATCH_FAILED" ? "job-failed" : "job-running");
          return '<div class="research-job"><strong>' + escapeHTML(job.productName) + '</strong><div class="job-actions"><span class="job-status ' + statusClass + '">' + escapeHTML(job.status) + '</span><span>' + escapeHTML(job.resultCount || 0) + ' opps</span></div><small>' + escapeHTML(job.id) + ' · ' + escapeHTML(job.targetMarket || "GCC") + ' · ' + escapeHTML(new Date(job.createdAt).toLocaleString()) + (job.dispatch?.provider ? ' · ' + escapeHTML(job.dispatch.provider) : '') + '</small></div>';
        }).join("")
      : "<p class='small-note'>No research jobs yet.</p>";
  } catch (error) {
    const box = document.getElementById("researchJobs");
    if (box) box.textContent = error.message;
  }
}

async function loadAll() {
  try {
    const [monitoring, guarantee] = await Promise.all([request(MONITORING_URL), request(GUARANTEE_URL)]);
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
    rejected.innerHTML = gs.rejected?.length ? gs.rejected.map((item) => `<div class="reject-item"><strong>${escapeHTML(item.companyName || item.id)}</strong><span>Score ${escapeHTML(item.score)}</span><small>${escapeHTML(item.reasons.join(" "))}</small></div>`).join("") : "<p class='small-note'>No recent non-qualified opportunities in the current period.</p>";
  } catch (error) {
    setStatus(error.message, true);
    if (error.message.includes("log in")) setTimeout(() => location.href = "/admin/", 700);
  }
}

document.getElementById("monitorForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request(MONITORING_URL, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: document.getElementById("monitorEnabled").checked, intervalMinutes: Number(document.getElementById("monitorInterval").value), sources: document.getElementById("monitorSources").value.split("\n").map((v) => v.trim()).filter(Boolean), notes: document.getElementById("monitorNotes").value }) });
    setStatus("Monitoring settings saved."); loadAll(); loadResearchJobs();
  } catch (error) { setStatus(error.message, true); }
});

document.getElementById("guaranteeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request(GUARANTEE_URL, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetQualifiedOpportunities: Number(document.getElementById("targetQualified").value), periodDays: Number(document.getElementById("periodDays").value), minimumScore: Number(document.getElementById("minimumScore").value), requireVerifiedEvidence: document.getElementById("requireEvidence").checked, requireWhyNowHigh: document.getElementById("requireWhyNow").checked, replacementPolicy: document.getElementById("replacementPolicy").value }) });
    setStatus("Guarantee rules saved."); loadAll();
  } catch (error) { setStatus(error.message, true); }
});

document.getElementById("logoutBtn").addEventListener("click", () => { localStorage.removeItem("admin_session"); location.href = "/admin/"; });
document.getElementById("runSystemCheck").addEventListener("click", runSystemCheck);

const researchForm = document.getElementById("researchForm");
if (researchForm) {
  researchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = researchForm.querySelector("button[type=submit]");
    if (button) button.disabled = true;
    try {
      const payload = {
        productName: document.getElementById("researchProduct").value,
        targetMarket: document.getElementById("researchMarket").value,
        researchQuestion: document.getElementById("researchQuestion").value,
        targetCompanyTypes: document.getElementById("researchCompanyTypes").value.split("\n").map((v) => v.trim()).filter(Boolean),
        targetVesselTypes: document.getElementById("researchVesselTypes").value.split("\n").map((v) => v.trim()).filter(Boolean),
        relevantSignals: document.getElementById("researchSignals").value.split("\n").map((v) => v.trim()).filter(Boolean),
        targetDecisionMakerRoles: document.getElementById("researchRoles").value.split("\n").map((v) => v.trim()).filter(Boolean),
        maxOpportunities: Number(document.getElementById("researchMax").value),
        language: document.getElementById("researchLanguage").value
      };
      const data = await request(RESEARCH_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setStatus(data.job?.status === "RUNNING" ? "Research job dispatched." : "Research job queued. Connect n8n to run it.");
      researchForm.reset(); document.getElementById("researchMax").value = 10; await loadResearchJobs();
    } catch (error) { setStatus(error.message, true); }
    finally { if (button) button.disabled = false; }
  });
}

loadAll();
loadResearchJobs();
