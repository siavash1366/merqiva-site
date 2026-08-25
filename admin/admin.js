const LOGIN_URL =
  "/api/login";

const API_URL =
  "/api/admin/leads";

const HISTORY_URL =
  "/api/admin/history";

const CAMPAIGN_URL =
  "/api/admin/campaigns";

const SEND_CAMPAIGN_URL =
  "/api/admin/send-campaign";

const PREPARE_CAMPAIGN_URL =
  "/api/admin/prepare-campaign";

const RUN_BATCH_URL =
  "/api/admin/run-campaign-batch";


let adminSession =
  localStorage.getItem(
    "admin_session"
  );


let currentPage = 1;
let currentLead = null;
let currentSearch = "";
let currentStatus = "";



// =====================
// HELPERS
// =====================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


async function authorizedFetch(
  url,
  options = {}
) {

  const headers =
    new Headers(
      options.headers || {}
    );


  headers.set(
    "Authorization",
    "Bearer " + adminSession
  );


  const response =
    await fetch(
      url,
      {
        ...options,
        headers
      }
    );


  if (
    response.status === 401
  ) {

    logout();

    throw new Error(
      "Unauthorized"
    );

  }


  return response;

}



// =====================
// INIT EVENTS
// =====================

document
  .getElementById(
    "loginBtn"
  )
  ?.addEventListener(
    "click",
    login
  );


document
  .getElementById(
    "refreshBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      currentPage = 1;

      loadLeads();
      loadCampaigns();

    }
  );


document
  .getElementById(
    "logoutBtn"
  )
  ?.addEventListener(
    "click",
    logout
  );


document
  .getElementById(
    "searchBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      currentSearch =
        document
          .getElementById(
            "searchInput"
          )
          .value
          .trim();


      currentStatus =
        document
          .getElementById(
            "statusFilter"
          )
          .value;


      currentPage = 1;

      loadLeads();

    }
  );


document
  .getElementById(
    "createCampaignBtn"
  )
  ?.addEventListener(
    "click",
    createCampaign
  );


document
  .getElementById(
    "prevPage"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        currentPage > 1
      ) {

        currentPage--;

        loadLeads();

      }

    }
  );


document
  .getElementById(
    "nextPage"
  )
  ?.addEventListener(
    "click",
    () => {

      currentPage++;

      loadLeads();

    }
  );


document
  .getElementById(
    "closeDetails"
  )
  ?.addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "leadDetails"
        )
        ?.classList
        .add(
          "hidden"
        );

    }
  );


document
  .getElementById(
    "replyBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        currentLead?.email
      ) {

        window.location.href =
          `mailto:${currentLead.email}`;

      }

    }
  );


document
  .getElementById(
    "copyEmailBtn"
  )
  ?.addEventListener(
    "click",
    async () => {

      if (
        currentLead?.email
      ) {

        await navigator
          .clipboard
          .writeText(
            currentLead.email
          );


        showToast(
          "Email copied"
        );

      }

    }
  );


document
  .getElementById(
    "saveNoteBtn"
  )
  ?.addEventListener(
    "click",
    saveNote
  );


if (
  adminSession
) {

  showPanel();

}



// =====================
// LOGIN
// =====================

async function login() {

  const token =
    document
      .getElementById(
        "token"
      )
      .value
      .trim();


  if (!token) {
    return;
  }


  try {

    const response =
      await fetch(
        LOGIN_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              token
            })
        }
      );


    const data =
      await response.json();


    if (
      data.success
    ) {

      adminSession =
        data.session;


      localStorage.setItem(
        "admin_session",
        data.session
      );


      showPanel();

      return;

    }


    document
      .getElementById(
        "loginError"
      )
      .innerText =
        "Invalid token";

  }
  catch (error) {

    console.error(
      "Login error:",
      error
    );


    document
      .getElementById(
        "loginError"
      )
      .innerText =
        "Login failed";

  }

}



// =====================
// PANEL
// =====================

