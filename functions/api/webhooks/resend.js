const API_HEADERS = {

  "Content-Type":
    "application/json; charset=UTF-8",

  "Cache-Control":
    "no-store",

  "X-Content-Type-Options":
    "nosniff",

  "X-Frame-Options":
    "DENY"

};



function jsonResponse(
  data,
  status = 200
){

  return new Response(

    JSON.stringify(data),

    {
      status,
      headers:API_HEADERS
    }

  );

}





// =======================
// BASE64 HELPERS
// =======================


function base64ToBytes(value){

  const binary =
    atob(value);


  const bytes =
    new Uint8Array(
      binary.length
    );


  for(
    let i = 0;
    i < binary.length;
    i++
  ){

    bytes[i] =
      binary.charCodeAt(i);

  }


  return bytes;

}





function bytesToBase64(buffer){

  const bytes =
    new Uint8Array(buffer);


  let binary = "";


  for(
    const byte of bytes
  ){

    binary +=
      String.fromCharCode(byte);

  }


  return btoa(binary);

}





function safeEqual(
  first,
  second
){

  const a =
    String(first || "");


  const b =
    String(second || "");


  if(
    a.length !== b.length
  ){

    return false;

  }


  let result = 0;


  for(
    let i = 0;
    i < a.length;
    i++
  ){

    result |=

      a.charCodeAt(i) ^

      b.charCodeAt(i);

  }


  return result === 0;

}






// =======================
// VERIFY RESEND / SVIX
// =======================


async function verifyWebhook(
  request,
  rawBody,
  secret
){

  const webhookId =

    request.headers.get(
      "svix-id"
    )

    ||

    request.headers.get(
      "webhook-id"
    );


  const timestamp =

    request.headers.get(
      "svix-timestamp"
    )

    ||

    request.headers.get(
      "webhook-timestamp"
    );


  const signatureHeader =

    request.headers.get(
      "svix-signature"
    )

    ||

    request.headers.get(
      "webhook-signature"
    );



  if(
    !webhookId ||
    !timestamp ||
    !signatureHeader
  ){

    return {
      success:false,
      error:
        "Missing webhook signature headers"
    };

  }





  // Prevent replay attacks.
  // Svix uses a 5 minute tolerance.

  const timestampNumber =
    Number(timestamp);


  if(
    !Number.isFinite(
      timestampNumber
    )
  ){

    return {
      success:false,
      error:
        "Invalid webhook timestamp"
    };

  }


  const now =
    Math.floor(
      Date.now() / 1000
    );


  if(
    Math.abs(
      now - timestampNumber
    ) > 300
  ){

    return {
      success:false,
      error:
        "Webhook timestamp expired"
    };

  }





  const cleanSecret =
    String(secret || "")
    .startsWith("whsec_")

      ? String(secret)
        .substring(6)

      : String(secret || "");

    

  let secretBytes;


  try{


    secretBytes =
      base64ToBytes(
        cleanSecret
      );


  }
  catch(error){


    console.error(
      "Webhook secret decode error:",
      error
    );


    return {
      success:false,
      error:
        "Invalid webhook secret"
    };


  }





  const signedContent =

    `${webhookId}.${timestamp}.${rawBody}`;


  const key =
    await crypto.subtle.importKey(

      "raw",

      secretBytes,

      {
        name:"HMAC",
        hash:"SHA-256"
      },

      false,

      [
        "sign"
      ]

    );


  const signature =
    await crypto.subtle.sign(

      "HMAC",

      key,

      new TextEncoder()
      .encode(
        signedContent
      )

    );


  const expectedSignature =
    bytesToBase64(
      signature
    );





  const signatures =
    signatureHeader
    .split(/\s+/)
    .filter(Boolean);



  let valid = false;


  for(
    const item of signatures
  ){


    const commaIndex =
      item.indexOf(",");


    if(
      commaIndex === -1
    ){

      continue;

    }


    const version =
      item.slice(
        0,
        commaIndex
      );


    const suppliedSignature =
      item.slice(
        commaIndex + 1
      );


    if(
      version !== "v1"
    ){

      continue;

    }


    if(
      safeEqual(
        suppliedSignature,
        expectedSignature
      )
    ){

      valid = true;

      break;

    }


  }



  if(!valid){

    return {
      success:false,
      error:
        "Invalid webhook signature"
    };

  }



  return {

    success:true,

    webhookId,

    timestamp:
      timestampNumber

  };

}






// =======================
// EMAIL NORMALIZATION
// =======================


function normalizeEmail(value){

  return String(
    value || ""
  )
  .trim()
  .toLowerCase();

}





function getRecipientEmail(data){

  if(
    Array.isArray(data?.to) &&
    data.to.length > 0
  ){

    return normalizeEmail(
      data.to[0]
    );

  }


  return "";

}






