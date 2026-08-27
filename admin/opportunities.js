const OPPORTUNITIES_URL = "/api/admin/opportunities";
const CONFIG_URL = "/api/admin/opportunity-config";
const session = localStorage.getItem("admin_session");
let currentOpportunityItems = [];

function authHeaders(extra = {}) {
  return {
    ...extra,
    Authorization: `Bearer ${session}`
  };
}


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function lines(id) {
  return document
    .getElementById(id)
    .value
    .split(/\n+/)
    .map((v) => v.trim())
    .filter(Boolean);
}


function numberValue(id) {
  const value =
    Number(
      document.getElementById(id).value
    );

  return Number.isFinite(value)
    ? value
    : 0;
}
function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    return "";
  }

  const localDate =
    new Date(
      date.getTime() -
      date.getTimezoneOffset() *
        60000
    );

  return localDate
    .toISOString()
    .slice(0, 16);
}


function toISOStringOrEmpty(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toISOString();
}

// =======================
// SESSION
// =======================

if (!session) {
  document.getElementById(
    "loginBox"
  ).innerHTML = `
    <h1>Admin session required</h1>
    <p>Log in through the main Admin page first.</p>
    <button id="loginBackBtn">
      Back to Admin
    </button>
  `;

  document.getElementById(
    "loginBackBtn"
  ).onclick = () => {
    location.href = "/admin/";
  };

} else {

  document.getElementById(
    "loginBox"
  ).classList.add("hidden");

  document.getElementById(
    "panel"
  ).classList.remove("hidden");

  document.getElementById(
    "filterBtn"
  ).onclick = loadOpportunities;

  document.getElementById(
    "configForm"
  ).addEventListener(
    "submit",
    saveConfig
  );

  document.getElementById(
    "opportunityForm"
  ).addEventListener(
    "submit",
    createOpportunity
  );

  loadAll();
}


// =======================
// REQUEST
// =======================

async function request(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      {
        ...options,
        headers:
          authHeaders(
            options.headers
          )
      }
    );

  if (
    response.status === 401
  ) {
    location.href = "/admin/";

    throw new Error(
      "Unauthorized"
    );
  }

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.success
  ) {
    throw new Error(
      data.error ||
      "Request failed"
    );
  }

  return data;
}


// =======================
// INITIAL LOAD
// =======================

async function loadAll() {
  await Promise.all([
    loadConfig(),
    loadOpportunities()
  ]);
}


// =======================
// ICP CONFIG
// =======================

async function loadConfig() {
  try {

    const data =
      await request(
        CONFIG_URL
      );

    const config =
      data.config || {};

    document.getElementById(
      "productName"
    ).value =
      config.productName || "";

    document.getElementById(
      "regions"
    ).value =
      (config.regions || [])
        .join("\n");

    document.getElementById(
      "targetCompanyTypes"
    ).value =
      (
        config.targetCompanyTypes ||
        []
      ).join("\n");

    document.getElementById(
      "targetVesselTypes"
    ).value =
      (
        config.targetVesselTypes ||
        []
      ).join("\n");

    document.getElementById(
      "targetSegments"
    ).value =
      (
        config.targetSegments ||
        []
      ).join("\n");

    document.getElementById(
      "relevantSignals"
    ).value =
      (
        config.relevantSignals ||
        []
      ).join("\n");

    document.getElementById(
      "targetDecisionMakerRoles"
    ).value =
      (
        config.targetDecisionMakerRoles ||
        []
      ).join("\n");

    document.getElementById(
      "minVesselLength"
    ).value =
      config.minVesselLength ??
      "";

    document.getElementById(
      "configNotes"
    ).value =
      config.notes || "";

  } catch (error) {

    document.getElementById(
      "configStatus"
    ).textContent =
      error.message;
  }
}


