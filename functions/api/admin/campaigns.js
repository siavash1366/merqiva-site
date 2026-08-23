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

      headers:
        API_HEADERS
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









// =======================
// GET CAMPAIGNS
// =======================


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


const index =
JSON.parse(

await env.LEADS_KV.get(
"campaigns:index"
)

||

"[]"

);





const campaigns=[];



for(
const id of index
){


const campaign =
await env.LEADS_KV.get(

`campaign:${id}`,

{
type:"json"
}

);



if(campaign){

campaigns.push(
campaign
);

}


}




return jsonResponse({

success:true,

count:
campaigns.length,

campaigns

});




}
catch(error){


console.error(
"Campaign GET error:",
error
);



return jsonResponse(

{
success:false,
error:"Failed to load campaigns"
},

500

);


}



}









// =======================
// CREATE CAMPAIGN
// =======================


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




if(
!body.name ||
!body.subject ||
!body.body
){

return jsonResponse(

{
success:false,
error:"Missing campaign data"
},

400

);

}




const id =

"CMP" +

Date.now();






const campaign = {


id,


name:
body.name,


subject:
body.subject,


body.body,


status:
"Draft",


createdAt:
new Date()
.toISOString()


};







await env.LEADS_KV.put(

`campaign:${id}`,

JSON.stringify(
campaign
)

);







const index =
JSON.parse(

await env.LEADS_KV.get(
"campaigns:index"
)

||

"[]"

);





index.push(id);





await env.LEADS_KV.put(

"campaigns:index",

JSON.stringify(
index
)

);






return jsonResponse({

success:true,

campaign

});




}
catch(error){


console.error(
"Campaign CREATE error:",
error
);



return jsonResponse(

{
success:false,
error:"Create failed"
},

500

);


}



}









// =======================
// DELETE CAMPAIGN
// =======================


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



const id =
body.id;



if(!id){

return jsonResponse(

{
success:false,
error:"Missing id"
},

400

);

}






await env.LEADS_KV.delete(

`campaign:${id}`

);







let index =
JSON.parse(

await env.LEADS_KV.get(
"campaigns:index"
)

||

"[]"

);






index =
index.filter(

item=>
item !== id

);






await env.LEADS_KV.put(

"campaigns:index",

JSON.stringify(
index
)

);






return jsonResponse({

success:true

});




}
catch(error){


console.error(
"Campaign DELETE error:",
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
