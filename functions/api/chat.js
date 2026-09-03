const HEADERS={"Content-Type":"application/json; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const clean=(value,max)=>String(value==null?"":value).trim().slice(0,max);
const LEAD_TTL=31536000;
function leadId(){return "CHAT"+Date.now().toString(36).toUpperCase()}

function baseReply(message){
  const q=message.toLowerCase();
  if(q.includes("price")||q.includes("cost")||q.includes("pricing")){
    return "Merqiva’s current founding-customer offer is $299/month for 30 researched GCC maritime opportunities delivered monthly. Before subscribing, you can request 3 verified opportunities for your exact product and target market.";
  }
  if(q.includes("guarantee")||q.includes("verify")||q.includes("evidence")||q.includes("fact")||q.includes("inference")){
    return "Merqiva evaluates company fit, product fit, fleet context, decision makers, buying signals and Why Now. Material claims are designed to be separated into verified facts, analytical inferences and unknowns, with source context and freshness checked where available.";
  }
  if(q.includes("uae")||q.includes("dubai")||q.includes("fujairah")||q.includes("abu dhabi")||q.includes("sharjah")){
    return "UAE is Merqiva’s first validation market. Tell me what equipment or maritime service you sell and, if relevant, which vessel/operator types usually buy it. That gives the team enough context to research a product-specific sample.";
  }
  if(q.includes("saudi")||q.includes("jeddah")||q.includes("dammam")||q.includes("jubail")){
    return "Saudi Arabia is a priority GCC market for Merqiva. Tell me what you sell and who normally buys it, and the team can evaluate a Saudi-specific opportunity sample around your product.";
  }
  if(q.includes("navcom")||q.includes("gmdss")||q.includes("marine electronics")){
    return "NAVCOM, GMDSS and marine electronics are an initial Merqiva beachhead because vessel fit, new-vessel activity, retrofit/compliance context and technical/procurement buyer research can materially improve prioritization. Tell me your exact product and target GCC market.";
  }
  if(q.includes("safety")||q.includes("compliance")){
    return "For marine safety and compliance equipment, Merqiva looks for relevant fleet context, observable timing signals, evidence quality and the likely procurement/technical buyer path. Tell me your exact product and target GCC market.";
  }
  if(q.includes("offshore")){
    return "For offshore equipment and technical services, Merqiva can research relevant operators/support fleets, current commercial or maintenance-related signals, buyer functions and Why Now. Tell me what you sell and which GCC market matters.";
  }
  if(q.includes("how")||q.includes("work")){
    return "Merqiva starts with what you sell, then researches relevant GCC accounts, fleet/operating context, current signals and buyer roles. The goal is an evidence-backed opportunity brief explaining fit, Why Now and the next sales action.";
  }
  if(q.includes("free")||q.includes("sample")||q.includes("3 verified")||q.includes("three verified")){
    return "You can request 3 verified opportunities for your exact product. Tell us what you sell, which GCC market you want to target, and who normally buys the product or service if you know.";
  }
  if(q.includes("sales")||q.includes("contact")||q.includes("email")){
    return "You can contact sales@merqivaintel.com or leave your work email here for follow-up. For the fastest qualification, include what you sell and your target GCC market.";
  }
  return "To qualify a useful Merqiva sample, start with two things: what do you sell, and which GCC market do you want to target? If you know the usual vessel type or buyer role, include that too.";
}

async function auth(request,env){
  const value=request.headers.get("Authorization")||"";
  if(!value.startsWith("Bearer "))return false;
  return Boolean(await env.ADMIN_SESSIONS_KV.get("session:"+value.slice(7)));
}

export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const id=clean(url.searchParams.get("conversation"),100);
  if(id){
    if(!(await auth(request,env)))return json({success:false,error:"Unauthorized"},401);
    return json({success:true,messages:JSON.parse(await env.LEADS_KV.get("chat:"+id)||"[]")});
  }
  if(!(await auth(request,env)))return json({success:false,error:"Unauthorized"},401);
  const ids=JSON.parse(await env.LEADS_KV.get("chats:index")||"[]");
  const conversations=[];
  for(const conversationId of ids.slice(0,200)){
    const messages=JSON.parse(await env.LEADS_KV.get("chat:"+conversationId)||"[]");
    if(messages.length)conversations.push({conversationId,lastMessage:messages[messages.length-1],messageCount:messages.length});
  }
  return json({success:true,conversations});
}

export async function onRequestPost({request,env}){
  try{
    const body=await request.json();
    const id=clean(body.conversationId,100)||crypto.randomUUID();
    const message=clean(body.message,2000);
    const name=clean(body.name,100);
    const email=clean(body.email,200);
    if(!message)return json({success:false,error:"Message is required"},400);
    if(email&&!/^\S+@\S+\.\S+$/.test(email))return json({success:false,error:"Invalid email"},400);

    const history=JSON.parse(await env.LEADS_KV.get("chat:"+id)||"[]");
    history.push({role:"user",message,at:new Date().toISOString()});
    const reply=baseReply(message);
    history.push({role:"bot",message:reply,at:new Date().toISOString()});
    await env.LEADS_KV.put("chat:"+id,JSON.stringify(history.slice(-30)),{expirationTtl:604800});

    const ids=JSON.parse(await env.LEADS_KV.get("chats:index")||"[]");
    if(!ids.includes(id))ids.unshift(id);
    await env.LEADS_KV.put("chats:index",JSON.stringify(ids.slice(0,2000)),{expirationTtl:LEAD_TTL});

    let leadCaptured=false;
    if(email){
      const emailKey="email:"+email.toLowerCase();
      const existingId=await env.LEADS_KV.get(emailKey);
      if(existingId){
        const lead=await env.LEADS_KV.get("lead:"+existingId,{type:"json"});
        if(lead){
          if(name)lead.name=name;
          lead.message=("Chat inquiry: "+message).slice(0,2000);
          lead.conversationId=id;
          lead.updatedAt=new Date().toISOString();
          await env.LEADS_KV.put("lead:"+existingId,JSON.stringify(lead),{expirationTtl:LEAD_TTL});
          leadCaptured=true;
        }
      }
      if(!leadCaptured){
        const idLead=leadId();
        const lead={id:idLead,name,email,company:"",country:"",offering:"",market:"",message:"Chat inquiry: "+message,status:"New",source:"website-chat",conversationId:id,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),version:3};
        await env.LEADS_KV.put("lead:"+idLead,JSON.stringify(lead),{expirationTtl:LEAD_TTL});
        const index=JSON.parse(await env.LEADS_KV.get("leads:index")||"[]");
        index.unshift(idLead);
        await env.LEADS_KV.put("leads:index",JSON.stringify(index.slice(0,1000)),{expirationTtl:LEAD_TTL});
        await env.LEADS_KV.put(emailKey,idLead,{expirationTtl:LEAD_TTL});
        leadCaptured=true;
      }
    }

    return json({success:true,reply,conversationId:id,leadCaptured});
  }catch(error){
    console.error("Chat error",error);
    return json({success:false,error:"Chat unavailable"},500);
  }
}
