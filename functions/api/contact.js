const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_TTL = 600;

const MAX_BODY_BYTES = 32 * 1024;

const LEAD_TTL =
  60 * 60 * 24 * 365;


const EXPECTED_TURNSTILE_ACTION =
  "contact";


const ALLOWED_TURNSTILE_HOSTNAMES =
  new Set([
    "merqivaintel.com",
    "www.merqivaintel.com"
  ]);



const API_HEADERS = {

  "Content-Type":
    "application/json; charset=UTF-8",

  "Cache-Control":
    "no-store, max-age=0",

  "X-Content-Type-Options":
    "nosniff",

  "X-Frame-Options":
    "DENY",

  "Referrer-Policy":
    "no-referrer",

  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",

  "Strict-Transport-Security":
    "max-age=31536000; includeSubDomains",

  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",

  "X-Permitted-Cross-Domain-Policies":
    "none",

  "X-Robots-Tag":
    "noindex, nofollow, nosnippet"

};




function jsonResponse(
  data,
  status = 200,
  extraHeaders = {}
) {

  return new Response(

    JSON.stringify(data),

    {

      status,

      headers:
      {
        ...API_HEADERS,
        ...extraHeaders
      }

    }

  );

}




function normalizeField(
  value
) {

  return typeof value === "string"
    ? value.trim()
    : "";

}




function validateRequired(
  value,
  maxLength
) {

  return (

    typeof value === "string" &&

    value.length > 0 &&

    value.length <= maxLength

  );

}




function validateOptional(
  value,
  maxLength
) {

  return (

    typeof value === "string" &&

    value.length <= maxLength

  );

}




function validateEmail(
  value
) {

  if (

    typeof value !== "string" ||

    value.length === 0 ||

    value.length > 200

  ) {

    return false;

  }


  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );

}




