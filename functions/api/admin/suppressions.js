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
        .bind(
          requestedEmail
        )
        .first();



      return jsonResponse({

        success:true,

        suppressed:
          !!suppression,

        suppression:
          suppression || null

      });


    }





    // LOAD ALL SUPPRESSIONS

    const result =
      await env.SUPPRESSIONS_DB
      .prepare(
        `
        SELECT
          email,
          reason,
          source,
          created_at AS createdAt
        FROM suppressions
        ORDER BY created_at DESC
        `
      )
      .all();



    const suppressions =
      result.results || [];



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
      .bind(
        email
      )
      .first();



    if(existing){


      return jsonResponse({

        success:true,

        alreadySuppressed:true,

        suppression:
          existing

      });


    }





    const createdAt =
      new Date().toISOString();



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
      `
    )
    .bind(
      email,
      reason,
      source,
      createdAt
    )
    .run();





    const suppression = {

      email,

      reason,

      source,

      createdAt

    };





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
      await env.SUPPRESSIONS_DB
      .prepare(
        `
        SELECT email
        FROM suppressions
        WHERE email = ?
        LIMIT 1
        `
      )
      .bind(
        email
      )
      .first();



    if(!existing){

      return jsonResponse(
        {
          success:false,
          error:"Suppression not found"
        },
        404
      );

    }





    await env.SUPPRESSIONS_DB
    .prepare(
      `
      DELETE FROM suppressions
      WHERE email = ?
      `
    )
    .bind(
      email
    )
    .run();





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