function showPanel() {

  document
    .getElementById(
      "loginBox"
    )
    ?.classList
    .add(
      "hidden"
    );


  document
    .getElementById(
      "panel"
    )
    ?.classList
    .remove(
      "hidden"
    );


  loadLeads();
  loadCampaigns();

}


function logout() {

  localStorage.removeItem(
    "admin_session"
  );


  adminSession = null;


  location.reload();

}



// =====================
// LOAD LEADS
// =====================

async function loadLeads() {

  const params =
    new URLSearchParams({
      page:
        currentPage,

      limit:
        20,

      search:
        currentSearch,

      status:
        currentStatus
    });


  try {

    const response =
      await authorizedFetch(
        `${API_URL}?${params}`
      );


    const data =
      await response.json();


    if (
      !data.success
    ) {

      showToast(
        data.error ||
        "Failed to load leads"
      );

      return;

    }


    const tbody =
      document.getElementById(
        "leadTable"
      );


    if (!tbody) {
      return;
    }


    tbody.innerHTML = "";


    data.leads.forEach(
      lead => {

        const row =
          document.createElement(
            "tr"
          );


        row.innerHTML = `

<td>
${escapeHTML(lead.id)}
</td>

<td>
${escapeHTML(lead.name)}
</td>

<td>
${escapeHTML(lead.email)}
</td>

<td>
${escapeHTML(lead.company)}
</td>

<td>
${escapeHTML(lead.country)}
</td>

<td>
${escapeHTML(lead.offering)}
</td>

<td>

<select
class="statusSelect"
data-id="${escapeHTML(lead.id)}"
>

${statusOptions(
  lead.status
)}

</select>

</td>

<td>

<button
class="saveBtn"
>
Save
</button>

<button
class="viewBtn"
>
View
</button>

</td>

`;


        row
          .querySelector(
            ".saveBtn"
          )
          ?.addEventListener(
            "click",
            () =>
              updateStatus(
                lead.id
              )
          );


        row
          .querySelector(
            ".viewBtn"
          )
          ?.addEventListener(
            "click",
            () =>
              viewLead(
                lead
              )
          );


        tbody.appendChild(
          row
        );

      }
    );


    const pageInfo =
      document.getElementById(
        "pageInfo"
      );


    if (
      pageInfo
    ) {

      pageInfo.innerText =
        `Page ${
          data.page
        } / ${
          data.pages || 1
        }`;

    }

  }
  catch (error) {

    console.error(
      "Load leads error:",
      error
    );

  }

}



// =====================
// STATUS OPTIONS
// =====================

function statusOptions(
  current
) {

  const statuses = [
    "New",
    "Reviewed",
    "Contacted",
    "Qualified",
    "Proposal Sent",
    "Won",
    "Lost"
  ];


  return statuses
    .map(
      status => `

<option
value="${escapeHTML(status)}"
${
  current === status
    ? "selected"
    : ""
}
>
${escapeHTML(status)}
</option>

`
    )
    .join("");

}



// =====================
// UPDATE LEAD STATUS
// =====================

