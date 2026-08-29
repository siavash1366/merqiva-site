const HEADERS={"Content-Type":"application/json; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const clean=(v,n=2000)=>String(v??"").trim().slice(0,n);
async function auth(request,env){const a=request.headers.get("Authorization"); if(!a?.startsWith("Bearer ")) return false; return !!(await env.ADMIN_SESSIONS_KV.get("session:"+a.slice(7)));}

export async function onRequestPatch(context){
  const {request,env}=context;
  if(!(await auth(request,env))) return json({success:false,error:"Unauthorized"},401);
  try{
    const body=await request.json();
    const id=clean(body.id,160), type=clean(body.type,80);
    const allowed=["Positive Reply","Negative Reply","Meeting Booked","Qualified Opportunity","Proposal Sent","Won","Lost","Disqualified","No Response"];
    if(!id||!allowed.includes(type)) return json({success:false,error:"Valid id and outcome type are required"},400);
    const item=await env.LEADS_KV.get("opportunity:"+id,{type:"json"});
    if(!item) return json({success:false,error:"Opportunity not found"},404);
    const previous=item.outcome||null;
    const outcome={type,reason:clean(body.reason,1000),notes:clean(body.notes,2500),recordedAt:new Date().toISOString(),source:"CRM_USER",previousType:previous?.type||null};
    item.outcome=outcome; item.updatedAt=new Date().toISOString();
    item.status=["Won","Lost","Disqualified"].includes(type)?type:("Positive Reply"===type||"Meeting Booked"===type||"Qualified Opportunity"===type||"Proposal Sent"===type?"In Progress":(item.status||"New"));
    const history=JSON.parse(await env.LEADS_KV.get("opportunity_history:"+id)||"[]");
    history.push({at:outcome.recordedAt,action:"Outcome recorded",from:previous?.type||"NONE",to:type,reason:outcome.reason,notes:outcome.notes});
    await env.LEADS_KV.put("opportunity_history:"+id,JSON.stringify(history.slice(-100)));
    await env.LEADS_KV.put("opportunity:"+id,JSON.stringify(item));
    return json({success:true,opportunity:item});
  }catch(error){console.error("Outcome update error:",error);return json({success:false,error:"Outcome update failed"},500);}
}
