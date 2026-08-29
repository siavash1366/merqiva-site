const HEADERS={"Content-Type":"application/json; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
async function auth(request,env){const a=request.headers.get("Authorization"); if(!a?.startsWith("Bearer ")) return false; return !!(await env.ADMIN_SESSIONS_KV.get("session:"+a.slice(7)));}

export async function onRequestPost(context){
 const {request,env}=context; if(!(await auth(request,env))) return json({success:false,error:"Unauthorized"},401);
 try{
  const b=await request.json(), id=String(b.opportunityId||"").trim();
  if(!id) return json({success:false,error:"opportunityId required"},400);
  const o=await env.LEADS_KV.get("opportunity:"+id,{type:"json"}); if(!o) return json({success:false,error:"Opportunity not found"},404);
  const claim={id:"CLM"+Date.now(),opportunityId:id,reason:String(b.reason||"").trim().slice(0,2500),status:"REVIEW",createdAt:new Date().toISOString(),requestedRemedy:"REPLACE"};
  await env.LEADS_KV.put("guarantee:claim:"+claim.id,JSON.stringify(claim));
  const idx=JSON.parse(await env.LEADS_KV.get("guarantee:claims:index")||"[]"); idx.push(claim.id); await env.LEADS_KV.put("guarantee:claims:index",JSON.stringify(idx.slice(-200)));
  return json({success:true,claim},201);
 }catch(error){console.error("Guarantee claim error:",error);return json({success:false,error:"Failed to create claim"},500);}
}

export async function onRequestGet(context){
 const {request,env}=context; if(!(await auth(request,env))) return json({success:false,error:"Unauthorized"},401);
 const idx=JSON.parse(await env.LEADS_KV.get("guarantee:claims:index")||"[]"); const claims=[];
 for(const id of [...idx].reverse().slice(0,50)){const c=await env.LEADS_KV.get("guarantee:claim:"+id,{type:"json"});if(c)claims.push(c);}
 return json({success:true,claims});
}
