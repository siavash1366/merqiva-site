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
headers:API_HEADERS
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









// GET RECIPIENTS

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



const campaignId =
url.searchParams.get(
"campaignId"
);



if(!campaignId){

return jsonResponse(
{
success:false,
error:"Missing campaignId"
},
400
);

}




const campaign =
await env.LEADS_KV.get(

`campaign_recipients:${campaignId}`,

{
type:"json"
}

);



return jsonResponse({

success:true,

recipients:
campaign || []

});



}
catch(error){


console.error(
error
);


return jsonResponse(
{
success:false,
error:"Failed to load recipients"
},
500
);


}


}









// SAVE RECIPIENTS

export async function onRequestPost(
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



const campaignId =
body.campaignId;



const recipients =
body.recipients || [];





if(!campaignId){

return jsonResponse(
{
success:false,
error:"Missing campaignId"
},
400
);

}





await env.LEADS_KV.put(

`campaign_recipients:${campaignId}`,

JSON.stringify(
recipients
)

);





return jsonResponse({

success:true,

campaignId,

count:
recipients.length

});



}
catch(error){


console.error(
error
);


return jsonResponse(
{
success:false,
error:"Save failed"
},
500
);


}


}









// DELETE RECIPIENTS

export async function onRequestDelete(
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



const campaignId =
body.campaignId;



if(!campaignId){

return jsonResponse(
{
success:false,
error:"Missing campaignId"
},
400
);

}





await env.LEADS_KV.delete(

`campaign_recipients:${campaignId}`

);





return jsonResponse({

success:true

});


}
catch(error){


console.error(
error
);


return jsonResponse(
{
success:false,
error:"Delete failed"
},
500
);


}


}
