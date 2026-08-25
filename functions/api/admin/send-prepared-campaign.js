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





async function checkSession(
  request,
  env
){

  const authorization =
    request.headers.get(
      "Authorization"
    );


  if(
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ){

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





function escapeHTML(value){

  return String(
    value || ""
  )

  .replace(
    /&/g,
    "&amp;"
  )

  .replace(
    /</g,
    "&lt;"
  )

  .replace(
    />/g,
    "&gt;"
  )

  .replace(
    /"/g,
    "&quot;"
  )

  .replace(
    /'/g,
    "&#039;"
  );

}





function cleanSubject(value){

  return String(
    value || ""
  )
  .replace(
    /[\r\n]+/g,
    " "
  )
  .trim()
  .slice(
    0,
    200
  );

}





function bytesToHex(bytes){

  return Array
    .from(
      new Uint8Array(bytes)
    )
    .map(
      byte =>
        byte
        .toString(16)
        .padStart(
          2,
          "0"
        )
    )
    .join("");

}





async function createToken(
  email,
  secret
){

  const encoder =
    new TextEncoder();


  const key =
    await crypto.subtle.importKey(

      "raw",

      encoder.encode(secret),

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

      encoder.encode(email)

    );


  return bytesToHex(
    signature
  );

}





async function saveCampaign(
  env,
  campaign
){

  await env.LEADS_KV.put(

    `campaign:${campaign.id}`,

    JSON.stringify(
      campaign
    )

  );

}





async function saveQueue(
  env,
  queue
){

  await env.LEADS_KV.put(

    `email_queue:${queue.id}`,

    JSON.stringify(
      queue
    )

  );

}





function getQueueRecipient(
  queue,
  leadId
){

  return (
    queue.recipients || []
  )
  .find(
    item =>
      item.leadId === leadId
  );

}





function calculateQueueStats(
  queue
){

  const recipients =
    queue.recipients || [];


  queue.sent =
    recipients.filter(
      item =>
        item.status === "Sent"
    ).length;


  queue.failed =
    recipients.filter(
      item =>
        item.status === "Failed"
    ).length;


  queue.suppressed =
    recipients.filter(
      item =>
        item.status === "Suppressed"
    ).length;

}





function buildEmailHTML(
  campaign,
  recipient,
  unsubscribeUrl
){

  const safeName =
    escapeHTML(
      recipient.name
    );


  const safeBody =
    escapeHTML(
      campaign.body || ""
    )
    .replace(
      /\r?\n/g,
      "<br>"
    );


  const safeUnsubscribe =
    escapeHTML(
      unsubscribeUrl
    );


  return `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

</head>

<body style="
margin:0;
padding:0;
background:#f4f7fb;
font-family:Arial,Helvetica,sans-serif;
color:#172033;
">

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
background:#f4f7fb;
padding:30px 15px;
"
>

<tr>

<td align="center">

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
max-width:650px;
background:#ffffff;
border-radius:10px;
overflow:hidden;
"
>

<tr>

<td style="
background:#0b1729;
padding:24px 30px;
color:#ffffff;
"
>

<div style="
font-weight:700;
letter-spacing:2px;
color:#42d6d1;
">
MERQIVA
</div>

</td>

</tr>


<tr>

<td style="
padding:32px 30px;
font-size:16px;
line-height:1.7;
"
>

${
safeName
?
`
<p>
Hello ${safeName},
</p>
`
:
""
}

<div>
${safeBody}
</div>


<p style="
margin-top:34px;
">
Regards,<br>
<strong>Merqiva Intelligence</strong>
</p>

</td>

</tr>


<tr>

<td style="
padding:22px 30px;
background:#f7f9fc;
font-size:12px;
line-height:1.6;
color:#68758a;
text-align:center;
"
>

You are receiving this marketing email from Merqiva.

<br><br>

<a
href="${safeUnsubscribe}"
style="
color:#50657d;
text-decoration:underline;
"
>
Unsubscribe
</a>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
`;

}





function buildEmailText(
  campaign,
  recipient,
  unsubscribeUrl
){

  const greeting =
    recipient.name
      ? `Hello ${recipient.name},\n\n`
      : "";


  return (

    greeting +

    String(
      campaign.body || ""
    ) +

    "\n\nRegards,\nMerqiva Intelligence" +

    "\n\nUnsubscribe:\n" +

    unsubscribeUrl

  );

}








// =======================
// SEND ONE RECIPIENT
// =======================


export async function onRequestPost(
  context
){

  const {
    request,
    env
  } = context;


  if(
    !(await checkSession(
      request,
      env
    ))
  ){

    return jsonResponse(
      {
        success:false,
        error:"Unauthorized"
      },
      401
    );

  }





  if(
    !env.RESEND_API_KEY ||
    !env.UNSUBSCRIBE_SECRET ||
    !env.SUPPRESSIONS_DB
  ){

    console.error(
      "Missing campaign email configuration"
    );


    return jsonResponse(
      {
        success:false,
        error:
          "Email configuration missing"
      },
      500
    );

  }





  try{


    const body =
      await request.json();


    const campaignId =
      String(
        body.campaignId || ""
      )
      .trim();


    const confirm =
      String(
        body.confirm || ""
      );


    if(!campaignId){

      return jsonResponse(
        {
          success:false,
          error:"Missing campaignId"
        },
        400
      );

    }


    if(
      confirm !== "SEND_ONE"
    ){

      return jsonResponse(
        {
          success:false,
          error:
            "Explicit send confirmation required"
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
          type:"json"
        }

      );


    if(!campaign){

      return jsonResponse(
        {
          success:false,
          error:"Campaign not found"
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


    if(!queueId){

      return jsonResponse(
        {
          success:false,
          error:"Campaign queue not found"
        },
        404
      );

    }


    const queue =
      await env.LEADS_KV.get(

        `email_queue:${queueId}`,

        {
          type:"json"
        }

      );


    if(!queue){

      return jsonResponse(
        {
          success:false,
          error:"Queue not found"
        },
        404
      );

    }






    // -----------------------
    // LOAD PREPARED SNAPSHOT
    // -----------------------


    const prepared =
      await env.LEADS_KV.get(

        `campaign_prepared:${campaignId}`,

        {
          type:"json"
        }

      );


    if(
      !prepared ||
      !Array.isArray(
        prepared.recipients
      ) ||
      prepared.recipients.length === 0
    ){

      return jsonResponse(
        {
          success:false,
          error:
            "Campaign is not prepared"
        },
        400
      );

    }


    if(
      prepared.queueId !== queueId
    ){

      return jsonResponse(
        {
          success:false,
          error:
            "Prepared campaign does not match queue"
        },
        409
      );

    }






    // -----------------------
    // BLOCK COMPLETED CAMPAIGN
    // -----------------------


    if(
      campaign.status === "Sent" ||
      queue.status === "Sent"
    ){

      return jsonResponse(
        {
          success:false,
          error:
            "Campaign already sent"
        },
        409
      );

    }


    if(
      campaign.status === "Sending" ||
      queue.status === "Sending"
    ){

      return jsonResponse(
        {
          success:false,
          error:
            "Campaign is already sending"
        },
        409
      );

    }






    // -----------------------
    // FIND NEXT RECIPIENT
    // -----------------------


    let recipient = null;

    let queueRecipient = null;


    for(
      const item of
      prepared.recipients
    ){


      const qr =
        getQueueRecipient(
          queue,
          item.leadId
        );


      if(!qr){

        continue;

      }


      if(
        qr.status === "Sent"
      ){

        continue;

      }


      recipient =
        item;


      queueRecipient =
        qr;


      break;


    }






    if(
      !recipient ||
      !queueRecipient
    ){


      calculateQueueStats(
        queue
      );


      queue.status =
        "Sent";


      queue.completedAt =
        new Date()
        .toISOString();


      campaign.status =
        "Sent";


      campaign.sentAt =
        queue.completedAt;


      await saveQueue(
        env,
        queue
      );


      await saveCampaign(
        env,
        campaign
      );


      return jsonResponse({

        success:true,

        sent:false,

        completed:true,

        message:
          "Campaign completed"

      });

    }






    const email =
      String(
        recipient.email || ""
      )
      .trim()
      .toLowerCase();






    // -----------------------
    // LIVE D1 SUPPRESSION CHECK
    // -----------------------


    const suppression =
      await env.SUPPRESSIONS_DB
      .prepare(
        `
        SELECT
          email,
          reason
        FROM suppressions
        WHERE email = ?
        LIMIT 1
        `
      )
      .bind(
        email
      )
      .first();



    if(suppression){


      queueRecipient.status =
        "Suppressed";


      queueRecipient.error =
        `Suppressed: ${
          suppression.reason ||
          "Do Not Send"
        }`;


      queueRecipient.lastAttemptAt =
        new Date()
        .toISOString();


      calculateQueueStats(
        queue
      );


      queue.status =
        "Queued";


      campaign.status =
        "Queued";


      await saveQueue(
        env,
        queue
      );


      await saveCampaign(
        env,
        campaign
      );


      return jsonResponse({

        success:true,

        sent:false,

        suppressed:true,

        email,

        reason:
          suppression.reason ||
          "Do Not Send"

      });

    }






    // -----------------------
    // CREATE UNSUBSCRIBE URL
    // -----------------------


    const unsubscribeToken =
      await createToken(

        email,

        env.UNSUBSCRIBE_SECRET

      );


    const origin =
      new URL(
        request.url
      ).origin;


    const unsubscribeUrl =

      `${origin}/api/unsubscribe?email=${
        encodeURIComponent(email)
      }&token=${
        encodeURIComponent(
          unsubscribeToken
        )
      }`;






    // -----------------------
    // BUILD EMAIL
    // -----------------------


    const subject =
      cleanSubject(
        campaign.subject
      );


    if(!subject){

      return jsonResponse(
        {
          success:false,
          error:"Campaign subject missing"
        },
        400
      );

    }


    const html =
      buildEmailHTML(

        campaign,

        recipient,

        unsubscribeUrl

      );


    const text =
      buildEmailText(

        campaign,

        recipient,

        unsubscribeUrl

      );






    // -----------------------
    // MARK AS SENDING
    // -----------------------


    const attemptTime =
      new Date()
      .toISOString();


    queue.status =
      "Sending";


    queue.startedAt =
      queue.startedAt ||
      attemptTime;


    queueRecipient.status =
      "Sending";


    queueRecipient.attempts =
      Number(
        queueRecipient.attempts || 0
      ) + 1;


    queueRecipient.lastAttemptAt =
      attemptTime;


    queueRecipient.error =
      null;


    campaign.status =
      "Sending";


    await saveQueue(
      env,
      queue
    );


    await saveCampaign(
      env,
      campaign
    );






    // -----------------------
    // RESEND API
    // -----------------------


    const idempotencyKey =

      `campaign/${campaignId}/lead/${recipient.leadId}`;


    let resendResponse;


    try{


      resendResponse =
        await fetch(

          "https://api.resend.com/emails",

          {

            method:"POST",

            headers:{

              "Authorization":
                `Bearer ${env.RESEND_API_KEY}`,

              "Content-Type":
                "application/json",

              "User-Agent":
                "Merqiva-Campaign-Engine/1.0",

              "Idempotency-Key":
                idempotencyKey

            },

            body:
              JSON.stringify({

                from:
                  "Merqiva <hello@merqivaintel.com>",

                to:[
                  email
                ],

                reply_to:
                  "hello@merqivaintel.com",

                subject,

                html,

                text,

                headers:{

                  "List-Unsubscribe":
                    `<${unsubscribeUrl}>`,

                  "X-Entity-Ref-ID":
                    `${campaignId}-${recipient.leadId}`

                }

              })

          }

        );


    }
    catch(error){


      console.error(
        "Resend network error:",
        error
      );


      queueRecipient.status =
        "Failed";


      queueRecipient.error =
        "Resend network error";


      queue.status =
        "Queued";


      campaign.status =
        "Queued";


      calculateQueueStats(
        queue
      );


      await saveQueue(
        env,
        queue
      );


      await saveCampaign(
        env,
        campaign
      );


      return jsonResponse(
        {
          success:false,
          error:
            "Email provider unavailable"
        },
        503
      );

    }






    // -----------------------
    // HANDLE RESEND ERROR
    // -----------------------


    if(
      !resendResponse.ok
    ){


      const errorText =
        await resendResponse.text();


      console.error(
        "Resend send error:",
        resendResponse.status,
        errorText.slice(
          0,
          500
        )
      );


      queueRecipient.status =
        "Failed";


      queueRecipient.error =
        `Resend ${resendResponse.status}`;


      queue.status =
        "Queued";


      campaign.status =
        "Queued";


      calculateQueueStats(
        queue
      );


      await saveQueue(
        env,
        queue
      );


      await saveCampaign(
        env,
        campaign
      );


      return jsonResponse(
        {
          success:false,

          error:
            "Email send failed",

          providerStatus:
            resendResponse.status
        },
        502
      );

    }






    // -----------------------
    // RESEND SUCCESS
    // -----------------------


    const resendData =
      await resendResponse.json();


    const sentAt =
      new Date()
      .toISOString();


    queueRecipient.status =
      "Sent";


    queueRecipient.sentAt =
      sentAt;


    queueRecipient.resendId =
      resendData.id || null;


    queueRecipient.error =
      null;


    calculateQueueStats(
      queue
    );






    // -----------------------
    // CHECK REMAINING
    // -----------------------


    const remaining =

      prepared.recipients.filter(

        item=>{


          const qr =
            getQueueRecipient(
              queue,
              item.leadId
            );


          return (
            qr &&
            qr.status !== "Sent" &&
            qr.status !== "Suppressed"
          );

        }

      ).length;






    if(
      remaining === 0
    ){


      queue.status =
        "Sent";


      queue.completedAt =
        sentAt;


      campaign.status =
        "Sent";


      campaign.sentAt =
        sentAt;


    }
    else{


      queue.status =
        "Queued";


      campaign.status =
        "Queued";


    }





    await saveQueue(
      env,
      queue
    );


    await saveCampaign(
      env,
      campaign
    );






    return jsonResponse({

      success:true,

      sent:true,

      campaignId,

      queueId,

      leadId:
        recipient.leadId,

      email,

      resendId:
        resendData.id || null,

      sentAt,

      remaining,

      campaignStatus:
        campaign.status

    });


  }
  catch(error){


    console.error(
      "Send prepared campaign error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:
          "Campaign send failed"
      },
      500
    );


  }


}
