export async function onRequestPost(context) {
  const formData = await context.request.formData();

  const token = formData.get("cf-turnstile-response");

  if (!token) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Turnstile verification missing"
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }


  const secret = context.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Server configuration error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }


  // Verify Turnstile
  const verify = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        secret,
        response: token
      })
    }
  );


  const result = await verify.json();


  if (!result.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Verification failed"
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    );
  }


  // Form data
  const name = formData.get("name") || "";
  const email = formData.get("email") || "";
  const company = formData.get("company") || "";
  const country = formData.get("country") || "";
  const offering = formData.get("offering") || "";
  const market = formData.get("market") || "";
  const message = formData.get("message") || "";


  // Validation
  function validateField(value, max) {
    return (
      typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= max
    );
  }


  if (
    !validateField(name, 100) ||
    !validateField(company, 150) ||
    !validateField(email, 200) ||
    !validateField(offering, 200) ||
    !validateField(message, 2000)
  ) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid input"
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }


  // Escape HTML for email
  function escapeHTML(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  // Check Resend key
  if (!context.env.RESEND_API_KEY) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Email service unavailable"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }


  // Send email
  const emailResponse = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${context.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Merqiva Website <noreply@merqivaintel.com>",
        to: [
          "hello@merqivaintel.com"
        ],
        reply_to: email,
        subject: `New inquiry from ${escapeHTML(name)}`,
        html: `
          <h2>New Contact Request</h2>

          <p><strong>Name:</strong> ${escapeHTML(name)}</p>
          <p><strong>Email:</strong> ${escapeHTML(email)}</p>
          <p><strong>Company:</strong> ${escapeHTML(company)}</p>
          <p><strong>Country:</strong> ${escapeHTML(country)}</p>
          <p><strong>Offering:</strong> ${escapeHTML(offering)}</p>
          <p><strong>Market:</strong> ${escapeHTML(market)}</p>

          <hr>

          <p>${escapeHTML(message)}</p>
        `
      })
    }
  );


  if (!emailResponse.ok) {

    console.error(
      "Resend error:",
      await emailResponse.text()
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: "Email delivery failed"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }


  return new Response(
    JSON.stringify({
      success: true,
      message: "Message sent successfully"
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
