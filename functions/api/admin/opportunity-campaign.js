const HEADERS={"Content-Type":"application/json; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"};
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:HEADERS});
async function auth(request,env){const a=request.headers.get("Authorization");return !!(a?.startsWith("Bearer ")&&await env.ADMIN_SESSIONS_KV.get("session:"+a.slice(7)));}
const clean=(v,n=3000)=>String(v??"").trim().slice(0,n);
export async function onRequestPost({request,env}){
 if(!(await auth(request,env)))return json({success:false,error:"Unauthorized"},401);
 try{
  const b=await request.json(), id=clean(b.opportunityId,160);
  if(!id)return json({success:false,error:"opportunityId is required"},400);
  const o=await env.LEADS_KV.get("opportunity:"+id,{type:"json"});
  if(!o)return json({success:false,error:"Opportunity not found"},404);
  const dm=o.decisionMaker||{};
  const email=clean(b.email||dm.email,320).toLowerCase();
  if(!email||!/^\S+@\S+\.\S+$/.test(email))return json({success:false,error:"A verified decision-maker email is required"},400);
  if(o.campaignId)return json({success:false,error:"Opportunity already linked to a campaign",campaignId:o.campaignId},409);
  const action=await env.LEADS_KV.get("opportunity_action:"+id,{type:"json"});
  const company=clean(o.companyName,240), product=clean(o.productName,240);
  const subject=clean(b.subject||action?.email?.subject||("Relevant opportunity for "+company),180);
  const body=clean(b.body||action?.email?.body||("Hello,\n\nWe identified a recent signal relevant to "+company+" and "+product+". We thought it may be useful to connect and understand whether this is currently a priority for your team.\n\nWould a brief conversation be appropriate?\n\nBest regards"),6000);
  const campaignId="C"+Date.now(), now=new Date().toISOString();
  const campaign={id:campaignId,name:clean(b.name||("Opportunity Outreach — "+company),180),subject,body,status:"Draft",createdAt:now,updatedAt:now,source:"OPPORTUNITY",opportunityId:id};
  await env.LEADS_KV.put("campaign:"+campaignId,JSON.stringify(campaign));
  await env.LEADS_KV.put("campaign_recipients:"+campaignId,JSON.stringify([id]));
  const idx=JSON.parse(await env.LEADS_KV.get("campaigns:index")||"[]"); if(!idx.includes(campaignId))idx.push(campaignId); await env.LEADS_KV.put("campaigns:index",JSON.stringify(idx.slice(-1000)));
  o.campaignId=campaignId;o.campaignStatus="Draft";o.updatedAt=now;
  await env.LEADS_KV.put("opportunity:"+id,JSON.stringify(o));
  return json({success:true,campaign,opportunity:o,recipientCount:1},201);
 }catch(e){console.error("Opportunity campaign error",e);return json({success:false,error:"Failed to create campaign from opportunity"},500);}
}