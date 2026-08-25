import {
  onRequestPost as sendOneRecipient
} from "./send-prepared-campaign.js";


const API_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};


const DEFAULT_BATCH_LIMIT = 5;
const MAX_BATCH_LIMIT = 10;
const SEND_DELAY_MS = 700;
const LOCK_TTL_SECONDS = 60;


function jsonResponse(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: API_HEADERS
    }
  );

}


async function checkSession(
  request,
  env
) {

  const authorization =
    request.headers.get(
      "Authorization"
    );


  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
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


function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );

}


function normalizeLimit(value) {

  const parsed =
    Number.parseInt(
      String(value || ""),
      10
    );


  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return DEFAULT_BATCH_LIMIT;
  }


  return Math.min(
    parsed,
    MAX_BATCH_LIMIT
  );

}


async function acquireBatchLock(
  env,
  campaignId
) {

  const lockKey =
    `campaign_batch_lock:${campaignId}`;


  const existingLock =
    await env.LEADS_KV.get(
      lockKey,
      {
        type: "json"
      }
    );


  if (existingLock) {

    return {
      success: false,
      lockKey,
      token: null
    };

  }


  const token =
    crypto.randomUUID();


  const lockData = {
    token,
    campaignId,
    createdAt:
      new Date().toISOString()
  };


  await env.LEADS_KV.put(
    lockKey,
    JSON.stringify(lockData),
    {
      expirationTtl:
        LOCK_TTL_SECONDS
    }
  );


  /*
   * KV does not provide a true atomic
   * compare-and-set lock.
   *
   * Re-read immediately so competing
   * runners are much less likely to
   * proceed together.
   *
   * SEND_ONE still provides another
   * safety layer through campaign state
   * and Resend Idempotency-Key.
   */

  const confirmedLock =
    await env.LEADS_KV.get(
      lockKey,
      {
        type: "json"
      }
    );


  if (
    !confirmedLock ||
    confirmedLock.token !== token
  ) {

    return {
      success: false,
      lockKey,
      token: null
    };

  }


  return {
    success: true,
    lockKey,
    token
  };

}


async function releaseBatchLock(
  env,
  lockKey,
  token
) {

  if (
    !lockKey ||
    !token
  ) {
    return;
  }


  try {

    const currentLock =
      await env.LEADS_KV.get(
        lockKey,
        {
          type: "json"
        }
      );


    if (
      currentLock &&
      currentLock.token === token
    ) {

      await env.LEADS_KV.delete(
        lockKey
      );

    }

  }
  catch (error) {

    console.error(
      "Batch lock release error:",
      error
    );

  }

}


async function callSendOne(
  context,
  campaignId,
  authorization
) {

  const internalRequest =
    new Request(
      context.request.url,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            authorization
        },

        body:
          JSON.stringify({
            campaignId,
            confirm: "SEND_ONE"
          })
      }
    );


  const internalContext = {
    ...context,
    request: internalRequest
  };


  return await sendOneRecipient(
    internalContext
  );

}



// =======================
// RUN SAFE CAMPAIGN BATCH
// =======================

