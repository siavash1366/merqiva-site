const API_HEADERS = {

"Content-Type":
"application/json; charset=UTF-8",

"Cache-Control":
"no-store"

};



function jsonResponse(
data,
status=200
){

return new Response(

JSON.stringify(data),

{
status,
headers:API_HEADERS
}

);

}





export async function onRequestGet(
context
){

const {
request,
env
}=context;



const authorization =
request.headers.get(
"Authorization"
);



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
authorization.substring(7);



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




const url =
new URL(request.url);



const id =
url.searchParams.get(
"id"
);



if(!id){

return jsonResponse(
{
success:false,
error:"Missing id"
},
400
);

}




const history =
JSON.parse(

await env.LEADS_KV.get(

`lead_history:${id}`

)

||

"[]"

);




return jsonResponse({

success:true,

history

});


}
