const HEADERS={"Content-Type":"application/json; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
async function auth(request,env){const a=request.headers.get("Authorization"); if(!a?.startsWith("Bearer ")) return false; return !!(await env.ADMIN_SESSIONS_KV.get("session:"+a.slice(7)));}

export async function onRequestGet(context){
 const {request,env}=context; if(!(await auth(request,env))) return json({success:false,error:"Unauthorized"},401);
 try{
   const oppIds=JSON.parse(await env.LEADS_KV.get("opportunities:index")||"[]");
   const opps=[];
   for(const id of oppIds){const o=await env.LEADS_KV.get("opportunity:"+id,{type:"json"}); if(o) opps.push(o);}
   const leadIds=JSON.parse(await env.LEADS_KV.get("leads:index")||"[]");
   const leads=[];
   for(const id of leadIds){const l=await env.LEADS_KV.get("lead:"+id,{type:"json"}); if(l) leads.push(l);}
   const outcomes=opps.map(o=>o.outcome).filter(Boolean);
   const q=opps.filter(o=>Number(o.opportunityScore||0)>=75);
   const won=opps.filter(o=>["Won","WON"].includes(String(o.outcome?.type||o.status)));
   const meetings=outcomes.filter(o=>o.type==="Meeting Booked").length;
   const replies=outcomes.filter(o=>["Positive Reply","Negative Reply"].includes(o.type)).length;
   const evidenceComplete=opps.filter(o=>Array.isArray(o.evidence)&&o.evidence.some(e=>e.sourceUrl||e.sourceName)).length;
   const lastSignals=opps.filter(o=>o.ingestion?.source||o.buyingSignals?.length).sort((a,b)=>Date.parse(b.updatedAt||0)-Date.parse(a.updatedAt||0)).slice(0,10);
   return json({success:true,metrics:{
     leads:leads.length,opportunities:opps.length,qualifiedOpportunities:q.length,
     outcomes:outcomes.length,replies,meetings,won:won.length,
     replyRate:outcomes.length?Math.round(replies/outcomes.length*100):0,
     meetingRate:outcomes.length?Math.round(meetings/outcomes.length*100):0,
     evidenceCoverage:opps.length?Math.round(evidenceComplete/opps.length*100):0,
     averageScore:opps.length?Math.round(opps.reduce((s,o)=>s+Number(o.opportunityScore||0),0)/opps.length):0
   },recentSignals:lastSignals.map(o=>({id:o.id,companyName:o.companyName,score:o.opportunityScore,updatedAt:o.updatedAt,whyNow:o.whyNow}))});
 }catch(error){console.error("Metrics error:",error);return json({success:false,error:"Failed to load metrics"},500);}
}