async function updateStatus(
  id
) {

  const select =
    document.querySelector(
      `.statusSelect[data-id="${id}"]`
    );


  if (!select) {
    return;
  }


  const status =
    select.value;


  try {

    const response =
      await authorizedFetch(
        API_URL,
        {
          method:
            "PATCH",

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


    const data =
      await response.json();


    if (
      data.success
    ) {

      showToast(
        "Status updated"
      );


      loadLeads();

      return;

    }


    showToast(
      data.error ||
      "Update failed"
    );

  }
  catch (error) {

    console.error(
      "Update status error:",
      error
    );


    showToast(
      "Update request failed"
    );

  }

}



// =====================
// VIEW LEAD
// =====================

function viewLead(
  lead
) {

  currentLead =
    lead;


  const box =
    document.getElementById(
      "leadDetails"
    );


  const content =
    document.getElementById(
      "detailsContent"
    );


  if (
    !box ||
    !content
  ) {
    return;
  }


  content.innerHTML = `

<p>
<b>ID:</b>
${escapeHTML(lead.id)}
</p>

<p>
<b>Name:</b>
${escapeHTML(lead.name)}
</p>

<p>
<b>Email:</b>
${escapeHTML(lead.email)}
</p>

<p>
<b>Company:</b>
${escapeHTML(lead.company)}
</p>

<p>
<b>Country:</b>
${escapeHTML(lead.country)}
</p>

<p>
<b>Market:</b>
${escapeHTML(lead.market)}
</p>

<p>
<b>Offering:</b>
${escapeHTML(lead.offering)}
</p>

<p>
<b>Status:</b>
${escapeHTML(lead.status)}
</p>

<p>
<b>Created:</b>
${escapeHTML(lead.createdAt)}
</p>

<p>
<b>Message:</b>
</p>

<p>
${escapeHTML(lead.message)}
</p>

<div id="historyContent">
Loading history...
</div>

`;


  box
    .classList
    .remove(
      "hidden"
    );


  loadHistory(
    lead.id
  );


  loadNotes(
    lead
  );

}



// =====================
// HISTORY
// =====================

async function loadHistory(
  id
) {

  const box =
    document.getElementById(
      "historyContent"
    );


  if (!box) {
    return;
  }


  try {

    const response =
      await authorizedFetch(
        `${HISTORY_URL}?id=${
          encodeURIComponent(id)
        }`
      );


    const data =
      await response.json();


    if (
      !data.success ||
      !data.history?.length
    ) {

      box.innerHTML =
        "No activity yet";

      return;

    }


    box.innerHTML =
      [...data.history]
        .reverse()
        .map(
          item => `

<div class="history-item">

<div class="history-title">
${escapeHTML(item.action)}
</div>

<div class="history-change">
${escapeHTML(item.from)}
↓
${escapeHTML(item.to)}
</div>

<div class="history-date">
${
  item.date
    ? new Date(
        item.date
      ).toLocaleString()
    : ""
}
</div>

${
  item.note
    ? `
<div>
Note:
${escapeHTML(item.note)}
</div>
`
    : ""
}

</div>

`
        )
        .join("");

  }
  catch (error) {

    console.error(
      "History error:",
      error
    );


    box.innerHTML =
      "Failed to load history";

  }

}



// =====================
// INTERNAL NOTES
// =====================

async function saveNote() {

  if (
    !currentLead
  ) {
    return;
  }


  const input =
    document.getElementById(
      "noteInput"
    );


  if (!input) {
    return;
  }


  const note =
    input.value.trim();


  if (!note) {
    return;
  }


  try {

    const response =
      await authorizedFetch(
        API_URL,
        {
          method:
            "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              id:
                currentLead.id,

              note
            })
        }
      );


    const data =
      await response.json();


    if (
      data.success
    ) {

      showToast(
        "Note saved"
      );


      input.value = "";


      currentLead =
        data.lead;


      loadNotes(
        currentLead
      );

      return;

    }


    showToast(
      data.error ||
      "Note failed"
    );

  }
  catch (error) {

    console.error(
      "Save note error:",
      error
    );


    showToast(
      "Note request failed"
    );

  }

}


function loadNotes(
  lead
) {

  const box =
    document.getElementById(
      "notesList"
    );


  if (!box) {
    return;
  }


  if (
    !lead.notes ||
    !lead.notes.length
  ) {

    box.innerHTML =
      "No notes";

    return;

  }


  box.innerHTML =
    lead.notes
      .map(
        note => `

<div class="note-item">

<div>
${escapeHTML(note.text)}
</div>

<div class="note-date">
${
  note.date
    ? new Date(
        note.date
      ).toLocaleString()
    : ""
}
</div>

</div>

`
      )
      .join("");

}



// =====================
// CAMPAIGNS
// =====================