async function saveConfig(event) {
  event.preventDefault();

  try {

    await request(
      CONFIG_URL,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          productName:
            document.getElementById(
              "productName"
            ).value,

          regions:
            lines("regions"),

          targetCompanyTypes:
            lines(
              "targetCompanyTypes"
            ),

          targetVesselTypes:
            lines(
              "targetVesselTypes"
            ),

          minVesselLength:
            document.getElementById(
              "minVesselLength"
            ).value,

          targetSegments:
            lines(
              "targetSegments"
            ),

          relevantSignals:
            lines(
              "relevantSignals"
            ),

          targetDecisionMakerRoles:
            lines(
              "targetDecisionMakerRoles"
            ),

          notes:
            document.getElementById(
              "configNotes"
            ).value
        })
      }
    );

    document.getElementById(
      "configStatus"
    ).textContent =
      "ICP saved.";

  } catch (error) {

    document.getElementById(
      "configStatus"
    ).textContent =
      error.message;
  }
}


// =======================
// CREATE OPPORTUNITY
// =======================

async function createOpportunity(
  event
) {
  event.preventDefault();

  const observedAt =
    document.getElementById(
      "evidenceObservedAt"
    ).value
      ? new Date(
          document.getElementById(
            "evidenceObservedAt"
          ).value
        ).toISOString()
      : "";

  const evidenceTitle =
    document.getElementById(
      "evidenceTitle"
    ).value.trim();

  const evidenceSummary =
    document.getElementById(
      "evidenceSummary"
    ).value.trim();

  const evidence =
    evidenceTitle ||
    evidenceSummary
      ? [
          {
            title:
              evidenceTitle,

            summary:
              evidenceSummary,

            sourceName:
              document.getElementById(
                "evidenceSourceName"
              ).value.trim(),

            sourceUrl:
              document.getElementById(
                "evidenceSourceUrl"
              ).value.trim(),

            observedAt,

            evidenceLevel:
              document.getElementById(
                "evidenceLevel"
              ).value
          }
        ]
      : [];

  try {

    const data =
      await request(
        OPPORTUNITIES_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              companyName:
                document.getElementById(
                  "companyName"
                ).value,

              companyId:
                document.getElementById(
                  "companyId"
                ).value,

              productName:
                document.getElementById(
                  "productNameOpportunity"
                ).value,

              vesselIds:
                document.getElementById(
                  "vesselIds"
                )
                  .value
                  .split(",")
                  .map(
                    (v) =>
                      v.trim()
                  )
                  .filter(Boolean),

              companyFit:
                numberValue(
                  "companyFit"
                ),

              productFit:
                numberValue(
                  "productFit"
                ),

              fleetFit:
                numberValue(
                  "fleetFit"
                ),

              buyingSignalStrength:
                numberValue(
                  "buyingSignalStrength"
                ),

              signalRecency:
                numberValue(
                  "signalRecency"
                ),

              decisionMakerConfidence:
                numberValue(
                  "decisionMakerConfidence"
                ),

              commercialRelevance:
                numberValue(
                  "commercialRelevance"
                ),

              timingUrgency:
                numberValue(
                  "timingUrgency"
                ),

              buyingSignals:
                lines(
                  "buyingSignals"
                ),

              decisionMaker: {
                name:
                  document.getElementById(
                    "decisionMakerName"
                  ).value,

                role:
                  document.getElementById(
                    "decisionMakerRole"
                  ).value ||
                  "UNKNOWN",

                relevance:
                  numberValue(
                    "decisionMakerRelevance"
                  ),

                confidence:
                  numberValue(
                    "decisionMakerConfidence"
                  ),

                influence:
                  numberValue(
                    "decisionMakerInfluence"
                  )
              },

              whyNow:
                document.getElementById(
                  "whyNow"
                ).value,

              recommendedAction:
                document.getElementById(
                  "recommendedAction"
                ).value,

              salesAngle:
                document.getElementById(
                  "salesAngle"
                ).value,

              outreachDraft:
                document.getElementById(
                  "outreachDraft"
                ).value,

              evidence
            })
        }
      );

    event.target.reset();

    [
      "companyFit",
      "productFit",
      "fleetFit",
      "buyingSignalStrength",
      "signalRecency",
      "decisionMakerConfidence",
      "commercialRelevance",
      "timingUrgency",
      "decisionMakerRelevance",
      "decisionMakerInfluence"
    ].forEach(
      (id) => {
        document.getElementById(
          id
        ).value = 0;
      }
    );

    alert(
      `Opportunity created: ${data.opportunity.id} — Score ${data.opportunity.opportunityScore}/100`
    );

    await loadOpportunities();

  } catch (error) {

    alert(
      error.message
    );
  }
}


