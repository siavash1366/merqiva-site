import { deriveRecommendedAction, deriveSalesAngle } from "../lib/opportunity-core.js";

const HEADERS = {"Content-Type":"application/json; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});

async function auth(request,env){
  const a=request.headers.get("Authorization");
  if(!a?.startsWith("Bearer ")) return false;
  return !!(await env.ADMIN_SESSIONS_KV.get("session:"+a.slice(7)));
}
const clean=(v,n=4000)=>String(v??"").trim().slice(0,n);

function buildAction(item){
  const dm=item.decisionMaker||{};
  const score=Number(item.opportunityScore||0);
  const whyNow=clean(item.whyNow||"");
  const role=clean(dm.role||"UNKNOWN",180);
  const company=clean(item.companyName||"the account",240);
  const product=clean(item.productName||"your offering",240);
  const action=deriveRecommendedAction({
    opportunityScore:score,
    whyNowConfidence:item.whyNowConfidence,
    decisionMakerConfidence:Number(item.decisionMakerConfidence||dm.confidence||0),
    decisionMakerVerificationStatus:dm.verificationStatus||item.decisionMakerVerificationStatus,
    evidence:item.evidence||[]
  }) || "Review evidence and qualify before outreach.";
  const salesAngle=deriveSalesAngle({
    productName:product,
    decisionMakerRole:role,
    decisionMakerVerificationStatus:dm.verificationStatus||item.decisionMakerVerificationStatus,
    opportunityScore:score,
    whyNowConfidence:item.whyNowConfidence,
    evidence:item.evidence||[]
  }) || "Lead with the verified business trigger and product relevance.";

  const verifiedFacts=(item.evidence||[]).filter(e=>e.evidenceLevel==="VERIFIED FACT").map(e=>e.summary||e.title).filter(Boolean).slice(0,3);
  const evidenceLead=verifiedFacts.length?verifiedFacts.join(" "):whyNow;
  const greeting=role==="UNKNOWN"?"Hello,":"Hello "+role+",";
  const subject="Relevant opportunity for "+company;
  const email=[greeting,"","We noticed "+evidenceLead,"","Given "+company+"'s apparent relevance to "+product+", I thought it may be useful to connect and understand whether this is currently on your team's radar.","","Would a brief conversation next week be appropriate?","","Best regards"].join("\\n");
  const linkedin=[
    greeting,
    "I’m reaching out because of a recent, publicly reported development relevant to "+company+".",
    "We support maritime teams with "+product+" and thought the timing may be relevant.",
    "Open to a short conversation?"
  ].join(" ");
  const follow1="Following up on my note about the recent opportunity signal relevant to "+company+". Happy to share the specific evidence and discuss fit.";
  const follow2="Last follow-up from me. If "+product+" is not a current priority, I’m happy to close the loop.";

  return {
    recommendedAction:action,
    recommendedPerson:role,
    recommendedChannel:dm.email?"Email":"Email / LinkedIn",
    salesAngle,
    whatNotToMention:[
      "Do not claim an unverified procurement project.",
      "Do not present AI inference as a verified fact.",
      "Do not imply guaranteed savings, contracts or revenue."
    ],
    timing:item.signalRecency>=70||item.timingUrgency>=70?"Within 7 days":"After qualification / within 14 days",
    email:{subject,body:email},
    linkedinMessage:linkedin,
    followUps:[follow1,follow2]
  };
}

export async function onRequestGet(context){
  const {request,env}=context;
  if(!(await auth(request,env))) return json({success:false,error:"Unauthorized"},401);
  const id=new URL(request.url).searchParams.get("id");
  if(!id) return json({success:false,error:"Missing id"},400);
  const item=await env.LEADS_KV.get("opportunity:"+id,{type:"json"});
  if(!item) return json({success:false,error:"Opportunity not found"},404);
  return json({success:true,id,actionPack:buildAction(item)});
}