async function loadCampaigns() {

  const table =
    document.getElementById(
      "campaignTable"
    );


  if (!table) {
    return;
  }


  try {

    const response =
      await authorizedFetch(
        CAMPAIGN_URL
      );


    const data =
      await response.json();


    if (
      !data.success
    ) {

      showToast(
        data.error ||
        "Failed to load campaigns"
      );

      return;

    }


    table.innerHTML = "";


    for (
      const campaign of
      data.campaigns
    ) {

      const row =
        createCampaignRow(
          campaign
        );


      table.appendChild(
        row
      );


      if (
        campaign.status !==
        "Draft"
      ) {

        hydrateCampaignRow(
          campaign,
          row
        );

      }

    }

  }
  catch (error) {

    console.error(
      "Load campaigns error:",
      error
    );


    showToast(
      "Campaign load failed"
    );

  }

}



// =====================
// CREATE CAMPAIGN ROW
// =====================

function createCampaignRow(
  campaign
) {

  const row =
    document.createElement(
      "tr"
    );


  row.dataset.campaignId =
    campaign.id;


  const isDraft =
    campaign.status ===
    "Draft";


  row.innerHTML = `

<td>
${escapeHTML(campaign.id)}
</td>

<td>
${escapeHTML(campaign.name)}
</td>

<td>
${escapeHTML(campaign.subject)}
</td>

<td
class="campaignStatusCell"
>

<div>
<strong>
${escapeHTML(campaign.status)}
</strong>
</div>

${
  isDraft
    ? `
<div>
Not queued
</div>
`
    : `
<div>
Loading campaign state...
</div>
`
}

</td>

<td
class="campaignActionCell"
>

${
  isDraft
    ? `

<button
class="audienceBtn"
data-id="${escapeHTML(campaign.id)}"
>
Audience
</button>

<button
class="queueCampaignBtn"
data-id="${escapeHTML(campaign.id)}"
>
Queue Campaign
</button>

<button
class="deleteCampaignBtn"
data-id="${escapeHTML(campaign.id)}"
>
Delete
</button>

`
    : `

<button
disabled
>
Audience Locked
</button>

<button
class="prepareCampaignBtn"
data-id="${escapeHTML(campaign.id)}"
disabled
>
Prepare
</button>

<button
class="runBatchBtn"
data-id="${escapeHTML(campaign.id)}"
disabled
>
Run Batch (5)
</button>

<button
class="refreshCampaignBtn"
data-id="${escapeHTML(campaign.id)}"
>
Refresh
</button>

`
}

</td>

`;


  if (
    isDraft
  ) {

    row
      .querySelector(
        ".audienceBtn"
      )
      ?.addEventListener(
        "click",
        () =>
          openAudience(
            campaign.id
          )
      );


    row
      .querySelector(
        ".queueCampaignBtn"
      )
      ?.addEventListener(
        "click",
        () =>
          queueCampaign(
            campaign.id
          )
      );


    row
      .querySelector(
        ".deleteCampaignBtn"
      )
      ?.addEventListener(
        "click",
        () =>
          deleteCampaign(
            campaign.id
          )
      );

  }
  else {

    row
      .querySelector(
        ".prepareCampaignBtn"
      )
      ?.addEventListener(
        "click",
        () =>
          prepareCampaign(
            campaign.id
          )
      );


    row
      .querySelector(
        ".runBatchBtn"
      )
      ?.addEventListener(
        "click",
        () =>
          runCampaignBatch(
            campaign.id
          )
      );


    row
      .querySelector(
        ".refreshCampaignBtn"
      )
      ?.addEventListener(
        "click",
        () =>
          loadCampaigns()
      );

  }


  return row;

}



// =====================
// HYDRATE CAMPAIGN STATE
// =====================

