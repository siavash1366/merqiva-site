const API_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};


function jsonResponse(data, status = 200) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: API_HEADERS
    }
  );

}

async function checkSession(request, env) {

  const authorization =
    request.headers.get("Authorization");


  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return false;
  }


  const sessionId =
    authorization.substring(7);


  const session =
    await env.ADMIN_SESSIONS_KV.get(
      `session:${sessionId}`
    );


  return !!session;

}


function isValidEmail(email) {

  if (
    !email ||
    typeof email !== "string"
  ) {
    return false;
  }


  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email.trim());

}


function markRecipient(
  recipient,
  status,
  reason = null
) {

  recipient.status = status;


  if (reason) {

    recipient.error = reason;

    recipient.statusReason = reason;

  } else {

    recipient.error = null;

    delete recipient.statusReason;

  }

}


function calculateQueueStats(queue) {

  const recipients =
    queue.recipients || [];


  queue.sent =
    recipients.filter(
      item => item.status === "Sent"
    ).length;


  queue.failed =
    recipients.filter(
      item => item.status === "Failed"
    ).length;


  queue.suppressed =
    recipients.filter(
      item => item.status === "Suppressed"
    ).length;


  queue.skipped =
    recipients.filter(
      item => item.status === "Skipped"
    ).length;


  queue.pending =
    recipients.filter(
      item => item.status === "Pending"
    ).length;

}



// =======================
// GET PREPARED CAMPAIGN
// =======================

export async function onRequestGet(context) {

  const {
    request,
    env
  } = context;


  if (
    !(await checkSession(request, env))
  ) {

    return jsonResponse(
      {
        success: false,
        error: "Unauthorized"
      },
      401
    );

  }


  try {

    const url =
      new URL(request.url);


    const campaignId =
      url.searchParams.get("campaignId");


    if (!campaignId) {

      return jsonResponse(
        {
          success: false,
          error: "Missing campaignId"
        },
        400
      );

    }


    const prepared =
      await env.LEADS_KV.get(
        `campaign_prepared:${campaignId}`,
        {
          type: "json"
        }
      );


    return jsonResponse({
      success: true,
      prepared: !!prepared,
      data: prepared || null
    });

  }
  catch (error) {

    console.error(
      "Prepare GET error:",
      error
    );


    return jsonResponse(
      {
        success: false,
        error:
          "Failed to load prepared campaign"
      },
      500
    );

  }

}



// =======================
// PREPARE CAMPAIGN
// =======================

