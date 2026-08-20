
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_TTL = 600;
const MAX_BODY_BYTES = 32 * 1024;

const EXPECTED_TURNSTILE_ACTION = "contact";

const ALLOWED_TURNSTILE_HOSTNAMES = new Set([
  "merqivaintel.com",
  "www.merqivaintel.com"
]);


const API_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Strict-Transport-Security":
    "max-age=31536000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "X-Robots-Tag":
    "noindex, nofollow, nosnippet"
};


function jsonResponse(data, status = 200, extraHeaders = {}) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...API_HEADERS,
        ...extraHeaders
      }
    }
  );

}


function normalizeField(value) {

  return typeof value === "string"
    ? value.trim()
    : "";

}


function validateRequired(value, maxLength) {

  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength
  );

}


function validateOptional(value, maxLength) {

  return (
    typeof value === "string" &&
    value.length <= maxLength
  );

}


function validateEmail(value) {

  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 200
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

}


function escapeHTML(value = "") {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function cleanHeaderValue(value = "") {

  return String(value)
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 120);

}


export async function onRequestPost(context) {

  const { request, env } = context;


  const contentLength =
    Number(request.headers.get("Content-Length") || "0");


  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_BODY_BYTES
  ) {

    return jsonResponse(
      {
        success: false,
        error: "Request too large"
      },
      413
    );

  }


  const contentType =
    request.headers.get("Content-Type") || "";


  const validContentType =
    contentType.includes("multipart/form-data") ||
    contentType.includes(
      "application/x-www-form-urlencoded"
    );


  if (!validContentType) {

    return jsonResponse(
      {
        success: false,
        error: "Unsupported request format"
      },
      415
    );

  }


  let formData;


  try {

    formData =
      await request.formData();

  } catch (error) {

    console.error(
      "Form parsing error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error: "Invalid form data"
      },
      400
    );

  }



  /*
   * 4. Honeypot
   */
  const honeypot =
    normalizeField(
      formData.get("website")
    );


  if (honeypot) {

    return jsonResponse(
      {
        success: true,
        message: "Message sent successfully"
      },
      200
    );

  }


  /*
   * 5. Check server configuration
   */
  if (
    !env.TURNSTILE_SECRET_KEY ||
    !env.RESEND_API_KEY ||
    !env.CONTACT_LIMIT
  ) {

    console.error(
      "Missing required environment configuration"
    );

    return jsonResponse(
      {
        success: false,
        error: "Server configuration error"
      },
      500
    );

  }


  /*
   * 6. Turnstile token
   */
  const token =
    normalizeField(
      formData.get("cf-turnstile-response")
    );


  if (!token) {

    return jsonResponse(
      {
        success: false,
        error: "Turnstile verification missing"
      },
      400
    );

  }


  if (token.length > 2048) {

    return jsonResponse(
      {
        success: false,
        error: "Invalid verification token"
      },
      400
    );

  }


  /*
   * 7. Get visitor IP
   */
  const ip =
    request.headers.get("CF-Connecting-IP") || "";


  /*
   * 8. Verify Turnstile
   */
  const turnstileBody =
    new URLSearchParams({
      secret:
        env.TURNSTILE_SECRET_KEY,

      response:
        token
    });


  if (ip) {

    turnstileBody.set(
      "remoteip",
      ip
    );

  }


  const turnstileController =
    new AbortController();


  const turnstileTimeout =
    setTimeout(
      () => turnstileController.abort(),
      8000
    );


  let verifyResponse;


  try {

    verifyResponse =
      await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },

          body:
            turnstileBody,

          signal:
            turnstileController.signal
        }
      );


  } catch (error) {

    console.error(
      "Turnstile request error:",
      
      error
    );


    return jsonResponse(
      {
        success: false,
        error: "Verification service unavailable"
      },
      503
    );


  } finally {

    clearTimeout(
      turnstileTimeout
    );

  }


  if (!verifyResponse.ok) {

    console.error(
      "Turnstile HTTP error:",
      verifyResponse.status
    );


    return jsonResponse(
      {
        success: false,
        error: "Verification service unavailable"
      },
      503
    );

  }


  let turnstileResult;


  try {

    turnstileResult =
      await verifyResponse.json();


  } catch (error) {

    console.error(
      "Turnstile response parsing error:",
      error
    );


    return jsonResponse(
      {
        success: false,
        error: "Verification service unavailable"
      },
      503
    );

  }


  /*
   * 9. Validate Turnstile result
   */
  if (!turnstileResult.success) {

    console.warn(
      "Turnstile verification failed:",
      turnstileResult["error-codes"] || []
    );


    return jsonResponse(
      {
        success: false,
        error: "Verification failed"
      },
      403
    );

  }


  if (
    turnstileResult.action !==
    EXPECTED_TURNSTILE_ACTION
  ) {

    console.warn(
      "Turnstile action mismatch:",
      turnstileResult.action
    );


    return jsonResponse(
      {
        success: false,
        error: "Verification failed"
      },
      403
    );

  }


  if (
    !ALLOWED_TURNSTILE_HOSTNAMES.has(
      turnstileResult.hostname
    )
  ) {

    console.warn(
      "Turnstile hostname mismatch:",
      turnstileResult.hostname
    );


    return jsonResponse(
      {
        success: false,
        error: "Verification failed"
      },
      403
    );

  }


  /*
   * 10. Rate Limit
   */
  const rateLimitKey =
    `contact:${ip || "unknown"}`;


  let currentCount = 0;


  try {

    const storedValue =
      await env.CONTACT_LIMIT.get(
        rateLimitKey
      );


    const parsed =
      Number.parseInt(
        storedValue || "0",
        10
      );


    currentCount =
      Number.isFinite(parsed)
        ? parsed
        : 0;


    if (currentCount >= RATE_LIMIT_MAX) {

      return jsonResponse(
        {
          success: false,
          error:
            "Too many requests. Please wait 10 minutes before submitting another inquiry."
        },
        429,
        {
          "Retry-After":
            String(RATE_LIMIT_TTL)
        }
      );

    }


    await env.CONTACT_LIMIT.put(
      rateLimitKey,
      String(currentCount + 1),
      {
        expirationTtl:
          RATE_LIMIT_TTL
      }
    );


  } catch (error) {

    console.error(
      "Rate limit storage error:",
      error
    );


    return jsonResponse(
      {
        success: false,
        error: "Service temporarily unavailable"
      },
      503
    );

  }

  /*
   * 11. Normalize form fields
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
   * 12. Server-side validation
   */
  if (
    !validateRequired(name, 100) ||
    !validateRequired(company, 150) ||
    !validateRequired(offering, 200) ||
    !validateEmail(email) ||
    !validateOptional(country, 100) ||
    !validateOptional(market, 100) ||
    !validateOptional(message, 2000)
  ) {

    return jsonResponse(
      {
        success: false,
        error: "Invalid input"
      },
      400
    );

  }


  /*
   * 13. Prepare safe email content
   */
  const safeName =
    escapeHTML(name);

  const safeEmail =
    escapeHTML(email);

  const safeCompany =
    escapeHTML(company);

  const safeCountry =
    escapeHTML(country);

  const safeOffering =
    escapeHTML(offering);

  const safeMarket =
    escapeHTML(market);

  const safeMessage =
    message
      ? escapeHTML(message)
          .replace(
            /\r?\n/g,
            "<br>"
          )
      : "<em>No message provided.</em>";


  const safeSubjectName =
    cleanHeaderValue(name);


  const safeReplyEmail =
    email.replace(
      /[^\w@.\-+]/g,
      ""
    );
