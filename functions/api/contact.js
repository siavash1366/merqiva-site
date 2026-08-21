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