export async function onRequestPost(context) {

  const {
    request,
    env
  } = context;


  if (
    !(await checkSession(request, env))
  ) {

    return jsonResponse(
      {
        success: false,
        error: "Unauthorized"
      },
      401
    );

  }


  if (!env.SUPPRESSIONS_DB) {

    return jsonResponse(
      {
        success: false,
        error:
          "Suppression database unavailable"
      },
      500
    );

  }


  try {

    const body =
      await request.json();


    const campaignId =
      String(
        body.campaignId || ""
      ).trim();


    if (!campaignId) {

      return jsonResponse(
        {
          success: false,
          error: "Missing campaignId"
        },
        400
      );

    }



    // -----------------------
    // LOAD CAMPAIGN
    // -----------------------

    const campaign =
      await env.LEADS_KV.get(
        `campaign:${campaignId}`,
        {
          type: "json"
        }
      );


    if (!campaign) {

      return jsonResponse(
        {
          success: false,
          error: "Campaign not found"
        },
        404
      );

    }



    // -----------------------
    // LOAD QUEUE
    // -----------------------

    const queueId =
      await env.LEADS_KV.get(
        `campaign_queue:${campaignId}`
      );


    if (!queueId) {

      return jsonResponse(
        {
          success: false,
          error:
            "Campaign is not queued"
        },
        400
      );

    }


    const queue =
      await env.LEADS_KV.get(
        `email_queue:${queueId}`,
        {
          type: "json"
        }
      );


    if (!queue) {

      return jsonResponse(
        {
          success: false,
          error: "Queue not found"
        },
        404
      );

    }



    // -----------------------
    // DO NOT RE-PREPARE
    // WHILE SENDING / SENT
    // -----------------------

    if (
      campaign.status === "Sending" ||
      queue.status === "Sending"
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            "Campaign is currently sending"
        },
        409
      );

    }


    if (
      campaign.status === "Sent" ||
      queue.status === "Sent"
    ) {

      return jsonResponse(
        {
          success: false,
          error:
            "Campaign has already been sent"
        },
        409
      );

    }


    const sendingAlreadyStarted =
      (queue.recipients || [])
      .some(
        recipient =>
          recipient.status === "Sent" ||
          recipient.status === "Sending"
      );


    if (sendingAlreadyStarted) {

      return jsonResponse(
        {
          success: false,
          error:
            "Campaign sending has already started"
        },
        409
      );

    }



    // -----------------------
    // INVALIDATE OLD SNAPSHOT
    // -----------------------

    await env.LEADS_KV.delete(
      `campaign_prepared:${campaignId}`
    );



    // -----------------------
    // RESOLVE RECIPIENTS
    // -----------------------

    const preparedRecipients = [];

    const skippedRecipients = [];

    const seenEmails =
      new Set();


    let suppressedRecipients = 0;



    for (
      const recipient of
      queue.recipients || []
    ) {

      const leadId =
        recipient.leadId;


      if (!leadId) {

        markRecipient(
          recipient,
          "Skipped",
          "Missing lead ID"
        );


        skippedRecipients.push({
          leadId: null,
          reason: "Missing lead ID"
        });


        continue;

      }



      const lead =
        await env.LEADS_KV.get(
          `lead:${leadId}`,
          {
            type: "json"
          }
        );


      if (!lead) {

        markRecipient(
          recipient,
          "Skipped",
          "Lead not found"
        );


        skippedRecipients.push({
          leadId,
          reason: "Lead not found"
        });


        continue;

      }



      const email =
        String(
          lead.email || ""
        )
        .trim()
        .toLowerCase();



      // -----------------------
      // INVALID EMAIL
      // -----------------------

      if (!isValidEmail(email)) {

        markRecipient(
          recipient,
          "Skipped",
          "Invalid email"
        );


        skippedRecipients.push({
          leadId,
          email,
          reason: "Invalid email"
        });


        continue;

      }



      // -----------------------
      // D1 SUPPRESSION CHECK
      // -----------------------

      const suppression =
        await env.SUPPRESSIONS_DB
        .prepare(
          `
          SELECT
            email,
            reason,
            source,
            created_at AS createdAt
          FROM suppressions
          WHERE email = ?
          LIMIT 1
          `
        )
        .bind(email)
        .first();


      if (suppression) {

        suppressedRecipients++;


        const reason =
          `Suppressed: ${
            suppression.reason ||
            "Do Not Send"
          }`;


        markRecipient(
          recipient,
          "Suppressed",
          reason
        );


        skippedRecipients.push({
          leadId,
          email,
          reason
        });


        continue;

      }



      // -----------------------
      // DUPLICATE EMAIL
      // -----------------------

      if (seenEmails.has(email)) {

        markRecipient(
          recipient,
          "Skipped",
          "Duplicate email"
        );


        skippedRecipients.push({
          leadId,
          email,
          reason: "Duplicate email"
        });


        continue;

      }


      seenEmails.add(email);



      // -----------------------
      // VALID RECIPIENT
      // -----------------------

      markRecipient(
        recipient,
        "Pending"
      );


      preparedRecipients.push({
        leadId,

        name:
          lead.name || "",

        email,

        company:
          lead.company || "",

        country:
          lead.country || ""
      });

    }



    const now =
      new Date().toISOString();



    // -----------------------
    // UPDATE QUEUE METADATA
    // -----------------------

    queue.lastPrepareAttemptAt =
      now;


    queue.validRecipients =
      preparedRecipients.length;


    queue.suppressedRecipients =
      suppressedRecipients;


    queue.skippedRecipients =
      skippedRecipients.length;


    queue.preparedAt =
      preparedRecipients.length > 0
        ? now
        : null;


    calculateQueueStats(queue);


    await env.LEADS_KV.put(
      `email_queue:${queueId}`,
      JSON.stringify(queue)
    );



    // -----------------------
    // BLOCK EMPTY CAMPAIGN
    // -----------------------

    if (
      preparedRecipients.length === 0
    ) {

      return jsonResponse(
        {
          success: false,

          error:
            "No valid recipients found",

          campaignId,

          queueId,

          queued:
            queue.recipients?.length || 0,

          validRecipients: 0,

          suppressedRecipients,

          skippedRecipients:
            skippedRecipients.length,

          prepared: false,

          skipped:
            skippedRecipients
        },
        400
      );

    }



    // -----------------------
    // CREATE FRESH SNAPSHOT
    // -----------------------

    const preparedCampaign = {

      campaignId,

      queueId,

      campaignName:
        campaign.name,

      subject:
        campaign.subject,

      body:
        campaign.body,

      preparedAt:
        now,

      totalQueued:
        queue.recipients?.length || 0,

      validRecipients:
        preparedRecipients.length,

      suppressedRecipients,

      skippedRecipients:
        skippedRecipients.length,

      recipients:
        preparedRecipients,

      skipped:
        skippedRecipients

    };



    // -----------------------
    // SAVE FRESH SNAPSHOT
    // -----------------------

    await env.LEADS_KV.put(
      `campaign_prepared:${campaignId}`,
      JSON.stringify(
        preparedCampaign
      )
    );


    return jsonResponse({

      success: true,

      message:
        "Campaign prepared",

      campaignId,

      queueId,

      queued:
        queue.recipients?.length || 0,

      validRecipients:
        preparedRecipients.length,

      suppressedRecipients,

      skippedRecipients:
        skippedRecipients.length,

      prepared: true

    });

  }
  catch (error) {

    console.error(
      "Prepare campaign error:",
      error
    );


    return jsonResponse(
      {
        success: false,
        error:
          "Failed to prepare campaign"
      },
      500
    );

  }

}
