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
        error: "Missing Turnstile secret"
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
  const name = formData.get("name");
  const email = formData.get("email");
  const company = formData.get("company");
  const country = formData.get("country");
  const offering = formData.get("offering");
  const market = formData.get("market");
  const message = formData.get("message");


  // Send email with Resend
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
        subject: `New inquiry from ${name}`,
        html: `
          <h2>New Contact Request</h2>

          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Country:</strong> ${country}</p>
          <p><strong>Offering:</strong> ${offering}</p>
          <p><strong>Market:</strong> ${market}</p>

          <hr>

          <p>${message}</p>
        `
      })
    }
  );


  if (!emailResponse.ok) {
    const error = await emailResponse.text();

    return new Response(
      JSON.stringify({
        success: false,
        error: error
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