// =======================
// LOAD OPPORTUNITIES
// =======================

async function loadOpportunities() {
  try {

    const params =
      new URLSearchParams();

    const status =
      document.getElementById(
        "statusFilter"
      )?.value || "";

    const minScore =
      document.getElementById(
        "minScoreFilter"
      )?.value || "";

    if (status) {
      params.set(
        "status",
        status
      );
    }

    if (minScore) {
      params.set(
        "minScore",
        minScore
      );
    }

    const data =
      await request(
        `${OPPORTUNITIES_URL}?${params.toString()}`
      );
currentOpportunityItems =
  data.opportunities ||
  [];

renderOpportunities(
  currentOpportunityItems
);
    
  } catch (error) {

    document.getElementById(
      "opportunityTable"
    ).innerHTML = `
      <tr>
        <td colspan="7">
          ${escapeHTML(
            error.message
          )}
        </td>
      </tr>
    `;
  }
}


// =======================
// SCORE DISPLAY
// =======================

function scoreClass(score) {
  if (score >= 80) {
    return "oi-good";
  }

  if (score >= 60) {
    return "oi-warn";
  }

  return "oi-low";
}


// =======================
// UPDATE STATUS
// =======================

async function updateOpportunityStatus(
  id,
  status
) {
  try {

    await request(
      OPPORTUNITIES_URL,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            id,
            status
          })
      }
    );

    await loadOpportunities();

  } catch (error) {

    alert(
      error.message
    );
  }
}


// =======================
// UPDATE OUTCOME
// =======================

async function updateOpportunityOutcome(
  id
) {

  const type =
    document.getElementById(
      "outcomeType"
    )?.value || "";

  const reason =
    document.getElementById(
      "outcomeReason"
    )?.value || "";

  const notes =
    document.getElementById(
      "outcomeNotes"
    )?.value || "";

  if (!type) {
    alert(
      "Select an outcome type."
    );
    return;
  }

  try {

    const data =
      await request(
        OPPORTUNITIES_URL,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              id,

              outcome: {
                type,
                reason,
                notes,
                source:
                  "MANUAL"
              }
            })
        }
      );

    await loadOpportunities();

    showDetail(
      data.opportunity
    );

    alert(
      "Outcome saved."
    );

  } catch (error) {

    alert(
      error.message
    );
  }
}
// =======================
// UPDATE DM VERIFICATION
// =======================

