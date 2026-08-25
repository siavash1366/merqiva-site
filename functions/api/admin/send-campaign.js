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
      headers: API_HEADERS
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
    !authorization.startsWith("Bearer ")
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







// =======================
// GET QUEUE STATUS
// =======================

export async function onRequestGet(
  context
){

  const {
    request,
    env
  } = context;


  if(
    !(await checkSession(request, env))
  ){

    return jsonResponse(
      {
        success:false,
        error:"Unauthorized"
      },
      401
    );

  }


  try{


    const url =
      new URL(request.url);


    const campaignId =
      url.searchParams.get(
        "campaignId"
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



    const queueId =
      await env.LEADS_KV.get(
        `campaign_queue:${campaignId}`
      );


    if(!queueId){

      return jsonResponse({

        success:true,

        queued:false,

        queue:null

      });

    }



    const queue =
      await env.LEADS_KV.get(

        `email_queue:${queueId}`,

        {
          type:"json"
        }

      );


    return jsonResponse({

      success:true,

      queued:!!queue,

      queue:queue || null

    });


  }
  catch(error){


    console.error(
      "Queue GET error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:"Failed to load queue"
      },
      500
    );

  }

}









// =======================
// QUEUE CAMPAIGN
// =======================

export async function onRequestPost(
  context
){

  const {
    request,
    env
  } = context;


  if(
    !(await checkSession(request, env))
  ){

    return jsonResponse(
      {
        success:false,
        error:"Unauthorized"
      },
      401
    );

  }


  try{


    const body =
      await request.json();


    const campaignId =
      body.campaignId;


    if(!campaignId){

      return jsonResponse(
        {
          success:false,
          error:"Missing campaignId"
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
    // PREVENT DUPLICATE QUEUE
    // -----------------------

    const existingQueueId =
      await env.LEADS_KV.get(
        `campaign_queue:${campaignId}`
      );


    if(existingQueueId){

      const existingQueue =
        await env.LEADS_KV.get(

          `email_queue:${existingQueueId}`,

          {
            type:"json"
          }

        );


      if(existingQueue){

        return jsonResponse(
          {
            success:false,
            error:"Campaign already queued",
            queue:existingQueue
          },
          409
        );

      }

    }






    // -----------------------
    // LOAD SAVED AUDIENCE
    // -----------------------

    const storedRecipients =
      await env.LEADS_KV.get(

        `campaign_recipients:${campaignId}`,

        {
          type:"json"
        }

      );


    const recipients =
      Array.isArray(storedRecipients)
        ? storedRecipients
        : [];



    const uniqueRecipients =
      [
        ...new Set(
          recipients.filter(Boolean)
        )
      ];



    if(
      uniqueRecipients.length === 0
    ){

      return jsonResponse(
        {
          success:false,
          error:"Campaign has no recipients"
        },
        400
      );

    }






    // -----------------------
    // CREATE QUEUE
    // -----------------------

    const queueId =
      "Q" + Date.now();


    const now =
      new Date().toISOString();



    const queue = {

      id:queueId,

      campaignId,

      campaignName:
        campaign.name,

      subject:
        campaign.subject,

      status:
        "Queued",

      createdAt:
        now,

      startedAt:
        null,

      completedAt:
        null,

      total:
        uniqueRecipients.length,

      sent:
        0,

      failed:
        0,

      recipients:
        uniqueRecipients.map(
          leadId => ({

            leadId,

            status:
              "Pending",

            attempts:
              0,

            sentAt:
              null,

            error:
              null

          })
        )

    };






    // -----------------------
    // SAVE QUEUE
    // -----------------------

    await env.LEADS_KV.put(

      `email_queue:${queueId}`,

      JSON.stringify(queue)

    );



    await env.LEADS_KV.put(

      `campaign_queue:${campaignId}`,

      queueId

    );






    // -----------------------
    // UPDATE QUEUE INDEX
    // -----------------------

    let queueIndex =
      JSON.parse(

        await env.LEADS_KV.get(
          "email_queue:index"
        )

        ||

        "[]"

      );


    if(
      !queueIndex.includes(queueId)
    ){

      queueIndex.push(queueId);

    }


    await env.LEADS_KV.put(

      "email_queue:index",

      JSON.stringify(queueIndex)

    );






    // -----------------------
    // UPDATE CAMPAIGN STATUS
    // -----------------------

    campaign.status =
      "Queued";


    campaign.queueId =
      queueId;


    campaign.queuedAt =
      now;



    await env.LEADS_KV.put(

      `campaign:${campaignId}`,

      JSON.stringify(campaign)

    );






    return jsonResponse({

      success:true,

      message:
        "Campaign queued",

      queueId,

      campaignId,

      status:
        "Queued",

      recipients:
        uniqueRecipients.length

    });


  }
  catch(error){


    console.error(
      "Queue CREATE error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:"Failed to queue campaign"
      },
      500
    );

  }

}
