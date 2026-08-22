const API_HEADERS = {

"Content-Type":
"application/json; charset=UTF-8",

"Cache-Control":
"no-store",

"X-Content-Type-Options":
"nosniff"

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






async function checkSession(
request,
env
){

const auth =
request.headers.get(
"Authorization"
);



if(
!auth ||
!auth.startsWith("Bearer ")
){

return false;

}



const sessionId =
auth.substring(7);



const session =
await env.ADMIN_SESSIONS_KV.get(
`session:${sessionId}`
);



return !!session;

}









// GET NOTES

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
error:"Missing lead id"
},
400
);

}



const notes =
JSON.parse(

await env.LEADS_KV.get(
`lead_notes:${id}`
)

||

"[]"

);



return jsonResponse({

success:true,

notes

});


}









// CREATE NOTE


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




const body =
await request.json();



const id =
body.id;



const text =
body.note;



if(
!id ||
!text
){

return jsonResponse(
{
success:false,
error:"Missing data"
},
400
);

}





const notes =
JSON.parse(

await env.LEADS_KV.get(
`lead_notes:${id}`
)

||

"[]"

);





notes.push({

text,

date:
new Date().toISOString()

});





await env.LEADS_KV.put(

`lead_notes:${id}`,

JSON.stringify(notes)

);






return jsonResponse({

success:true,

notes

});


}
