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





function bytesToHex(bytes){

  return Array
    .from(
      new Uint8Array(bytes)
    )
    .map(
      byte =>
        byte
        .toString(16)
        .padStart(2,"0")
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


  if(
    !env.UNSUBSCRIBE_SECRET
  ){

    return jsonResponse(
      {
        success:false,
        error:"UNSUBSCRIBE_SECRET missing"
      },
      500
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



    const token =
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
        encodeURIComponent(token)
      }`;



    return jsonResponse({

      success:true,

      email,

      unsubscribeUrl

    });


  }
  catch(error){


    console.error(
      "Unsubscribe link error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:"Failed to create unsubscribe link"
      },
      500
    );


  }


}