// =======================
// D1 SUPPRESSION
// =======================


async function suppressEmail(
  env,
  email,
  reason,
  source
){

  if(
    !email ||
    !env.SUPPRESSIONS_DB
  ){

    return;

  }


  const now =
    new Date()
    .toISOString();



  await env.SUPPRESSIONS_DB
  .prepare(
    `
    INSERT INTO suppressions
    (
      email,
      reason,
      source,
      created_at
    )
    VALUES (?, ?, ?, ?)

    ON CONFLICT(email)
    DO UPDATE SET

      reason =
        excluded.reason,

      source =
        excluded.source,

      created_at =
        excluded.created_at
    `
  )
  .bind(
    email,
    reason,
    source,
    now
  )
  .run();

}






// =======================
// FIND QUEUE RECIPIENT
// =======================


async function findQueueRecipient(
  env,
  emailId
){

  /*
   * Future optimized lookup.
   * We will add this index to the
   * sending engine later.
   */

  const direct =
    await env.LEADS_KV.get(

      `resend_email:${emailId}`,

      {
        type:"json"
      }

    );


  if(
    direct?.queueId
  ){


    const queue =
      await env.LEADS_KV.get(

        `email_queue:${direct.queueId}`,

        {
          type:"json"
        }

      );


    if(queue){


      const recipient =
        (
          queue.recipients || []
        )
        .find(
          item =>
            item.resendId === emailId

            ||

            (
              direct.leadId &&
              item.leadId ===
                direct.leadId
            )
        );


      if(recipient){

        return {

          queue,

          recipient,

          campaignId:
            direct.campaignId ||
            queue.campaignId ||
            null

        };

      }


    }


  }





  /*
   * Compatibility with emails
   * already sent before the
   * reverse index existed.
   */

  const queueIndex =
    JSON.parse(

      await env.LEADS_KV.get(
        "email_queue:index"
      )

      ||

      "[]"

    );



  for(
    const queueId of queueIndex
  ){


    const queue =
      await env.LEADS_KV.get(

        `email_queue:${queueId}`,

        {
          type:"json"
        }

      );


    if(!queue){

      continue;

    }


    const recipient =
      (
        queue.recipients || []
      )
      .find(
        item =>
          item.resendId ===
          emailId
      );


    if(recipient){

      return {

        queue,

        recipient,

        campaignId:
          queue.campaignId ||
          null

      };

    }


  }



  return null;

}






// =======================
// DELIVERY STATS
// =======================


function updateDeliveryStats(
  queue
){

  const recipients =
    queue.recipients || [];


  queue.delivered =

    recipients.filter(
      item =>
        item.deliveryStatus ===
        "Delivered"
    ).length;


  queue.bounced =

    recipients.filter(
      item =>
        item.deliveryStatus ===
        "Bounced"
    ).length;


  queue.complained =

    recipients.filter(
      item =>
        item.deliveryStatus ===
        "Complained"
    ).length;


  queue.deliveryFailed =

    recipients.filter(
      item =>
        item.deliveryStatus ===
        "Failed"
    ).length;


  queue.deliveryDelayed =

    recipients.filter(
      item =>
        item.deliveryStatus ===
        "Delayed"
    ).length;

}






// =======================
// EVENT → DELIVERY STATUS
// =======================


function deliveryStatusFromEvent(
  eventType
){

  switch(eventType){


    case "email.sent":

      return "Sent";


    case "email.delivered":

      return "Delivered";


    case "email.delivery_delayed":

      return "Delayed";


    case "email.bounced":

      return "Bounced";


    case "email.complained":

      return "Complained";


    case "email.failed":

      return "Failed";


    default:

      return null;


  }

}






// =======================
// WEBHOOK POST
// =======================


