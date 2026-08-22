const API_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};


function jsonResponse(data, status = 200) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: API_HEADERS
    }
  );

}



export async function onRequestPost(context) {

  const {
    request,
    env
  } = context;



  try {


    if (
      !env.ADMIN_SESSIONS_KV ||
      typeof env.ADMIN_SESSIONS_KV.put !== "function"
    ) {

      return jsonResponse(
        {
          success:false,
          error:"Session storage unavailable"
        },
        500
      );

    }



    const body =
      await request.json();



    const token =
      body.token;



    if (
      !token ||
      token !== env.ADMIN_TOKEN
    ) {

      return jsonResponse(
        {
          success:false,
          error:"Invalid credentials"
        },
        401
      );

    }



    const sessionId =
      crypto.randomUUID();



    await env.ADMIN_SESSIONS_KV.put(
const check =
  await env.ADMIN_SESSIONS_KV.get(
    `session:${sessionId}`
  );

console.log("SESSION CHECK:", check);
      `session:${sessionId}`,

      JSON.stringify({

        createdAt:
          new Date().toISOString()

      }),

      {
        expirationTtl:
          60 * 60 * 8
      }
    );

    return jsonResponse(
      {
        success:true,
        session:
          sessionId
      },
      200
    );
  }
  catch(error) {
    console.error(
      "Admin login error:",
      error
    );
    return jsonResponse(
      {
        success:false,

        error:"Login failed"

      },

      500

    );


  }

}
