const H={"Content-Type":"application/json; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
export async function onRequestGet(context){
 const id=new URL(context.request.url).searchParams.get("invoice");
 if(!id)return J({success:false,error:"Invoice is required"},400);
 try{
  const invoice=await context.env.LEADS_KV.get("payment_invoice:"+id,{type:"json"});
  if(!invoice)return J({success:false,error:"Invoice not found"},404);
  const methods=[];
  if(invoice.checkoutUrl)methods.push({id:"yekpay",name:"Secure international card payment",description:"Pay with a supported international card through YekPay.",checkoutUrl:invoice.checkoutUrl});
  if(context.env.PAYMENT_BANK_INSTRUCTIONS_URL)methods.push({id:"bank",name:"Business bank transfer",description:"Request bank-transfer instructions.",checkoutUrl:context.env.PAYMENT_BANK_INSTRUCTIONS_URL+"?invoice="+encodeURIComponent(id)});
  return J({success:true,invoice,methods});
 }catch(e){console.error(e);return J({success:false,error:"Failed to load invoice"},500)}
}
