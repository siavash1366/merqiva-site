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
   * Admin Authentication
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

        error:
          "Lead storage unavailable"

      },

      500

    );


  }








  try {


    /*
     * Read Index
     */


    const index =
      JSON.parse(

        await env.LEADS_KV.get(
          "leads:index"
        )

        ||

        "[]"

      );






    const leads =
      [];






    for (
      const leadId of index
    ) {


      const lead =
        await env.LEADS_KV.get(

          `lead:${leadId}`,

          {
            type:
              "json"
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

        error:
          "Failed to load leads"

      },

      500

    );


  }


}
