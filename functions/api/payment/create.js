const H={"Content-Type":"application/json; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const clean=(v,n=500)=>String(v==null?"":v).trim().slice(0,n);
const CODES={978:"EUR",784:"AED",826:"GBP",949:"TRY"};
export async function onRequestPost(context){
 const {request,env}=context;
 try{
  if(!env.LEADS_KV||!env.YEKPAY_MERCHANT_ID)return J({success:false,error:"Payment provider is not configured"},503);
  const b=await request.json(), amount=Number(b.amount), currency=clean(b.currency,8).toUpperCase();
  const currencyCode=Object.keys(CODES).find(k=>CODES[k]===currency);
  if(!Number.isFinite(amount)||amount<=0||amount>100000)return J({success:false,error:"Invalid amount"},400);
  if(!currencyCode)return J({success:false,error:"Unsupported currency"},400);
  const email=clean(b.customerEmail,320).toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email))return J({success:false,error:"Valid customer email is required"},400);
  const invoiceId="MQV-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
  const orderNumber=invoiceId;
  const invoice={invoiceId,orderNumber,serviceName:clean(b.serviceName,240),amount:Number(amount.toFixed(2)),currency,status:"PENDING",customerName:clean(b.customerName,240),customerEmail:email,createdAt:new Date().toISOString(),provider:"YEKPAY"};
  const callback=new URL("/api/payment/yekpay-callback",request.url).toString();
  const form=new URLSearchParams();
  form.set("merchantId",env.YEKPAY_MERCHANT_ID);
  form.set("fromCurrencyCode",String(currencyCode));
  form.set("toCurrencyCode","364");
  form.set("email",email);
  form.set("mobile",clean(b.customerMobile,40));
  form.set("firstName",clean(b.customerFirstName||b.customerName,120));
  form.set("lastName",clean(b.customerLastName,"120"));
  form.set("address",clean(b.customerAddress,500));
  form.set("postalCode",clean(b.customerPostalCode,40));
  form.set("country",clean(b.customerCountry,120));
  form.set("city",clean(b.customerCity,120));
  form.set("description",clean(b.description||invoice.serviceName||"Merqiva service",500));
  form.set("amount",String(invoice.amount));
  form.set("orderNumber",orderNumber);
  form.set("callback",callback);
  const upstream=await fetch("https://gate.ypsapi.com/api/payment/request",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form});
  const raw=await upstream.text();
  let result;try{result=JSON.parse(raw)}catch{result=null}
  if(!upstream.ok||!result||String(result.Code)!=="100")return J({success:false,error:result?.Description||"YekPay payment request failed"},502);
  invoice.authority=String(result.Authority); invoice.checkoutUrl="https://gate.ypsapi.com/api/payment/start/"+encodeURIComponent(invoice.authority);
  await env.LEADS_KV.put("payment_invoice:"+invoiceId,JSON.stringify(invoice));
  await env.LEADS_KV.put("yekpay_authority:"+invoice.authority,invoiceId);
  return J({success:true,invoice,checkoutUrl:invoice.checkoutUrl});
 }catch(e){console.error("YekPay create error",e);return J({success:false,error:"Unable to create payment"},500)}
}
