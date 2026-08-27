const OPPORTUNITIES_URL = "/api/admin/opportunities";
const CONFIG_URL = "/api/admin/opportunity-config";
const session = localStorage.getItem("admin_session");

function authHeaders(extra = {}) {
  return { ...extra, Authorization: `Bearer ${session}` };
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function lines(id) {
  return document.getElementById(id).value.split(/\n+/).map((v) => v.trim()).filter(Boolean);
}

function numberValue(id) {
  const value = Number(document.getElementById(id).value);
  return Number.isFinite(value) ? value : 0;
}

if (!session) {
  document.getElementById("loginBox").innerHTML = `<h1>Admin session required</h1><p>Log in through the main Admin page first.</p><button id="loginBackBtn">Back to Admin</button>`;
  document.getElementById("loginBackBtn").onclick = () => { location.href = "/admin/"; };
} else {
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("panel").classList.remove("hidden");
  document.getElementById("filterBtn").onclick = loadOpportunities;
  document.getElementById("configForm").addEventListener("submit", saveConfig);
  document.getElementById("opportunityForm").addEventListener("submit", createOpportunity);
  loadAll();
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: authHeaders(options.headers) });
  if (response.status === 401) {
    location.href = "/admin/";
    throw new Error("Unauthorized");
  }
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || "Request failed");
  return data;
}

async function loadAll() {
  await Promise.all([loadConfig(), loadOpportunities()]);
}

async function loadConfig() {
  try {
    const data = await request(CONFIG_URL);
    const config = data.config || {};
    document.getElementById("productName").value = config.productName || "";
    document.getElementById("regions").value = (config.regions || []).join("\n");
    document.getElementById("targetCompanyTypes").value = (config.targetCompanyTypes || []).join("\n");
    document.getElementById("targetVesselTypes").value = (config.targetVesselTypes || []).join("\n");
    document.getElementById("targetSegments").value = (config.targetSegments || []).join("\n");
    document.getElementById("relevantSignals").value = (config.relevantSignals || []).join("\n");
    document.getElementById("targetDecisionMakerRoles").value = (config.targetDecisionMakerRoles || []).join("\n");
    document.getElementById("minVesselLength").value = config.minVesselLength ?? "";
    document.getElementById("configNotes").value = config.notes || "";
  } catch (error) {
    document.getElementById("configStatus").textContent = error.message;
  }
}

async function saveConfig(event) {
  event.preventDefault();
  try {
    await request(CONFIG_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: document.getElementById("productName").value,
        regions: lines("regions"),
        targetCompanyTypes: lines("targetCompanyTypes"),
        targetVesselTypes: lines("targetVesselTypes"),
        minVesselLength: document.getElementById("minVesselLength").value,
        targetSegments: lines("targetSegments"),
        relevantSignals: lines("relevantSignals"),
        targetDecisionMakerRoles: lines("targetDecisionMakerRoles"),
        notes: document.getElementById("configNotes").value
      })
    });
    document.getElementById("configStatus").textContent = "ICP saved.";
  } catch (error) {
    document.getElementById("configStatus").textContent = error.message;
  }
}

async function createOpportunity(event) {
  event.preventDefault();

  const observedAt = document.getElementById("evidenceObservedAt").value
    ? new Date(document.getElementById("evidenceObservedAt").value).toISOString()
    : "";

  const evidenceTitle = document.getElementById("evidenceTitle").value.trim();
  const evidenceSummary = document.getElementById("evidenceSummary").value.trim();
  const evidence = evidenceTitle || evidenceSummary
    ? [{
        title: evidenceTitle,
        summary: evidenceSummary,
        sourceName: document.getElementById("evidenceSourceName").value.trim(),
        sourceUrl: document.getElementById("evidenceSourceUrl").value.trim(),
        observedAt,
        evidenceLevel: document.getElementById("evidenceLevel").value
      }]
    : [];

  try {
    const data = await request(OPPORTUNITIES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: document.getElementById("companyName").value,
        companyId: document.getElementById("companyId").value,
        productName: document.getElementById("productNameOpportunity").value,
        vesselIds: document.getElementById("vesselIds").value.split(",").map((v) => v.trim()).filter(Boolean),
        companyFit: numberValue("companyFit"),
        productFit: numberValue("productFit"),
        fleetFit: numberValue("fleetFit"),
        buyingSignalStrength: numberValue("buyingSignalStrength"),
        signalRecency: numberValue("signalRecency"),
        decisionMakerConfidence: numberValue("decisionMakerConfidence"),
        commercialRelevance: numberValue("commercialRelevance"),
        timingUrgency: numberValue("timingUrgency"),
        buyingSignals: lines("buyingSignals"),
        decisionMaker: {
          name: document.getElementById("decisionMakerName").value,
          role: document.getElementById("decisionMakerRole").value || "UNKNOWN",
          relevance: numberValue("decisionMakerRelevance"),
          confidence: numberValue("decisionMakerConfidence"),
          influence: numberValue("decisionMakerInfluence")
        },
        whyNow: document.getElementById("whyNow").value,
        recommendedAction: document.getElementById("recommendedAction").value,
        salesAngle: document.getElementById("salesAngle").value,
        outreachDraft: document.getElementById("outreachDraft").value,
        evidence
      })
    });

    event.target.reset();
    ["companyFit","productFit","fleetFit","buyingSignalStrength","signalRecency","decisionMakerConfidence","commercialRelevance","timingUrgency","decisionMakerRelevance","decisionMakerInfluence"].forEach((id) => document.getElementById(id).value = 0);
    alert(`Opportunity created: ${data.opportunity.id} — Score ${data.opportunity.opportunityScore}/100`);
    await loadOpportunities();
  } catch (error) {
    alert(error.message);
  }
}

