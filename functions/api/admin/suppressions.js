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





function normalizeEmail(email){


  return String(
    email || ""
  )
  .trim()
  .toLowerCase();


}





function isValidEmail(email){


  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);


}





const ALLOWED_REASONS = [

  "Unsubscribed",

  "Bounced",

  "Complaint",

  "Manual"

];








// =======================
// GET SUPPRESSIONS
// =======================


export async function onRequestGet(
  context
){

  const {
    request,
    env
  } = context;


  if(
    !(await checkSession(request,env))
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


    const requestedEmail =
      normalizeEmail(
        url.searchParams.get("email")
      );



    // CHECK SINGLE EMAIL

    if(requestedEmail){


      const suppression =
        await env.LEADS_KV.get(

          `suppression:${requestedEmail}`,

          {
            type:"json"
          }

        );


      return jsonResponse({

        success:true,

        suppressed:
          !!suppression,

        suppression:
          suppression || null

      });


    }





    // LOAD FULL INDEX

    const index =
      JSON.parse(

        await env.LEADS_KV.get(
          "suppressions:index"
        )

        ||

        "[]"

      );



    const suppressions = [];



    for(
      const email of index
    ){


      const item =
        await env.LEADS_KV.get(

          `suppression:${email}`,

          {
            type:"json"
          }

        );


      if(item){

        suppressions.push(item);

      }


    }



    suppressions.sort(

      (a,b)=>

        new Date(b.createdAt) -
        new Date(a.createdAt)

    );



    return jsonResponse({

      success:true,

      count:
        suppressions.length,

      suppressions

    });


  }
  catch(error){


    console.error(
      "Suppressions GET error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:"Failed to load suppressions"
      },
      500
    );


  }


}








// =======================
// ADD SUPPRESSION
// =======================


export async function onRequestPost(
  context
){

  const {
    request,
    env
  } = context;


  if(
    !(await checkSession(request,env))
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



    const email =
      normalizeEmail(
        body.email
      );


    const reason =
      body.reason || "Manual";


    const source =
      String(
        body.source || "Admin"
      )
      .trim();



    if(
      !email ||
      !isValidEmail(email)
    ){

      return jsonResponse(
        {
          success:false,
          error:"Invalid email"
        },
        400
      );

    }



    if(
      !ALLOWED_REASONS.includes(reason)
    ){

      return jsonResponse(
        {
          success:false,
          error:"Invalid suppression reason"
        },
        400
      );

    }





    // CHECK EXISTING

    const existing =
      await env.LEADS_KV.get(

        `suppression:${email}`,

        {
          type:"json"
        }

      );



    if(existing){


      return jsonResponse({

        success:true,

        alreadySuppressed:true,

        suppression:
          existing

      });


    }





    const suppression = {

      email,

      reason,

      source,

      createdAt:
        new Date().toISOString()

    };





    await env.LEADS_KV.put(

      `suppression:${email}`,

      JSON.stringify(
        suppression
      )

    );





    let index =
      JSON.parse(

        await env.LEADS_KV.get(
          "suppressions:index"
        )

        ||

        "[]"

      );



    if(
      !index.includes(email)
    ){

      index.push(email);

    }



    await env.LEADS_KV.put(

      "suppressions:index",

      JSON.stringify(index)

    );





    return jsonResponse({

      success:true,

      alreadySuppressed:false,

      suppression

    });


  }
  catch(error){


    console.error(
      "Suppression CREATE error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:"Failed to add suppression"
      },
      500
    );


  }


}








// =======================
// DELETE SUPPRESSION
// =======================


export async function onRequestDelete(
  context
){

  const {
    request,
    env
  } = context;


  if(
    !(await checkSession(request,env))
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


    const email =
      normalizeEmail(
        body.email
      );



    if(
      !email ||
      !isValidEmail(email)
    ){

      return jsonResponse(
        {
          success:false,
          error:"Invalid email"
        },
        400
      );

    }



    const existing =
      await env.LEADS_KV.get(

        `suppression:${email}`,

        {
          type:"json"
        }

      );



    if(!existing){

      return jsonResponse(
        {
          success:false,
          error:"Suppression not found"
        },
        404
      );

    }





    await env.LEADS_KV.delete(

      `suppression:${email}`

    );





    let index =
      JSON.parse(

        await env.LEADS_KV.get(
          "suppressions:index"
        )

        ||

        "[]"

      );



    index =
      index.filter(

        item =>
          item !== email

      );



    await env.LEADS_KV.put(

      "suppressions:index",

      JSON.stringify(index)

    );





    return jsonResponse({

      success:true,

      email

    });


  }
  catch(error){


    console.error(
      "Suppression DELETE error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:"Failed to remove suppression"
      },
      500
    );


  }


}