async function updateDecisionMakerVerification(
  id
) {
  const verificationStatus =
    document.getElementById(
      "dmVerificationStatus"
    )?.value || "UNVERIFIED";

  const sourceName =
    document.getElementById(
      "dmVerificationSourceName"
    )?.value.trim() || "";

  const sourceUrl =
    document.getElementById(
      "dmVerificationSourceUrl"
    )?.value.trim() || "";

  const notes =
    document.getElementById(
      "dmVerificationNotes"
    )?.value.trim() || "";

  const verifiedAtInput =
    document.getElementById(
      "dmVerifiedAt"
    )?.value || "";

  const verifiedAt =
    toISOStringOrEmpty(
      verifiedAtInput
    );

  const hasSource =
    Boolean(
      sourceName ||
      sourceUrl
    );

  /*
   * Evidence-first client validation.
   * Backend rules remain authoritative.
   */
  if (
    verificationStatus ===
      "VERIFIED" &&
    (
      !hasSource ||
      !verifiedAt
    )
  ) {
    alert(
      "VERIFIED requires a verification source and verification time."
    );

    return;
  }

  if (
    verificationStatus ===
      "PARTIAL" &&
    (
      !hasSource &&
      !verifiedAt
    )
  ) {
    alert(
      "PARTIAL requires at least a verification source or verification time."
    );

    return;
  }

  const hasEvidence =
    Boolean(
      sourceName ||
      sourceUrl ||
      notes ||
      verifiedAt
    );

  try {
    const data =
      await request(
        OPPORTUNITIES_URL,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              id,

              decisionMaker: {
                verificationStatus,

                verificationEvidence:
                  hasEvidence
                    ? {
                        sourceName,
                        sourceUrl,
                        notes,
                        verifiedAt
                      }
                    : null
              }
            })
        }
      );

    await loadOpportunities();

    showDetail(
      data.opportunity
    );

    const resolvedStatus =
      data.opportunity
        ?.decisionMaker
        ?.verificationStatus ||
      "UNKNOWN";

    if (
      resolvedStatus !==
      verificationStatus
    ) {
      alert(
        `Verification saved, but the evidence rules resolved the status to ${resolvedStatus}.`
      );
    } else {
      alert(
        `Decision maker verification saved as ${resolvedStatus}.`
      );
    }

  } catch (error) {
    alert(
      error.message
    );
  }
}

// =======================
// OPPORTUNITY TABLE
// =======================

