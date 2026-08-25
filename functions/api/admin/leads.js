const API_HEADERS = {

  "Content-Type":
    "application/json; charset=UTF-8",

  "Cache-Control":
    "no-store",

  "X-Content-Type-Options":
    "nosniff",

  "X-Frame-Options":
    "DENY"

};




function jsonResponse(
  data,
  status = 200
){

  return new Response(

    JSON.stringify(data),

    {
      status,
      headers: API_HEADERS
    }

  );

}







async function checkSession(
  request,
  env
){

const authorization =
request.headers.get(
"Authorization"
);



if(
!authorization ||
!authorization.startsWith("Bearer ")
){

return false;

}



const sessionId =
authorization.substring(7);



const session =
await env.ADMIN_SESSIONS_KV.get(
`session:${sessionId}`
);



return !!session;


}









export async function onRequestGet(
context
){

const {
request,
env
}=context;



if(
!(await checkSession(request,env))
){

return jsonResponse(
{
success:false,
error:"Unauthorized"
},
401
);

}



try{


const url =
new URL(request.url);



const page =
Number(
url.searchParams.get("page")
) || 1;



const requestedLimit =
Number(
url.searchParams.get("limit")
) || 20;


const limit =
Math.min(
Math.max(
requestedLimit,
1
),
100
);



const search =
(
url.searchParams.get("search")
||
""
)
.toLowerCase();



const status =
url.searchParams.get("status")
||
"";





const index =
JSON.parse(

await env.LEADS_KV.get(
"leads:index"
)

||

"[]"

);





let leads=[];




for(
const leadId of index
){


const lead =
await env.LEADS_KV.get(

`lead:${leadId}`,

{
type:"json"
}

);



if(lead){

leads.push(
lead
);

}


}





if(search){


leads =
leads.filter(

lead=>{


const text =

`${lead.name || ""}
${lead.email || ""}
${lead.company || ""}
${lead.country || ""}
${lead.offering || ""}`

.toLowerCase();



return text.includes(
search
);


}

);


}






if(status){


leads =
leads.filter(

lead=>

lead.status === status

);


}





const total =
leads.length;



const start =
(page - 1) * limit;



const paginated =
leads.slice(

start,

start + limit

);





return jsonResponse({

success:true,

page,

limit,

total,

pages:
Math.ceil(
total / limit
),

leads:
paginated

});



}
catch(error){


console.error(
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









export async function onRequestPatch(
context
){

const {
request,
env
}=context;




if(
!(await checkSession(request,env))
){

return jsonResponse(
{
success:false,
error:"Unauthorized"
},
401
);

}





try{


const body =
await request.json();



const id =
body.id;



const newStatus =
body.status;



const note =
(body.note || "").trim();





if(!id){

return jsonResponse(
{
success:false,
error:"Missing lead id"
},
400
);

}





const lead =
await env.LEADS_KV.get(

`lead:${id}`,

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





const oldStatus =
lead.status || "New";





let statusChanged =
false;






/*
STATUS UPDATE
*/


if(
newStatus &&
newStatus !== oldStatus
){


lead.status =
newStatus;



lead.updatedAt =
new Date().toISOString();



statusChanged =
true;



const historyKey =
`lead_history:${id}`;





const history =
JSON.parse(

await env.LEADS_KV.get(
historyKey
)

||

"[]"

);





history.push({

date:
new Date().toISOString(),

action:
"Status changed",

from:
oldStatus,

to:
newStatus

});





await env.LEADS_KV.put(

historyKey,

JSON.stringify(
history
)

);



}







/*
INTERNAL NOTES
*/


if(note){


if(!lead.notes){

lead.notes=[];

}



lead.notes.push({

text:
note,

date:
new Date().toISOString()

});


lead.updatedAt =
new Date().toISOString();


}








await env.LEADS_KV.put(

`lead:${id}`,

JSON.stringify(
lead
)

);







return jsonResponse({

success:true,

lead,

statusChanged

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