async function loadOpportunities() {
  try {
    const params = new URLSearchParams();
    const status = document.getElementById("statusFilter")?.value || "";
    const minScore = document.getElementById("minScoreFilter")?.value || "";
    if (status) params.set("status", status);
    if (minScore) params.set("minScore", minScore);

    const data = await request(`${OPPORTUNITIES_URL}?${params.toString()}`);
    renderOpportunities(data.opportunities || []);
  } catch (error) {
    document.getElementById("opportunityTable").innerHTML = `<tr><td colspan="7">${escapeHTML(error.message)}</td></tr>`;
  }
}

function scoreClass(score) {
  if (score >= 80) return "oi-good";
  if (score >= 60) return "oi-warn";
  return "oi-low";
}

function renderOpportunities(items) {
  const table = document.getElementById("opportunityTable");
  table.innerHTML = "";

  if (!items.length) {
    table.innerHTML = `<tr><td colspan="7" class="oi-muted">No opportunities yet.</td></tr>`;
    return;
  }

  for (const item of items) {
    const row = document.createElement("tr");
    const dm = item.decisionMaker || {};
    row.innerHTML = `
      <td><span class="oi-score">${escapeHTML(item.opportunityScore)}</span></td>
      <td>${escapeHTML(item.companyName)}</td>
      <td>${escapeHTML(item.productName)}</td>
      <td>${escapeHTML(item.whyNow || "UNKNOWN")}</td>
      <td>${escapeHTML(dm.name || "UNKNOWN")}<br><span class="oi-muted">${escapeHTML(dm.role || "UNKNOWN")}</span></td>
      <td><span class="oi-chip">${escapeHTML(item.status)}</span></td>
      <td class="oi-row-action"><button data-id="${escapeHTML(item.id)}">View</button></td>
    `;
    row.querySelector("button").onclick = () => showDetail(item);
    table.appendChild(row);
  }
}

function showDetail(item) {
  const box = document.getElementById("detailCard");
  const dm = item.decisionMaker || {};
  const components = item.scoringComponents || {};
  const evidence = item.evidence || [];

  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="oi-list-head">
      <div><h2>${escapeHTML(item.companyName)}</h2><div class="oi-muted">${escapeHTML(item.id)}</div></div>
      <div class="oi-score">${escapeHTML(item.opportunityScore)}/100</div>
    </div>
    <div class="oi-detail-grid">
      <div><strong>Product</strong><p>${escapeHTML(item.productName)}</p></div>
      <div><strong>Status</strong><p>${escapeHTML(item.status)}</p></div>
      <div><strong>Why Now</strong><p>${escapeHTML(item.whyNow || "UNKNOWN")}</p><span class="oi-chip ${item.whyNowConfidence === "HIGH" ? "oi-good" : item.whyNowConfidence === "MEDIUM" ? "oi-warn" : "oi-low"}">${escapeHTML(item.whyNowConfidence)} confidence</span></div>
      <div><strong>Decision Maker</strong><p>${escapeHTML(dm.name || "UNKNOWN")} — ${escapeHTML(dm.role || "UNKNOWN")}</p><span class="oi-muted">Confidence: ${escapeHTML(dm.confidence ?? 0)} / 100</span></div>
      <div><strong>Recommended Action</strong><p>${escapeHTML(item.recommendedAction || "UNKNOWN")}</p></div>
      <div><strong>Sales Angle</strong><p>${escapeHTML(item.salesAngle || "UNKNOWN")}</p></div>
      <div class="oi-detail-wide"><strong>Score Breakdown</strong><pre>${escapeHTML(JSON.stringify(components, null, 2))}</pre></div>
      <div class="oi-detail-wide"><strong>Evidence</strong>${evidence.length ? evidence.map((e) => `
        <div class="oi-evidence">
          <strong>${escapeHTML(e.title || "Untitled evidence")}</strong>
          <div>${escapeHTML(e.summary || "")}</div>
          <div class="oi-muted">${escapeHTML(e.evidenceLevel)} — ${escapeHTML(e.observedAt || "UNKNOWN")}</div>
          <div class="oi-link">${escapeHTML(e.sourceUrl || e.sourceName || "Source UNKNOWN")}</div>
        </div>`).join("") : `<div class="oi-muted">No evidence recorded.</div>`}</div>
    </div>
  `;
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