async function hydrateCampaignRow(
  campaign,
  row
) {

  const statusCell =
    row.querySelector(
      ".campaignStatusCell"
    );


  const prepareBtn =
    row.querySelector(
      ".prepareCampaignBtn"
    );


  const runBatchBtn =
    row.querySelector(
      ".runBatchBtn"
    );


  try {

    const [
      queueState,
      preparedState
    ] =
      await Promise.all([
        getCampaignQueueState(
          campaign.id
        ),

        getPreparedState(
          campaign.id
        )
      ]);


    const queue =
      queueState?.queue ||
      null;


    const prepared =
      !!preparedState
        ?.prepared;


    if (
      statusCell
    ) {

      statusCell.innerHTML =
        buildCampaignStatusHTML(
          campaign,
          queue,
          prepared
        );

    }


    if (
      !queue
    ) {

      if (
        prepareBtn
      ) {

        prepareBtn.disabled =
          true;

      }


      if (
        runBatchBtn
      ) {

        runBatchBtn.disabled =
          true;

      }


      return;

    }


    const completed =
      campaign.status ===
        "Sent" ||
      queue.status ===
        "Sent";


    const sending =
      campaign.status ===
        "Sending" ||
      queue.status ===
        "Sending";


    const alreadyProcessed =
      Number(
        queue.sent || 0
      ) > 0 ||
      Number(
        queue.suppressed || 0
      ) > 0 ||
      Number(
        queue.skipped || 0
      ) > 0;


    if (
      prepareBtn
    ) {

      prepareBtn.disabled =
        completed ||
        sending ||
        prepared ||
        alreadyProcessed;


      if (
        completed
      ) {

        prepareBtn.innerText =
          "Completed";

      }
      else if (
        prepared
      ) {

        prepareBtn.innerText =
          "Prepared";

      }
      else {

        prepareBtn.innerText =
          "Prepare";

      }

    }


    if (
      runBatchBtn
    ) {

      runBatchBtn.disabled =
        completed ||
        sending ||
        !prepared;


      if (
        completed
      ) {

        runBatchBtn.innerText =
          "Completed";

      }
      else if (
        sending
      ) {

        runBatchBtn.innerText =
          "Sending...";

      }
      else {

        runBatchBtn.innerText =
          "Run Batch (5)";

      }

    }

  }
  catch (error) {

    console.error(
      "Campaign state error:",
      campaign.id,
      error
    );


    if (
      statusCell
    ) {

      statusCell.innerHTML = `

<div>
<strong>
${escapeHTML(campaign.status)}
</strong>
</div>

<div>
State unavailable
</div>

`;

    }

  }

}



// =====================
// CAMPAIGN STATUS HTML
// =====================
function buildCampaignStatusHTML(
  campaign,
  queue,
  prepared
) {

  if (!queue) {

    return `

<div class="campaign-status-head">

<span class="campaign-status-badge">
${escapeHTML(campaign.status)}
</span>

</div>

<div class="campaign-state-message">
Queue unavailable
</div>

`;

  }


  const total =
    Number(queue.total || 0);

  const valid =
    Number(
      queue.validRecipients || 0
    );

  const sent =
    Number(queue.sent || 0);

  const delivered =
    Number(queue.delivered || 0);

  const pending =
    Number(queue.pending || 0);

  const sending =
    Number(queue.sending || 0);

  const suppressed =
    Number(queue.suppressed || 0);

  const skipped =
    Number(queue.skipped || 0);

  const failed =
    Number(queue.failed || 0);

  const bounced =
    Number(queue.bounced || 0);

  const complained =
    Number(queue.complained || 0);


  const status =
    String(
      queue.status ||
      campaign.status ||
      "Unknown"
    );


  const statusKey =
    status
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      );


  return `

<div class="campaign-status-head">

<span
class="
campaign-status-badge
campaign-status-${statusKey}
"
>
${escapeHTML(status)}
</span>


<span
class="
campaign-prepared-badge
${prepared
  ? "is-prepared"
  : "not-prepared"}
"
>
${prepared
  ? "Prepared"
  : "Not Prepared"}
</span>

</div>


<div class="campaign-metrics">

<div class="campaign-metric">
<span>Total</span>
<strong>${total}</strong>
</div>


<div class="campaign-metric">
<span>Valid</span>
<strong>${valid}</strong>
</div>


<div class="campaign-metric">
<span>Sent</span>
<strong>${sent}</strong>
</div>


<div class="campaign-metric">
<span>Delivered</span>
<strong>${delivered}</strong>
</div>


<div class="campaign-metric">
<span>Pending</span>
<strong>${pending}</strong>
</div>


<div class="campaign-metric">
<span>Sending</span>
<strong>${sending}</strong>
</div>


<div class="campaign-metric">
<span>Suppressed</span>
<strong>${suppressed}</strong>
</div>


<div class="campaign-metric">
<span>Skipped</span>
<strong>${skipped}</strong>
</div>


<div class="campaign-metric">
<span>Failed</span>
<strong>${failed}</strong>
</div>


<div class="campaign-metric">
<span>Bounced</span>
<strong>${bounced}</strong>
</div>


<div class="
campaign-metric
campaign-metric-wide
">
<span>Complaints</span>
<strong>${complained}</strong>
</div>

</div>

`;

}