/*
 * 14. Send email with Resend
 */

const resendController =
  new AbortController();


const resendTimeout =
  setTimeout(
    () => resendController.abort(),
    12000
  );


let emailResponse;


try {

  emailResponse =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${env.RESEND_API_KEY}`,

          "Content-Type":
            "application/json"
        },


        body:
          JSON.stringify({

            from:
              "Merqiva Website <hello@merqivaintel.com>",


            to:
            [
              "hello@merqivaintel.com",
              "kimforex28@gmail.com"
            ],


            reply_to:
              safeReplyEmail,


            subject:
              `New Contact Request from ${safeSubjectName}`,


            html:
            `
            <div style="
              font-family: Arial, Helvetica, sans-serif;
              max-width:700px;
              margin:0 auto;
              color:#222;
              line-height:1.6;
            ">


              <div style="
                background:#0b1220;
                padding:24px;
                color:white;
                border-radius:8px 8px 0 0;
              ">

                <h2 style="margin:0;">
                  New Website Lead
                </h2>

                <p style="
                  margin:8px 0 0;
                  color:#cbd5e1;
                ">
                  New contact request received from Merqiva website
                </p>

              </div>



              <div style="
                border:1px solid #e5e7eb;
                border-top:none;
                padding:24px;
                border-radius:0 0 8px 8px;
              ">


                <h3>
                  Contact Information
                </h3>


                <table width="100%" cellpadding="8">

                  <tr>
                    <td>
                      <strong>Name</strong>
                    </td>
                    <td>
                      ${safeName}
                    </td>
                  </tr>


                  <tr>
                    <td>
                      <strong>Email</strong>
                    </td>
                    <td>
                      ${safeEmail}
                    </td>
                  </tr>


                  <tr>
                    <td>
                      <strong>Company</strong>
                    </td>
                    <td>
                      ${safeCompany}
                    </td>
                  </tr>


                  <tr>
                    <td>
                      <strong>Country</strong>
                    </td>
                    <td>
                      ${safeCountry}
                    </td>
                  </tr>

                </table>



                <h3>
                  Business Information
                </h3>


                <table width="100%" cellpadding="8">

                  <tr>
                    <td>
                      <strong>Offering</strong>
                    </td>
                    <td>
                      ${safeOffering}
                    </td>
                  </tr>


                  <tr>
                    <td>
                      <strong>Target Market</strong>
                    </td>
                    <td>
                      ${safeMarket}
                    </td>
                  </tr>

                </table>



                <h3>
                  Message
                </h3>


                <div style="
                  background:#f8fafc;
                  padding:16px;
                  border-radius:6px;
                ">

                  ${safeMessage}

                </div>



                <div style="
                  margin-top:30px;
                  text-align:center;
                ">

                  <a href="mailto:${safeReplyEmail}"
                  style="
                    display:inline-block;
                    background:#0b1220;
                    color:white;
                    padding:12px 24px;
                    text-decoration:none;
                    border-radius:6px;
                    font-weight:bold;
                  ">

                    Reply To Customer

                  </a>

                </div>



                <hr style="
                  margin:24px 0;
                  border:none;
                  border-top:1px solid #e5e7eb;
                ">



                <p style="
                  font-size:12px;
                  color:#64748b;
                ">

                  This lead was submitted through merqivaintel.com contact form.

                </p>


              </div>


            </div>
            `
          }),


        signal:
          resendController.signal
      }
    );


} catch (error) {

  console.error(
    "Resend request error:",
    error
  );


  return jsonResponse(
    {
      success:false,
      error:"Email service unavailable"
    },
    503
  );


} finally {

  clearTimeout(
    resendTimeout
  );

}



/*
 * 15. Handle Resend errors
 */

if (!emailResponse.ok) {

  let resendError = "";


  try {

    resendError =
      await emailResponse.text();


  } catch (error) {

    console.error(
      "Failed reading Resend error:",
      error
    );

  }


  console.error(
    "Resend error:",
    emailResponse.status,
    resendError.slice(0,500)
  );


  return jsonResponse(
    {
      success:false,
      error:
        resendError ||
        "Email delivery failed"
    },
    502
  );

}



/*
 * 16. Success
 */

return jsonResponse(
  {
    success:true,
    message:"Message sent successfully"
  },
  200
);

}
