const H={"Content-Type":"text/html; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const reply=(title,message,status=200)=>new Response("<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>"+title+"</title></head><body style='font-family:Arial,sans-serif;padding:40px;background:#07111e;color:#e8eef5'><h1>"+title+"</h1><p>"+message+"</p><p><a style='color:#39d5d0' href='/' >Return to Merqiva</a></p></body></html>",{status,headers:H});
const formValue=(form,key)=>String(form.get(key)||"").trim();
export async function onRequestPost(context){
 const {request,env}=context;
 try{
  if(!env.LEADS_KV||!env.YEKPAY_MERCHANT_ID)return reply("Payment configuration unavailable","Please contact Merqiva support.",503);
  const form=await request.formData();
  const authority=formValue(form,"Authority")||formValue(form,"authority");
  const status=formValue(form,"Status")||formValue(form,"status");
  if(!authority)return reply("Payment incomplete","No payment authority was provided.",400);
  const invoiceId=await env.LEADS_KV.get("yekpay_authority:"+authority);
  if(!invoiceId)return reply("Payment not found","The payment reference could not be matched to a Merqiva invoice.",404);
  const invoice=await env.LEADS_KV.get("payment_invoice:"+invoiceId,{type:"json"});
  if(!invoice)return reply("Invoice not found","The Merqiva invoice could not be loaded.",404);
  if(String(status).toLowerCase()!=="1"&&String(status).toLowerCase()!=="success") {
    invoice.status="CANCELLED";invoice.updatedAt=new Date().toISOString();
    await env.LEADS_KV.put("payment_invoice:"+invoiceId,JSON.stringify(invoice));
  if(invoice.opportunityId){
    const opportunity=await env.LEADS_KV.get("opportunity:"+invoice.opportunityId,{type:"json"});
    if(opportunity){
      opportunity.status="Won";
      opportunity.paymentStatus="PAID";
      opportunity.paymentInvoiceId=invoiceId;
      opportunity.updatedAt=new Date().toISOString();
      await env.LEADS_KV.put("opportunity:"+invoice.opportunityId,JSON.stringify(opportunity));
    }
  }
    return reply("Payment cancelled","No charge was confirmed.");
  }
  const verify=await fetch("https://gate.ypsapi.com/api/payment/verify",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({merchantId:env.YEKPAY_MERCHANT_ID,authority})});
  const raw=await verify.text();let result;try{result=JSON.parse(raw)}catch{result=null}
  if(!verify.ok||!result||String(result.Code)!=="100")return reply("Payment verification failed","YekPay did not confirm the payment. Please contact support.",502);
  invoice.status="PAID";invoice.verifiedAt=new Date().toISOString();invoice.yekpayReference=result.Reference||null;invoice.gateway=result.Gateway||null;invoice.verifiedAmount=result.Amount||null;invoice.updatedAt=new Date().toISOString();
  await env.LEADS_KV.put("payment_invoice:"+invoiceId,JSON.stringify(invoice));
  await env.LEADS_KV.put("payment_event:"+invoiceId+":"+authority,JSON.stringify({invoiceId,authority,status:"PAID",reference:result.Reference||null,receivedAt:new Date().toISOString()}),{expirationTtl:31536000});
  return reply("Payment confirmed","Thank you. Your Merqiva payment has been verified. Invoice: "+invoiceId);
 }catch(e){console.error("YekPay callback error",e);return reply("Payment processing error","Please contact Merqiva support.",500)}
}
export async function onRequestGet(context){return reply("Payment callback","This endpoint is used by YekPay to complete payment verification.",405)}