// =====================
// GET QUEUE STATE
// =====================

async function getCampaignQueueState(
  campaignId
) {

  const response =
    await authorizedFetch(
      `${SEND_CAMPAIGN_URL}?campaignId=${
        encodeURIComponent(
          campaignId
        )
      }`
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.success
  ) {

    throw new Error(
      data.error ||
      "Queue state failed"
    );

  }


  return data;

}



// =====================
// GET PREPARED STATE
// =====================

async function getPreparedState(
  campaignId
) {

  const response =
    await authorizedFetch(
      `${PREPARE_CAMPAIGN_URL}?campaignId=${
        encodeURIComponent(
          campaignId
        )
      }`
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.success
  ) {

    return {
      success:
        false,

      prepared:
        false,

      data:
        null
    };

  }


  return data;

}



// =====================
// CREATE CAMPAIGN
// =====================

async function createCampaign() {

  const name =
    document
      .getElementById(
        "campaignName"
      )
      .value
      .trim();


  const subject =
    document
      .getElementById(
        "campaignSubject"
      )
      .value
      .trim();


  const body =
    document
      .getElementById(
        "campaignBody"
      )
      .value
      .trim();


  if (
    !name ||
    !subject ||
    !body
  ) {

    showToast(
      "Fill all fields"
    );

    return;

  }


  try {

    const response =
      await authorizedFetch(
        CAMPAIGN_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              name,
              subject,
              body
            })
        }
      );


    const data =
      await response.json();


    if (
      data.success
    ) {

      showToast(
        "Campaign created"
      );


      document
        .getElementById(
          "campaignName"
        )
        .value = "";


      document
        .getElementById(
          "campaignSubject"
        )
        .value = "";


      document
        .getElementById(
          "campaignBody"
        )
        .value = "";


      loadCampaigns();

      return;

    }


    showToast(
      data.error ||
      "Campaign failed"
    );

  }
  catch (error) {

    console.error(
      "Create campaign error:",
      error
    );


    showToast(
      "Campaign request failed"
    );

  }

}



// =====================
// QUEUE CAMPAIGN
// =====================

async function queueCampaign(
  id
) {

  const button =
    document.querySelector(
      `.queueCampaignBtn[data-id="${id}"]`
    );


  if (
    button
  ) {

    button.disabled =
      true;


    button.innerText =
      "Queuing...";

  }


  try {

    const response =
      await authorizedFetch(
        SEND_CAMPAIGN_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              campaignId:
                id
            })
        }
      );


    const data =
      await response.json();


    if (
      data.success
    ) {

      showToast(
        `Campaign queued (${
          data.recipients
        } recipients)`
      );

    }
    else {

      showToast(
        data.error ||
        "Queue failed"
      );

    }


    await loadCampaigns();

  }
  catch (error) {

    console.error(
      "Queue campaign error:",
      error
    );


    showToast(
      "Queue request failed"
    );


    await loadCampaigns();

  }

}



