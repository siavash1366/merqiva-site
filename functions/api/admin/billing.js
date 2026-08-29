const HEADERS={"Content-Type":"application/json; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
async function auth(request,env){const a=request.headers.get("Authorization"); if(!a?.startsWith("Bearer ")) return false; return !!(await env.ADMIN_SESSIONS_KV.get("session:"+a.slice(7)));}

const PLANS=[
 {id:"pilot",name:"Pilot",priceUsd:99,delivery:"10 qualified opportunities",billing:"one-time",bestFor:"First validation"},
 {id:"growth",name:"Growth",priceUsd:299,delivery:"30 opportunities / month",billing:"monthly",bestFor:"Recurring GCC sales intelligence"},
 {id:"pro",name:"Pro",priceUsd:699,delivery:"75 opportunities / month",billing:"monthly",bestFor:"Larger maritime sales teams"}
];

export async function onRequestGet(context){
 const {request,env}=context; if(!(await auth(request,env))) return json({success:false,error:"Unauthorized"},401);
 return json({success:true,plans:PLANS,billingConfigured:Boolean(env.BILLING_CHECKOUT_URL),note:"Checkout is intentionally provider-neutral until a compliant payment provider is selected and configured."});
}

export async function onRequestPost(context){
 const {request,env}=context; if(!(await auth(request,env))) return json({success:false,error:"Unauthorized"},401);
 try{
  const b=await request.json(); const plan=PLANS.find(p=>p.id===String(b.planId||"")); if(!plan) return json({success:false,error:"Unknown plan"},400);
  if(!env.BILLING_CHECKOUT_URL) return json({success:false,error:"Billing provider not configured",code:"BILLING_NOT_CONFIGURED",plan},503);
  const url=env.BILLING_CHECKOUT_URL+"?plan="+encodeURIComponent(plan.id);
  return json({success:true,plan,checkoutUrl:url});
 }catch(error){return json({success:false,error:"Billing request failed"},500);}
}
