export async function onRequestPost(context) {
  const formData = await context.request.formData();

  const token = formData.get("cf-turnstile-response");

  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: "Turnstile verification missing" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const secret = context.env.TURNSTILE_SECRET_KEY;

  const verify = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        secret: secret,
        response: token
      })
    }
  );

  const result = await verify.json();

  if (!result.success) {
    return new Response(
      JSON.stringify({ success: false, message: "Verification failed" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "Message accepted"
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}