function escapeHTML(
  value = ""
) {

  return String(value)

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




function cleanHeaderValue(
  value = ""
) {

  return String(value)

    .replace(
      /[\r\n]+/g,
      " "
    )

    .trim()

    .slice(
      0,
      120
    );

}




function createLeadId() {

  return Date.now()
    .toString(36)
    .toUpperCase();

}




function createRateKey(
  ip,
  email
) {

  const cleanEmail =
    email
      .toLowerCase()
      .slice(
        0,
        200
      );


  return `contact:${ip}:${cleanEmail}`;

}





export async function onRequestPost(
  context
) {

  const {
    request,
    env
  } = context;




  const contentLength =
    Number(
      request.headers.get(
        "Content-Length"
      ) || "0"
    );




  if (

    Number.isFinite(contentLength) &&

    contentLength > MAX_BODY_BYTES

  ) {

    return jsonResponse(
      {
        success:false,
        error:"Request too large"
      },
      413
    );

  }




  const contentType =
    request.headers.get(
      "Content-Type"
    ) || "";




  const validContentType =

    contentType.includes(
      "multipart/form-data"
    )

    ||

    contentType.includes(
      "application/x-www-form-urlencoded"
    );




  if (!validContentType) {

    return jsonResponse(
      {
        success:false,
        error:"Unsupported request format"
      },
      415
    );

  }




  let formData;




  try {

    formData =
      await request.formData();


  } catch(error) {

    console.error(
      "Form parsing error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:"Invalid form data"
      },
      400
    );

  }
 /*
   * Honeypot
   */


  const honeypot =
    normalizeField(
      formData.get(
        "website"
      )
    );



  if (honeypot) {

    return jsonResponse(
      {
        success:true
      },
      200
    );

  }





  /*
   * Environment Check
   */


  if (

    !env.TURNSTILE_SECRET_KEY ||

    !env.RESEND_API_KEY

  ) {


    console.error(
      "Missing environment configuration"
    );


    return jsonResponse(
      {
        success:false,
        error:"Server configuration error"
      },
      500
    );

  }





  if (

    !env.CONTACT_LIMIT ||

    typeof env.CONTACT_LIMIT.get !== "function" ||

    typeof env.CONTACT_LIMIT.put !== "function"

  ) {


    console.error(
      "CONTACT_LIMIT KV unavailable"
    );


    return jsonResponse(
      {
        success:false,
        error:"Rate limit unavailable"
      },
      500
    );

  }





  if (

    !env.LEADS_KV ||

    typeof env.LEADS_KV.put !== "function" ||

    typeof env.LEADS_KV.get !== "function"

  ) {


    console.error(
      "LEADS_KV unavailable"
    );


    return jsonResponse(
      {
        success:false,
        error:"Lead storage unavailable"
      },
      500
    );

  }







  /*
   * Turnstile Verification
   */


  const turnstileToken =
    normalizeField(
      formData.get(
        "cf-turnstile-response"
      )
    );




  if (!turnstileToken) {


    return jsonResponse(
      {
        success:false,
        error:"Verification missing"
      },
      400
    );

  }





  const clientIP =
    request.headers.get(
      "CF-Connecting-IP"
    ) || "unknown";





  const turnstileController =
    new AbortController();




  const turnstileTimeout =
    setTimeout(

      () =>
        turnstileController.abort(),

      8000

    );





  let turnstileResponse;





  try {


    const verifyBody =
      new URLSearchParams({

        secret:
          env.TURNSTILE_SECRET_KEY,


        response:
          turnstileToken

      });





    if (
      clientIP !== "unknown"
    ) {


      verifyBody.set(
        "remoteip",
        clientIP
      );


    }





    turnstileResponse =
      await fetch(

        "https://challenges.cloudflare.com/turnstile/v0/siteverify",

        {

          method:
            "POST",


          headers:
          {

            "Content-Type":
              "application/x-www-form-urlencoded"

          },


          body:
            verifyBody,


          signal:
            turnstileController.signal

        }

      );





  } catch(error) {


    console.error(
      "Turnstile request error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:"Verification unavailable"
      },
      503
    );



  } finally {


    clearTimeout(
      turnstileTimeout
    );


  }





  if (
    !turnstileResponse.ok
  ) {


    console.error(
      "Turnstile HTTP error:",
      turnstileResponse.status
    );


    return jsonResponse(
      {
        success:false,
        error:"Verification failed"
      },
      503
    );


  }






  let turnstileResult;





  try {


    turnstileResult =
      await turnstileResponse.json();



  } catch(error) {


    console.error(
      "Turnstile JSON error:",
      error
    );


    return jsonResponse(
      {
        success:false,
        error:"Verification failed"
      },
      503
    );


  }






  if (

    !turnstileResult.success ||

    turnstileResult.action !==
      EXPECTED_TURNSTILE_ACTION ||

    !ALLOWED_TURNSTILE_HOSTNAMES.has(
      turnstileResult.hostname
    )

  ) {


    console.error(
      "Turnstile validation failed",
      turnstileResult
    );


    return jsonResponse(
      {
        success:false,
        error:"Verification failed"
      },
      403
    );


  }






  /*
   * Read Form Fields
   */


  const name =
    normalizeField(
      formData.get("name")
    );



  const email =
    normalizeField(
      formData.get("email")
    );



  const company =
    normalizeField(
      formData.get("company")
    );



  const country =
    normalizeField(
      formData.get("country")
    );



  const offering =
    normalizeField(
      formData.get("offering")
    );



  const market =
    normalizeField(
      formData.get("market")
    );



  const message =
    normalizeField(
      formData.get("message")
    );






  /*
   * Validate Input
   */


  if (

    !validateRequired(
      name,
      100
    )

    ||

    !validateEmail(
      email
    )

    ||

    !validateRequired(
      company,
      150
    )

    ||

    !validateRequired(
      offering,
      200
    )

    ||

    !validateOptional(
      country,
      100
    )

    ||

    !validateOptional(
      market,
      100
    )

    ||

    !validateOptional(
      message,
      2000
    )

  ) {


    return jsonResponse(
      {
        success:false,
        error:"Invalid input"
      },
      400
    );


  }





  /*
   * Rate Limit
   */


  const rateKey =
    createRateKey(
      clientIP,
      email
    );





  try {


    const current =
      Number(
        await env.CONTACT_LIMIT.get(
          rateKey
        ) || "0"
      );





    if (
      current >= RATE_LIMIT_MAX
    ) {


      return jsonResponse(
        {
          success:false,

          error:
            "Too many requests. Please wait before submitting another inquiry."

        },

        429,

        {

          "Retry-After":
            String(
              RATE_LIMIT_TTL
            )

        }

      );


    }
    await env.CONTACT_LIMIT.put(

      rateKey,

      String(
        current + 1
      ),

      {
        expirationTtl:
          RATE_LIMIT_TTL
      }
    );

  } catch(error) {

    console.error(
      "Rate limit error:",
      error
    );
    return jsonResponse(
      {
        success:false,
        error:"Rate limit unavailable"
      },
      503
    );
  }
    /*
   * Prepare Lead
   */


  const safeReplyEmail =
    email.replace(
      /[^\w@.\-+]/g,
      ""
    );



  const safeName =
    escapeHTML(
      name
    );



  const safeEmail =
    escapeHTML(
      email
    );



  const safeCompany =
    escapeHTML(
      company
    );



  const safeCountry =
    escapeHTML(
      country
    );



  const safeOffering =
    escapeHTML(
      offering
    );



  const safeMarket =
    escapeHTML(
      market
    );



  const safeMessage =
    message

      ? escapeHTML(
          message
        )
        .replace(
          /\r?\n/g,
          "<br>"
        )

      : "<em>No message provided.</em>";





  const safeSubjectName =
    cleanHeaderValue(
      name
    );





  const leadId =
    createLeadId();





  const submittedAt =
    new Date()
      .toISOString();






  /*
   * Create Lead Data
   */


  const leadData = {


    id:
      leadId,


    name,

    email,

    company,

    country,

    offering,

    market,

    message,



    status:
      "new",



    statusHistory:
    [

      {

        status:
          "new",

        at:
          submittedAt

      }

    ],



    source:
      "website-contact-form",



    version:
      2,



    ip:
      clientIP,



    userAgent:
      request.headers.get(
        "User-Agent"
      ) || "",



    createdAt:
      submittedAt,



    createdTimestamp:
      Date.now(),



    updatedAt:
      submittedAt


  };









  /*
   * Save Lead To KV
   */


  try {


    await env.LEADS_KV.put(

      `lead:${leadId}`,

      JSON.stringify(
        leadData
      ),

      {

        expirationTtl:
          LEAD_TTL

      }

    );






    /*
     * Update Lead Index
     */


    const leadIndex =
      JSON.parse(

        await env.LEADS_KV.get(
          "leads:index"
        )

        ||

        "[]"

      );





    leadIndex.unshift(
      leadId
    );





    await env.LEADS_KV.put(

      "leads:index",

      JSON.stringify(

        leadIndex.slice(
          0,
          1000
        )

      ),

      {

        expirationTtl:
          LEAD_TTL

      }

    );







    /*
     * Email Lookup Index
     */


    await env.LEADS_KV.put(

      `email:${email.toLowerCase()}`,

      leadId,

      {

        expirationTtl:
          LEAD_TTL

      }

    );







  } catch(error) {


    console.error(
      "Lead storage error:",
      error
    );



    return jsonResponse(

      {

        success:false,

        error:
          "Lead storage failed"

      },

      503

    );


  }







  /*
   * Send Internal Lead Notification
   */