function renderOpportunities(
  items
) {

  const table =
    document.getElementById(
      "opportunityTable"
    );

  table.innerHTML = "";

  if (!items.length) {

    table.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="oi-muted"
        >
          No opportunities yet.
        </td>
      </tr>
    `;

    return;
  }

  for (
    const item of items
  ) {

    const row =
      document.createElement(
        "tr"
      );

    const dm =
      item.decisionMaker ||
      {};

    row.innerHTML = `
      <td>
        <span class="oi-score">
          ${escapeHTML(
            item.opportunityScore
          )}
        </span>
      </td>

      <td>
        ${escapeHTML(
          item.companyName
        )}
      </td>

      <td>
        ${escapeHTML(
          item.productName
        )}
      </td>

      <td>
        ${escapeHTML(
          item.whyNow ||
          "UNKNOWN"
        )}
      </td>

      <td>
        ${escapeHTML(
          dm.name ||
          "UNKNOWN"
        )}

        <br>

        <span class="oi-muted">
          ${escapeHTML(
            dm.role ||
            "UNKNOWN"
          )}
        </span>
      </td>

      <td>
        <select
          class="oi-status-select"
          data-status-id="${escapeHTML(
            item.id
          )}"
        >
          ${[
            "New",
            "Reviewed",
            "Qualified",
            "Outreach Ready",
            "Contacted",
            "Replied",
            "Meeting",
            "Opportunity",
            "Won",
            "Lost",
            "Disqualified"
          ].map(
            (status) => `
              <option
                value="${status}"
                ${
                  status ===
                  item.status
                    ? "selected"
                    : ""
                }
              >
                ${status}
              </option>
            `
          ).join("")}
        </select>
      </td>

      <td class="oi-row-action">
        <button
          data-id="${escapeHTML(
            item.id
          )}"
        >
          View
        </button>
      </td>
    `;

    row.querySelector(
      "button"
    ).onclick = () => {
      showDetail(
        item
      );
    };

    row.querySelector(
      ".oi-status-select"
    ).onchange =
      async (event) => {

        await updateOpportunityStatus(
          item.id,
          event.target.value
        );
      };

    table.appendChild(
      row
    );
  }
}


// =======================
// DETAIL VIEW
// =======================

function showDetail(item) {

  const box =
    document.getElementById(
      "detailCard"
    );

  const dm =
    item.decisionMaker ||
    {};

  const components =
    item.scoreBreakdown ||
    {};

  const evidence =
    item.evidence ||
    [];

  const outcome =
    item.outcome ||
    null;

  const verificationEvidence =
    dm.verificationEvidence ||
    {};


  const verificationClass =
    dm.verificationStatus ===
    "VERIFIED"
      ? "oi-good"
      : dm.verificationStatus ===
        "PARTIAL"
        ? "oi-warn"
        : "oi-low";


  const priorityClass =
    dm.contactPriority ===
    "HIGH"
      ? "oi-good"
      : dm.contactPriority ===
        "MEDIUM"
        ? "oi-warn"
        : "oi-low";


  box.classList.remove(
    "hidden"
  );


  box.innerHTML = `

    <div class="oi-list-head">

      <div>
        <h2>
          ${escapeHTML(
            item.companyName
          )}
        </h2>

        <div class="oi-muted">
          ${escapeHTML(
            item.id
          )}
        </div>
      </div>

      <div class="oi-score">
        ${escapeHTML(
          item.opportunityScore
        )}/100
      </div>

    </div>


    <div class="oi-detail-grid">


      <div>
        <strong>
          Product
        </strong>

        <p>
          ${escapeHTML(
            item.productName
          )}
        </p>
      </div>


      <div>
        <strong>
          Status
        </strong>

        <p>
          ${escapeHTML(
            item.status
          )}
        </p>
      </div>


      <div>
        <strong>
          Why Now
        </strong>

        <p>
          ${escapeHTML(
            item.whyNow ||
            "UNKNOWN"
          )}
        </p>

        <span
          class="oi-chip ${
            item.whyNowConfidence ===
            "HIGH"
              ? "oi-good"
              : item.whyNowConfidence ===
                "MEDIUM"
                ? "oi-warn"
                : "oi-low"
          }"
        >
          ${escapeHTML(
            item.whyNowConfidence
          )}
          confidence
        </span>
      </div>


      <div>

        <strong>
          Decision Maker
        </strong>

        <p>
          ${escapeHTML(
            dm.name ||
            "UNKNOWN"
          )}
          —
          ${escapeHTML(
            dm.role ||
            "UNKNOWN"
          )}
        </p>

        <div class="oi-muted">
          Confidence:
          ${escapeHTML(
            dm.confidence ??
            0
          )}
          / 100
        </div>

        <div class="oi-muted">
          Relevance:
          ${escapeHTML(
            dm.relevance ??
            0
          )}
          / 100
        </div>

        <div class="oi-muted">
          Influence:
          ${escapeHTML(
            dm.influence ??
            0
          )}
          / 100
        </div>

        <p>

          <span
            class="oi-chip ${verificationClass}"
          >
            ${escapeHTML(
              dm.verificationStatus ||
              "UNKNOWN"
            )}
          </span>

          <span
            class="oi-chip ${priorityClass}"
          >
            ${escapeHTML(
              dm.contactPriority ||
              "LOW"
            )}
            contact priority
          </span>

        </p>

        <div class="oi-muted">
          Decision Priority Score:
          ${escapeHTML(
            dm.priorityScore ??
            0
          )}
          / 100
        </div>

        <div class="oi-muted">
          Intelligence Source:
          ${escapeHTML(
            dm.intelligenceSource ||
            "UNKNOWN"
          )}
        </div>

      </div>


      <div class="oi-detail-wide">

        <strong>
          Why This Person Matters
        </strong>

        <p>
          ${escapeHTML(
            dm.whyThisPersonMatters ||
            "Decision-maker relevance has not been established."
          )}
        </p>

      </div>


      <!-- =====================
           DM VERIFICATION
           ===================== -->

      <div class="oi-detail-wide">

        <strong>
          Decision-Maker Verification
        </strong>

        <p class="oi-muted">
          Verification is evidence-based.
          VERIFIED requires a recorded source
          and verification time.
        </p>


        <div class="oi-grid">


          <label>

            Verification Status

            <select
              id="dmVerificationStatus"
            >

              ${[
                "UNKNOWN",
                "UNVERIFIED",
                "PARTIAL",
                "VERIFIED"
              ].map(
                (status) => `
                  <option
                    value="${status}"
                    ${
                      dm.verificationStatus ===
                      status
                        ? "selected"
                        : ""
                    }
                  >
                    ${status}
                  </option>
                `
              ).join("")}

            </select>

          </label>


          <label>

            Source Name

            <input
              id="dmVerificationSourceName"
              value="${escapeHTML(
                verificationEvidence
                  .sourceName || ""
              )}"
              placeholder="Company website, LinkedIn, registry, etc."
            >

          </label>


          <label class="wide">

            Source URL

            <input
              id="dmVerificationSourceUrl"
              value="${escapeHTML(
                verificationEvidence
                  .sourceUrl || ""
              )}"
              placeholder="https://..."
            >

          </label>


          <label>

            Verified At

            <input
              id="dmVerifiedAt"
              type="datetime-local"
              value="${escapeHTML(
                toDateTimeLocalValue(
                  verificationEvidence
                    .verifiedAt || ""
                )
              )}"
            >

          </label>


          <label class="wide">

            Verification Notes

            <textarea
              id="dmVerificationNotes"
              placeholder="What was verified, from which source, and any remaining uncertainty."
            >${escapeHTML(
              verificationEvidence
                .notes || ""
            )}</textarea>

          </label>


          <div class="wide">

            <button
              type="button"
              id="saveDmVerificationBtn"
            >
              Save Verification
            </button>

          </div>

        </div>


        ${
          verificationEvidence &&
          (
            verificationEvidence.sourceName ||
            verificationEvidence.sourceUrl ||
            verificationEvidence.notes ||
            verificationEvidence.verifiedAt
          )
            ? `
              <div class="oi-evidence">

                <strong>
                  Recorded Verification Evidence
                </strong>

                <div>
                  Source:
                  ${escapeHTML(
                    verificationEvidence
                      .sourceName ||
                    "UNKNOWN"
                  )}
                </div>

                ${
                  verificationEvidence.sourceUrl
                    ? `
                      <div class="oi-link">
                        ${escapeHTML(
                          verificationEvidence
                            .sourceUrl
                        )}
                      </div>
                    `
                    : ""
                }

                ${
                  verificationEvidence.notes
                    ? `
                      <div>
                        ${escapeHTML(
                          verificationEvidence
                            .notes
                        )}
                      </div>
                    `
                    : ""
                }

                <div class="oi-muted">
                  Verified At:
                  ${escapeHTML(
                    verificationEvidence
                      .verifiedAt ||
                    "UNKNOWN"
                  )}
                </div>

              </div>
            `
            : `
              <div class="oi-muted">
                No decision-maker verification
                evidence recorded.
              </div>
            `
        }

      </div>


      <div>

        <strong>
          Recommended Action
        </strong>

        <p>
          ${escapeHTML(
            item.recommendedAction ||
            "UNKNOWN"
          )}
        </p>

        <span class="oi-muted">
          Source:
          ${escapeHTML(
            item.recommendedActionSource ||
            "UNKNOWN"
          )}
        </span>

      </div>


      <div>

        <strong>
          Sales Angle
        </strong>

        <p>
          ${escapeHTML(
            item.salesAngle ||
            "UNKNOWN"
          )}
        </p>

        <span class="oi-muted">
          Source:
          ${escapeHTML(
            item.salesAngleSource ||
            "UNKNOWN"
          )}
        </span>

      </div>


      <!-- =====================
           OUTCOME TRACKING
           ===================== -->

      <div class="oi-detail-wide">

        <strong>
          Outcome Tracking
        </strong>

        <p class="oi-muted">
          Record the observed commercial result.
          This data will support future learning
          and ranking.
        </p>


        <div class="oi-grid">


          <label>

            Outcome Type

            <select id="outcomeType">

              <option value="">
                Select outcome
              </option>

              ${[
                "Positive Reply",
                "Negative Reply",
                "Meeting Booked",
                "Qualified Opportunity",
                "Won",
                "Lost",
                "Disqualified"
              ].map(
                (type) => `
                  <option
                    value="${type}"
                    ${
                      outcome?.type ===
                      type
                        ? "selected"
                        : ""
                    }
                  >
                    ${type}
                  </option>
                `
              ).join("")}

            </select>

          </label>


          <label>

            Reason

            <input
              id="outcomeReason"
              value="${escapeHTML(
                outcome?.reason ||
                ""
              )}"
              placeholder="Why did this outcome happen?"
            >

          </label>


          <label class="wide">

            Notes

            <textarea
              id="outcomeNotes"
              placeholder="Observed result, context, or follow-up notes"
            >${escapeHTML(
              outcome?.notes ||
              ""
            )}</textarea>

          </label>


          <div class="wide">

            <button
              type="button"
              id="saveOutcomeBtn"
            >
              Save Outcome
            </button>

          </div>


        </div>


        ${
          outcome
            ? `
              <div class="oi-evidence">

                <strong>
                  Current Outcome:
                  ${escapeHTML(
                    outcome.type
                  )}
                </strong>

                ${
                  outcome.reason
                    ? `
                      <div>
                        ${escapeHTML(
                          outcome.reason
                        )}
                      </div>
                    `
                    : ""
                }

                ${
                  outcome.notes
                    ? `
                      <div class="oi-muted">
                        ${escapeHTML(
                          outcome.notes
                        )}
                      </div>
                    `
                    : ""
                }

                <div class="oi-muted">

                  Recorded:
                  ${escapeHTML(
                    outcome.recordedAt ||
                    "UNKNOWN"
                  )}

                  —

                  Source:
                  ${escapeHTML(
                    outcome.source ||
                    "UNKNOWN"
                  )}

                </div>

              </div>
            `
            : `
              <div class="oi-muted">
                No outcome recorded yet.
              </div>
            `
        }

      </div>


      <!-- =====================
           SCORE BREAKDOWN
           ===================== -->

      <div class="oi-detail-wide">

        <strong>
          Score Breakdown
        </strong>

        <pre>${escapeHTML(
          JSON.stringify(
            components,
            null,
            2
          )
        )}</pre>

      </div>


      <!-- =====================
           EVIDENCE
           ===================== -->

      <div class="oi-detail-wide">

        <strong>
          Evidence
        </strong>

        ${
          evidence.length

            ? evidence
                .map(
                  (e) => `

                    <div class="oi-evidence">

                      <strong>
                        ${escapeHTML(
                          e.title ||
                          "Untitled evidence"
                        )}
                      </strong>

                      <div>
                        ${escapeHTML(
                          e.summary ||
                          ""
                        )}
                      </div>

                      <div class="oi-muted">

                        ${escapeHTML(
                          e.evidenceLevel
                        )}

                        —

                        ${escapeHTML(
                          e.observedAt ||
                          "UNKNOWN"
                        )}

                      </div>

                      <div class="oi-link">

                        ${escapeHTML(
                          e.sourceUrl ||
                          e.sourceName ||
                          "Source UNKNOWN"
                        )}

                      </div>

                    </div>

                  `
                )
                .join("")

            : `
              <div class="oi-muted">
                No evidence recorded.
              </div>
            `
        }

      </div>


    </div>
  `;


  const saveOutcomeBtn =
    document.getElementById(
      "saveOutcomeBtn"
    );

  if (saveOutcomeBtn) {

    saveOutcomeBtn.onclick =
      async () => {

        await updateOpportunityOutcome(
          item.id
        );
      };
  }


  const saveDmVerificationBtn =
    document.getElementById(
      "saveDmVerificationBtn"
    );

  if (saveDmVerificationBtn) {

    saveDmVerificationBtn.onclick =
      async () => {

        await updateDecisionMakerVerification(
          item.id
        );
      };
  }


  box.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