export async function onRequestPost(
  context
){

  const {
    request,
    env
  } = context;



  if(
    !env.RESEND_WEBHOOK_SECRET
  ){

    console.error(
      "RESEND_WEBHOOK_SECRET missing"
    );


    return jsonResponse(
      {
        success:false,
        error:
          "Webhook configuration missing"
      },
      500
    );

  }



  if(
    !env.LEADS_KV ||
    !env.SUPPRESSIONS_DB
  ){

    console.error(
      "Webhook storage binding missing"
    );


    return jsonResponse(
      {
        success:false,
        error:
          "Webhook storage unavailable"
      },
      500
    );

  }





  /*
   * IMPORTANT:
   * Read the raw body first.
   * Do not call request.json()
   * before signature verification.
   */

  let rawBody;


  try{


    rawBody =
      await request.text();


  }
  catch(error){


    console.error(
      "Webhook body read error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:
          "Invalid webhook body"
      },
      400
    );


  }






  // -----------------------
  // VERIFY SIGNATURE
  // -----------------------


  let verification;


  try{


    verification =
      await verifyWebhook(

        request,

        rawBody,

        env.RESEND_WEBHOOK_SECRET

      );


  }
  catch(error){


    console.error(
      "Webhook verification error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:
          "Webhook verification failed"
      },
      400
    );


  }



  if(
    !verification.success
  ){

    console.error(
      "Invalid Resend webhook:",
      verification.error
    );


    return jsonResponse(
      {
        success:false,
        error:
          "Invalid webhook"
      },
      400
    );

  }






  // -----------------------
  // PARSE EVENT
  // -----------------------


  let event;


  try{


    event =
      JSON.parse(
        rawBody
      );


  }
  catch(error){


    console.error(
      "Webhook JSON error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:
          "Invalid webhook JSON"
      },
      400
    );


  }





  const eventType =
    String(
      event?.type || ""
    );


  const data =
    event?.data || {};


  const emailId =
    String(
      data.email_id || ""
    );


  const recipientEmail =
    getRecipientEmail(
      data
    );


  const eventCreatedAt =
    String(
      event?.created_at ||
      new Date().toISOString()
    );






  // -----------------------
  // IGNORE OTHER EVENTS
  // -----------------------


  const deliveryStatus =
    deliveryStatusFromEvent(
      eventType
    );


  if(!deliveryStatus){


    return jsonResponse({

      success:true,

      received:true,

      ignored:true,

      eventType

    });


  }






  // -----------------------
  // BOUNCE SUPPRESSION
  // -----------------------


  if(
    eventType ===
    "email.bounced"
  ){


    await suppressEmail(

      env,

      recipientEmail,

      "Bounced",

      "Resend Webhook"

    );


  }






  // -----------------------
  // COMPLAINT SUPPRESSION
  // -----------------------


  if(
    eventType ===
    "email.complained"
  ){


    await suppressEmail(

      env,

      recipientEmail,

      "Complaint",

      "Resend Webhook"

    );


  }






  // -----------------------
  // FIND CAMPAIGN EMAIL
  // -----------------------


  if(!emailId){


    return jsonResponse({

      success:true,

      received:true,

      matched:false,

      eventType,

      reason:
        "Missing email_id"

    });


  }



  const match =
    await findQueueRecipient(

      env,

      emailId

    );



  /*
   * Bounce/Complaint suppression
   * is already saved above.
   *
   * Returning 200 for an unmatched
   * old/non-campaign email prevents
   * pointless webhook retries.
   */

  if(!match){


    return jsonResponse({

      success:true,

      received:true,

      matched:false,

      eventType,

      emailId

    });


  }






  // -----------------------
  // UPDATE DELIVERY STATUS
  // -----------------------


  const {
    queue,
    recipient,
    campaignId
  } = match;



  recipient.deliveryStatus =
    deliveryStatus;


  recipient.deliveryUpdatedAt =
    eventCreatedAt;


  recipient.lastWebhookId =
    verification.webhookId;


  recipient.messageId =
    data.message_id ||
    recipient.messageId ||
    null;






  if(
    eventType ===
    "email.bounced"
  ){


    recipient.deliveryError =

      data?.bounce?.message

      ||

      "Email bounced";


    recipient.bounceType =

      data?.bounce?.type

      ||

      null;


    recipient.bounceSubType =

      data?.bounce?.subType

      ||

      null;


  }
  else if(
    eventType ===
    "email.failed"
  ){


    recipient.deliveryError =

      data?.error?.message

      ||

      data?.failed?.message

      ||

      "Email delivery failed";


  }
  else{


    recipient.deliveryError =
      null;


  }





  updateDeliveryStats(
    queue
  );


  queue.lastDeliveryEventAt =
    eventCreatedAt;



  await env.LEADS_KV.put(

    `email_queue:${queue.id}`,

    JSON.stringify(queue)

  );






  // -----------------------
  // STORE WEBHOOK EVENT
  // -----------------------


  const eventLog = {

    webhookId:
      verification.webhookId,

    type:
      eventType,

    emailId,

    email:
      recipientEmail,

    campaignId,

    queueId:
      queue.id,

    leadId:
      recipient.leadId ||
      null,

    deliveryStatus,

    messageId:
      data.message_id ||
      null,

    createdAt:
      eventCreatedAt,

    receivedAt:
      new Date()
      .toISOString()

  };



  await env.LEADS_KV.put(

    `resend_webhook:${verification.webhookId}`,

    JSON.stringify(
      eventLog
    ),

    {
      expirationTtl:
        60 * 60 * 24 * 90
    }

  );






  return jsonResponse({

    success:true,

    received:true,

    matched:true,

    eventType,

    emailId,

    campaignId,

    queueId:
      queue.id,

    leadId:
      recipient.leadId ||
      null,

    deliveryStatus

  });


}
