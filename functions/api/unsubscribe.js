const HTML_HEADERS = {

  "Content-Type":
    "text/html; charset=UTF-8",

  "Cache-Control":
    "no-store, max-age=0",

  "X-Content-Type-Options":
    "nosniff",

  "X-Frame-Options":
    "DENY",

  "Referrer-Policy":
    "no-referrer",

  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",

  "X-Robots-Tag":
    "noindex, nofollow, noarchive"

};



function htmlResponse(
  html,
  status = 200
){

  return new Response(
    html,
    {
      status,
      headers:HTML_HEADERS
    }
  );

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





function safeEqual(
  a,
  b
){

  const first =
    String(a || "");


  const second =
    String(b || "");


  if(
    first.length !==
    second.length
  ){

    return false;

  }


  let result = 0;


  for(
    let i = 0;
    i < first.length;
    i++
  ){

    result |=

      first.charCodeAt(i) ^

      second.charCodeAt(i);

  }


  return result === 0;

}





async function validateRequest(
  email,
  token,
  env
){

  if(
    !env.UNSUBSCRIBE_SECRET
  ){

    return {
      success:false,
      status:500,
      error:
        "Server configuration error"
    };

  }


  if(
    !env.SUPPRESSIONS_DB
  ){

    return {
      success:false,
      status:500,
      error:
        "Database unavailable"
    };

  }


  const normalizedEmail =
    normalizeEmail(email);


  if(
    !isValidEmail(
      normalizedEmail
    )
  ){

    return {
      success:false,
      status:400,
      error:
        "Invalid unsubscribe link"
    };

  }


  const cleanToken =
    String(
      token || ""
    )
    .trim()
    .toLowerCase();


  if(
    !/^[a-f0-9]{64}$/
    .test(cleanToken)
  ){

    return {
      success:false,
      status:403,
      error:
        "Invalid unsubscribe link"
    };

  }


  const expectedToken =
    await createToken(

      normalizedEmail,

      env.UNSUBSCRIBE_SECRET

    );


  if(
    !safeEqual(
      cleanToken,
      expectedToken
    )
  ){

    return {
      success:false,
      status:403,
      error:
        "Invalid unsubscribe link"
    };

  }


  return {

    success:true,

    email:
      normalizedEmail

  };

}





function pageTemplate({
  title,
  message,
  form = ""
}){

  return `
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>
${escapeHTML(title)}
</title>

<style>

*{
box-sizing:border-box;
}

body{

margin:0;

min-height:100vh;

display:flex;

align-items:center;

justify-content:center;

padding:24px;

background:#07111f;

color:#ffffff;

font-family:
Arial,
Helvetica,
sans-serif;

}

.card{

width:100%;

max-width:560px;

background:#102038;

border:1px solid #263a55;

border-radius:14px;

padding:32px;

box-shadow:
0 15px 50px
rgba(0,0,0,.25);

}

.logo{

font-size:15px;

font-weight:700;

letter-spacing:2px;

color:#42d6d1;

margin-bottom:28px;

}

h1{

margin:
0 0 16px;

font-size:28px;

line-height:1.2;

}

p{

margin:
0 0 24px;

color:#c8d3e1;

line-height:1.65;

}

button{

border:0;

border-radius:8px;

padding:
13px 20px;

background:#42d6d1;

color:#04131c;

font-weight:700;

font-size:15px;

cursor:pointer;

}

button:hover{

opacity:.92;

}

.small{

margin-top:24px;

font-size:13px;

color:#8292a8;

}

</style>

</head>

<body>

<div class="card">

<div class="logo">
MERQIVA
</div>

<h1>
${escapeHTML(title)}
</h1>

<p>
${escapeHTML(message)}
</p>

${form}

<div class="small">
Merqiva Intelligence
</div>

</div>

</body>

</html>
`;

}





// =======================
// GET CONFIRMATION PAGE
// =======================


export async function onRequestGet(
  context
){

  const {
    request,
    env
  } = context;


  try{


    const url =
      new URL(
        request.url
      );


    const email =
      url.searchParams.get(
        "email"
      );


    const token =
      url.searchParams.get(
        "token"
      );


    const validation =
      await validateRequest(
        email,
        token,
        env
      );


    if(
      !validation.success
    ){

      return htmlResponse(

        pageTemplate({

          title:
            "Invalid unsubscribe link",

          message:
            validation.status === 500
              ? "The unsubscribe service is temporarily unavailable."
              : "This unsubscribe link is invalid or has been modified."

        }),

        validation.status

      );

    }



    const safeEmail =
      escapeHTML(
        validation.email
      );


    const safeToken =
      escapeHTML(
        token
      );


    return htmlResponse(

      pageTemplate({

        title:
          "Unsubscribe",

        message:
          `Confirm that you no longer want to receive marketing emails from Merqiva at ${validation.email}.`,

        form:
        `

<form
method="POST"
action="/api/unsubscribe"
>

<input
type="hidden"
name="email"
value="${safeEmail}"
>

<input
type="hidden"
name="token"
value="${safeToken}"
>

<button
type="submit"
>
Unsubscribe
</button>

</form>

`

      })

    );


  }
  catch(error){


    console.error(
      "Unsubscribe GET error:",
      error
    );


    return htmlResponse(

      pageTemplate({

        title:
          "Something went wrong",

        message:
          "The unsubscribe service is temporarily unavailable."

      }),

      500

    );


  }


}







// =======================
// POST UNSUBSCRIBE
// =======================


export async function onRequestPost(
  context
){

  const {
    request,
    env
  } = context;


  try{


    const url =
      new URL(
        request.url
      );


    let email =
      url.searchParams.get(
        "email"
      );


    let token =
      url.searchParams.get(
        "token"
      );


    const contentType =
      request.headers.get(
        "Content-Type"
      ) || "";



    if(
      contentType.includes(
        "application/x-www-form-urlencoded"
      )

      ||

      contentType.includes(
        "multipart/form-data"
      )
    ){


      const formData =
        await request.formData();


      email =
        formData.get("email")
        ||
        email;


      token =
        formData.get("token")
        ||
        token;


    }



    const validation =
      await validateRequest(
        email,
        token,
        env
      );


    if(
      !validation.success
    ){

      return htmlResponse(

        pageTemplate({

          title:
            "Invalid unsubscribe link",

          message:
            validation.status === 500
              ? "The unsubscribe service is temporarily unavailable."
              : "This unsubscribe request is invalid."

        }),

        validation.status

      );

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
      VALUES
      (?, 'Unsubscribed', 'Email Unsubscribe', ?)

      ON CONFLICT(email)
      DO UPDATE SET

        reason =
          'Unsubscribed',

        source =
          'Email Unsubscribe',

        created_at =
          excluded.created_at
      `
    )
    .bind(
      validation.email,
      now
    )
    .run();



    return htmlResponse(

      pageTemplate({

        title:
          "You are unsubscribed",

        message:
          "You will no longer receive marketing emails from Merqiva at this email address."

      })

    );


  }
  catch(error){


    console.error(
      "Unsubscribe POST error:",
      error
    );


    return htmlResponse(

      pageTemplate({

        title:
          "Something went wrong",

        message:
          "We could not process your unsubscribe request. Please try again later."

      }),

      500

    );


  }


}
