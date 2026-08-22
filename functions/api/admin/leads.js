const API_HEADERS = {

  "Content-Type":
    "application/json; charset=UTF-8",

  "Cache-Control":
    "no-store, max-age=0",

  "X-Content-Type-Options":
    "nosniff",

  "X-Frame-Options":
    "DENY"

};



function jsonResponse(
  data,
  status = 200
) {

  return new Response(

    JSON.stringify(data),

    {
      status,

      headers:
        API_HEADERS
    }

  );

}





export async function onRequestGet(
  context
) {


  const {
    request,
    env
  } = context;



  /*
   * Session Authentication
   */


  const authorization =
    request.headers.get(
      "Authorization"
    );



  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {

    return jsonResponse(

      {
        success:false,
        error:"Unauthorized"
      },

      401

    );

  }




  const sessionId =
    authorization.substring(7);




  if (
    !env.ADMIN_SESSIONS_KV ||
    typeof env.ADMIN_SESSIONS_KV.get !== "function"
  ) {

    console.error(
      "ADMIN_SESSIONS_KV missing"
    );


    return jsonResponse(

      {
        success:false,
        error:"Session storage unavailable"
      },

      500

    );

  }

  const session =
    await env.ADMIN_SESSIONS_KV.get(
      `session:${sessionId}`
    );

  if (!session) {

    return jsonResponse(

      {
        success:false,
        error:"Session expired"
      },

      401

    );

  }







  /*
   * Leads KV Check
   */


  if (

    !env.LEADS_KV ||

    typeof env.LEADS_KV.get !== "function"

  ) {


    console.error(
      "LEADS_KV missing"
    );


    return jsonResponse(

      {
        success:false,
        error:"Lead storage unavailable"
      },

      500

    );

  }







  try {


    /*
     * Read Lead Index
     */


    const index =
      JSON.parse(

        await env.LEADS_KV.get(
          "leads:index"
        )

        ||

        "[]"

      );





    const leads = [];





    for (
      const leadId of index
    ) {


      const lead =
        await env.LEADS_KV.get(

          `lead:${leadId}`,

          {
            type:"json"
          }

        );



      if (lead) {

        leads.push(
          lead
        );

      }


    }







    return jsonResponse(

      {

        success:true,

        count:
          leads.length,

        leads

      },

      200

    );





  } catch(error) {


    console.error(
      "Admin leads error:",
      error
    );



    return jsonResponse(

      {
        success:false,
        error:"Failed to load leads"
      },

      500

    );


  }


}
export async function onRequestPatch(context){

const {
 request,
 env
}=context;



const authorization =
request.headers.get("Authorization");


if(
!authorization ||
!authorization.startsWith("Bearer ")
){

return jsonResponse(
{
success:false,
error:"Unauthorized"
},
401
);

}



const sessionId =
authorization.replace(
"Bearer ",
""
);



const session =
await env.ADMIN_SESSIONS_KV.get(
`session:${sessionId}`
);



if(!session){

return jsonResponse(
{
success:false,
error:"Session expired"
},
401
);

}



try{


const body =
await request.json();



const leadId =
body.id;



const status =
body.status;



if(
!leadId ||
!status
){

return jsonResponse(
{
success:false,
error:"Missing data"
},
400
);

}



const lead =
await env.LEADS_KV.get(
`lead:${leadId}`,
{
type:"json"
}
);



if(!lead){

return jsonResponse(
{
success:false,
error:"Lead not found"
},
404
);

}



lead.status=status;

lead.updatedAt =
new Date().toISOString();



await env.LEADS_KV.put(

`lead:${leadId}`,

JSON.stringify(lead)

);
return jsonResponse({
success:true,
lead
});
}
catch(error){
console.error(
"Update lead error:",
error
);
return jsonResponse(
{
success:false,
error:"Update failed"
},
500
);
}
}