// =====================
// PREPARE CAMPAIGN
// =====================

async function prepareCampaign(
  id
) {

  const button =
    document.querySelector(
      `.prepareCampaignBtn[data-id="${id}"]`
    );


  if (
    button
  ) {

    button.disabled =
      true;


    button.innerText =
      "Preparing...";

  }


  try {

    const response =
      await authorizedFetch(
        PREPARE_CAMPAIGN_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              campaignId:
                id
            })
        }
      );


    const data =
      await response.json();


    if (
      data.success &&
      data.prepared
    ) {

      showToast(
        `Prepared: ${
          data.validRecipients || 0
        } valid, ${
          data.suppressedRecipients || 0
        } suppressed, ${
          data.skippedRecipients || 0
        } skipped`
      );

    }
    else {

      showToast(
        data.error ||
        data.message ||
        "Prepare failed"
      );

    }


    await loadCampaigns();

  }
  catch (error) {

    console.error(
      "Prepare campaign error:",
      error
    );


    showToast(
      "Prepare request failed"
    );


    await loadCampaigns();

  }

}



// =====================
// RUN CAMPAIGN BATCH
// =====================

async function runCampaignBatch(
  id
) {

  const confirmed =
    window.confirm(
      "Run the next campaign batch?\n\nUp to 5 eligible recipients may receive this email."
    );


  if (
    !confirmed
  ) {
    return;
  }


  const button =
    document.querySelector(
      `.runBatchBtn[data-id="${id}"]`
    );


  if (
    button
  ) {

    button.disabled =
      true;


    button.innerText =
      "Running...";

  }


  try {

    const response =
      await authorizedFetch(
        RUN_BATCH_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              campaignId:
                id,

              confirm:
                "RUN_BATCH",

              limit:
                5
            })
        }
      );


    const data =
      await response.json();


    if (
      data.success
    ) {

      if (
        data.completed
      ) {

        showToast(
          `Campaign completed — Sent ${
            data.sent || 0
          }, Suppressed ${
            data.suppressed || 0
          }`
        );

      }
      else {

        showToast(
          `Batch complete — Processed ${
            data.processed || 0
          }, Sent ${
            data.sent || 0
          }, Remaining ${
            data.remaining ?? "?"
          }`
        );

      }

    }
    else {

      showToast(
        data.stopReason ||
        data.error ||
        "Batch failed"
      );

    }


    await loadCampaigns();

  }
  catch (error) {

    console.error(
      "Run batch error:",
      error
    );


    showToast(
      "Batch request failed"
    );


    await loadCampaigns();

  }

}



// =====================
// DELETE CAMPAIGN
// =====================

async function deleteCampaign(
  id
) {

  try {

    const response =
      await authorizedFetch(
        CAMPAIGN_URL,
        {
          method:
            "DELETE",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              id
            })
        }
      );


    const data =
      await response.json();


    if (
      data.success
    ) {

      showToast(
        "Campaign deleted"
      );


      loadCampaigns();

      return;

    }


    showToast(
      data.error ||
      "Delete failed"
    );

  }
  catch (error) {

    console.error(
      "Delete campaign error:",
      error
    );


    showToast(
      "Delete request failed"
    );

  }

}



// =====================
// OPEN AUDIENCE
// =====================

function openAudience(
  id
) {

  window.location.href =
    `/admin/campaign-audience.html?campaign=${
      encodeURIComponent(id)
    }`;

}



// =====================
// TOAST
// =====================

function showToast(
  message
) {

  let toast =
    document.querySelector(
      ".toast"
    );


  if (
    !toast
  ) {

    toast =
      document.createElement(
        "div"
      );


    toast.className =
      "toast";


    document.body.appendChild(
      toast
    );

  }


  toast.innerText =
    message;


  toast.classList.add(
    "show"
  );


  setTimeout(
    () => {

      toast.classList.remove(
        "show"
      );

    },
    3000
  );

}