export async function onRequestPost(
  context
) {

  const {
    request,
    env
  } = context;


  /*
   * -----------------------
   * ADMIN AUTH
   * -----------------------
   */

  if (
    !(await checkSession(
      request,
      env
    ))
  ) {

    return jsonResponse(
      {
        success: false,
        error: "Unauthorized"
      },
      401
    );

  }


  /*
   * -----------------------
   * REQUIRED ENVIRONMENT
   * -----------------------
   */

  if (
    !env.LEADS_KV ||
    !env.RESEND_API_KEY ||
    !env.UNSUBSCRIBE_SECRET ||
    !env.SUPPRESSIONS_DB
  ) {

    return jsonResponse(
      {
        success: false,
        error:
          "Campaign configuration missing"
      },
      500
    );

  }


  let body;


  try {

    body =
      await request.json();

  }
  catch {

    return jsonResponse(
      {
        success: false,
        error:
          "Invalid JSON body"
      },
      400
    );

  }


  const campaignId =
    String(
      body.campaignId || ""
    ).trim();


  const confirm =
    String(
      body.confirm || ""
    ).trim();


  const limit =
    normalizeLimit(
      body.limit
    );


  /*
   * -----------------------
   * VALIDATE REQUEST
   * -----------------------
   */

  if (!campaignId) {

    return jsonResponse(
      {
        success: false,
        error:
          "Missing campaignId"
      },
      400
    );

  }


  if (
    confirm !== "RUN_BATCH"
  ) {

    return jsonResponse(
      {
        success: false,
        error:
          "Explicit batch confirmation required"
      },
      400
    );

  }


  /*
   * -----------------------
   * LOAD CAMPAIGN
   * -----------------------
   */

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
        error:
          "Campaign not found"
      },
      404
    );

  }


  /*
   * -----------------------
   * LOAD QUEUE
   * -----------------------
   */

  const queueId =
    await env.LEADS_KV.get(
      `campaign_queue:${campaignId}`
    );


  if (!queueId) {

    return jsonResponse(
      {
        success: false,
        error:
          "Campaign queue not found"
      },
      404
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
        error:
          "Queue not found"
      },
      404
    );

  }


  /*
   * -----------------------
   * LOAD PREPARED SNAPSHOT
   * -----------------------
   */

  const prepared =
    await env.LEADS_KV.get(
      `campaign_prepared:${campaignId}`,
      {
        type: "json"
      }
    );


  if (
    !prepared ||
    !Array.isArray(
      prepared.recipients
    )
  ) {

    return jsonResponse(
      {
        success: false,
        error:
          "Campaign is not prepared"
      },
      400
    );

  }


  if (
    prepared.queueId !== queueId
  ) {

    return jsonResponse(
      {
        success: false,
        error:
          "Prepared campaign does not match queue"
      },
      409
    );

  }


  /*
   * -----------------------
   * ALREADY COMPLETE
   * -----------------------
   */

  if (
    campaign.status === "Sent" ||
    queue.status === "Sent"
  ) {

    return jsonResponse({
      success: true,

      campaignId,
      queueId,

      completed: true,

      processed: 0,
      sent: 0,
      suppressed: 0,

      remaining: 0,

      campaignStatus:
        "Sent",

      message:
        "Campaign already completed"
    });

  }


  /*
   * -----------------------
   * ACQUIRE RUNNER LOCK
   * -----------------------
   */

  const lock =
    await acquireBatchLock(
      env,
      campaignId
    );


  if (!lock.success) {

    return jsonResponse(
      {
        success: false,
        error:
          "Campaign batch is already running"
      },
      409
    );

  }


  const authorization =
    request.headers.get(
      "Authorization"
    );


  const results = [];


  let processed = 0;
  let sent = 0;
  let suppressed = 0;

  let remaining = null;

  let completed = false;

  let stopped = false;

  let stopReason = null;


  /*
   * -----------------------
   * PROCESS BATCH
   * -----------------------
   */

  try {

    for (
      let i = 0;
      i < limit;
      i++
    ) {

      let sendResponse;


      try {

        sendResponse =
          await callSendOne(
            context,
            campaignId,
            authorization
          );

      }
      catch (error) {

        console.error(
          "Batch SEND_ONE call error:",
          error
        );


        stopped = true;

        stopReason =
          "SEND_ONE execution failed";


        break;

      }


      let sendData;


      try {

        sendData =
          await sendResponse.json();

      }
      catch {

        sendData = {
          success: false,
          error:
            "Invalid SEND_ONE response"
        };

      }


      /*
       * -----------------------
       * HANDLE NON-2XX
       * -----------------------
       */

      if (!sendResponse.ok) {

        /*
         * A completed campaign may have
         * been closed by another safe
         * execution before this iteration.
         */

        if (
          sendResponse.status === 409 &&
          sendData.error ===
            "Campaign already sent"
        ) {

          completed = true;
          remaining = 0;

          break;

        }


        results.push({
          iteration:
            i + 1,

          success:
            false,

          status:
            sendResponse.status,

          error:
            sendData.error ||
            "SEND_ONE failed"
        });


        stopped = true;

        stopReason =
          sendData.error ||
          "SEND_ONE failed";


        break;

      }


      /*
       * -----------------------
       * SUCCESSFUL PROCESSING
       * -----------------------
       */

      processed++;


      if (sendData.sent) {
        sent++;
      }


      if (
        sendData.suppressed
      ) {
        suppressed++;
      }


      if (
        Number.isFinite(
          Number(
            sendData.remaining
          )
        )
      ) {

        remaining =
          Number(
            sendData.remaining
          );

      }


      results.push({
        iteration:
          i + 1,

        success:
          true,

        sent:
          !!sendData.sent,

        suppressed:
          !!sendData.suppressed,

        completed:
          !!sendData.completed,

        leadId:
          sendData.leadId ||
          null,

        email:
          sendData.email ||
          null,

        resendId:
          sendData.resendId ||
          null,

        remaining,

        campaignStatus:
          sendData.campaignStatus ||
          null
      });


      /*
       * -----------------------
       * CAMPAIGN COMPLETE
       * -----------------------
       */

      if (
        sendData.completed ||
        sendData.campaignStatus ===
          "Sent" ||
        remaining === 0
      ) {

        completed = true;
        remaining = 0;

        break;

      }


      /*
       * -----------------------
       * RATE CONTROL
       * -----------------------
       */

      if (
        i < limit - 1
      ) {

        await sleep(
          SEND_DELAY_MS
        );

      }

    }

  }
  finally {

    await releaseBatchLock(
      env,
      lock.lockKey,
      lock.token
    );

  }


  /*
   * -----------------------
   * LOAD FINAL QUEUE STATE
   * -----------------------
   */

  const finalQueue =
    await env.LEADS_KV.get(
      `email_queue:${queueId}`,
      {
        type: "json"
      }
    );


  const finalCampaign =
    await env.LEADS_KV.get(
      `campaign:${campaignId}`,
      {
        type: "json"
      }
    );


  if (
    finalCampaign &&
    finalCampaign.status === "Sent"
  ) {
    completed = true;
  }


  if (
    finalQueue &&
    finalQueue.status === "Sent"
  ) {
    completed = true;
  }


  if (
    finalQueue &&
    Number.isFinite(
      Number(
        finalQueue.pending
      )
    ) &&
    Number.isFinite(
      Number(
        finalQueue.failed
      )
    )
  ) {

    const unresolved =
      Number(
        finalQueue.pending || 0
      ) +
      Number(
        finalQueue.failed || 0
      ) +
      Number(
        finalQueue.sending || 0
      );


    if (
      remaining === null
    ) {
      remaining = unresolved;
    }

  }


  /*
   * -----------------------
   * RESPONSE
   * -----------------------
   */

  return jsonResponse({

    success:
      !stopped,

    campaignId,

    queueId,

    batchLimit:
      limit,

    delayMs:
      SEND_DELAY_MS,

    processed,

    sent,

    suppressed,

    remaining,

    completed,

    stopped,

    stopReason,

    campaignStatus:
      finalCampaign
        ? finalCampaign.status
        : null,

    queueStatus:
      finalQueue
        ? finalQueue.status
        : null,

    queueStats:
      finalQueue
        ? {
            total:
              Number(
                finalQueue.total || 0
              ),

            sent:
              Number(
                finalQueue.sent || 0
              ),

            failed:
              Number(
                finalQueue.failed || 0
              ),

            suppressed:
              Number(
                finalQueue.suppressed || 0
              ),

            skipped:
              Number(
                finalQueue.skipped || 0
              ),

            pending:
              Number(
                finalQueue.pending || 0
              ),

            sending:
              Number(
                finalQueue.sending || 0
              ),

            delivered:
              Number(
                finalQueue.delivered || 0
              ),

            bounced:
              Number(
                finalQueue.bounced || 0
              ),

            complained:
              Number(
                finalQueue.complained || 0
              )
          }
        : null,

    results

  });

}
