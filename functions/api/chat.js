const HEADERS={"Content-Type":"application/json; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const clean=(value,max)=>String(value==null?"":value).trim().slice(0,max);
const LEAD_TTL=31536000;
function leadId(){return "CHAT"+Date.now().toString(36).toUpperCase()}
const hasAny=(text,terms)=>terms.some(term=>text.includes(term));
const isArabic=text=>/[\u0600-\u06FF]/.test(text);

function baseReply(message){
  const q=message.toLowerCase();
  const ar=isArabic(message);

  if(hasAny(q,["price","cost","pricing","سعر","السعر","الأسعار","تكلفة","التكلفة"])){
    return ar
      ?"العرض الحالي لعملاء Merqiva المؤسسين هو 299 دولاراً شهرياً مقابل 30 فرصة بحرية مدروسة في دول الخليج كل شهر. قبل الاشتراك يمكنك طلب 3 فرص موثقة ومخصصة لمنتجك والسوق الذي تستهدفه."
      :"Merqiva’s current founding-customer offer is $299/month for 30 researched GCC maritime opportunities delivered monthly. Before subscribing, you can request 3 verified opportunities for your exact product and target market.";
  }
  if(hasAny(q,["guarantee","verify","evidence","fact","inference","ضمان","تحقق","التحقق","دليل","الأدلة","حقيقة","حقائق","استنتاج","الاستنتاجات"])){
    return ar
      ?"تقيّم Merqiva ملاءمة الشركة والمنتج وسياق الأسطول وصنّاع القرار وإشارات الشراء وسبب أهمية التوقيت الآن. ونفصل بين الحقائق الموثقة والاستنتاجات التحليلية والمعلومات غير المؤكدة، مع توضيح المصادر وحداثة البيانات حيثما كان ذلك متاحاً."
      :"Merqiva evaluates company fit, product fit, fleet context, decision makers, buying signals and Why Now. Material claims are designed to be separated into verified facts, analytical inferences and unknowns, with source context and freshness checked where available.";
  }
  if(hasAny(q,["uae","dubai","fujairah","abu dhabi","sharjah","الإمارات","دبي","الفجيرة","أبوظبي","أبو ظبي","الشارقة"])){
    return ar
      ?"الإمارات هي أول سوق تحقق تجاري لـ Merqiva. أخبرني بالمعدات أو الخدمة البحرية التي تبيعها، وإن كان مهماً فأضف أنواع السفن أو المشغلين الذين يشترونها عادةً. هذا يعطينا السياق اللازم لإعداد عينة مخصصة لمنتجك."
      :"UAE is Merqiva’s first validation market. Tell me what equipment or maritime service you sell and, if relevant, which vessel/operator types usually buy it. That gives the team enough context to research a product-specific sample.";
  }
  if(hasAny(q,["saudi","jeddah","dammam","jubail","السعودية","جدة","الدمام","الجبيل"])){
    return ar
      ?"السعودية سوق خليجي ذو أولوية لـ Merqiva. أخبرني بما تبيعه ومن يشتريه عادةً، ويمكننا تقييم عينة فرص مخصصة للسوق السعودي حول منتجك."
      :"Saudi Arabia is a priority GCC market for Merqiva. Tell me what you sell and who normally buys it, and the team can evaluate a Saudi-specific opportunity sample around your product.";
  }
  if(hasAny(q,["navcom","gmdss","marine electronics","إلكترونيات بحرية","الإلكترونيات البحرية","اتصالات بحرية","ملاحة بحرية"])){
    return ar
      ?"تُعد NAVCOM وGMDSS والإلكترونيات البحرية من مجالات Merqiva الأولية لأن ملاءمة السفينة ونشاط السفن الجديدة والتحديث والامتثال والبحث عن المشتري الفني أو مسؤول المشتريات يمكن أن تحسّن ترتيب الأولويات بشكل واضح. أخبرني بمنتجك الدقيق والسوق الخليجي المستهدف."
      :"NAVCOM, GMDSS and marine electronics are an initial Merqiva beachhead because vessel fit, new-vessel activity, retrofit/compliance context and technical/procurement buyer research can materially improve prioritization. Tell me your exact product and target GCC market.";
  }
  if(hasAny(q,["safety","compliance","سلامة","السلامة","امتثال","الامتثال"])){
    return ar
      ?"بالنسبة لمعدات السلامة والامتثال البحري، تبحث Merqiva في سياق الأسطول وإشارات التوقيت وجودة الأدلة ومسار المشتري الفني أو مسؤول المشتريات. أخبرني بمنتجك الدقيق والسوق الخليجي الذي تستهدفه."
      :"For marine safety and compliance equipment, Merqiva looks for relevant fleet context, observable timing signals, evidence quality and the likely procurement/technical buyer path. Tell me your exact product and target GCC market.";
  }
  if(hasAny(q,["offshore","أوفشور","بحري خارجي","خدمات بحرية فنية"])){
    return ar
      ?"بالنسبة لمعدات الأوفشور والخدمات الفنية، يمكن لـ Merqiva البحث عن المشغلين وأساطيل الدعم ذات الصلة والإشارات التجارية أو إشارات الصيانة الحالية ووظائف المشترين وسبب أهمية التوقيت الآن. أخبرني بما تبيعه والسوق الخليجي المهم لك."
      :"For offshore equipment and technical services, Merqiva can research relevant operators/support fleets, current commercial or maintenance-related signals, buyer functions and Why Now. Tell me what you sell and which GCC market matters.";
  }
  if(hasAny(q,["how","work","كيف","كيف تعمل","طريقة العمل","آلية العمل"])){
    return ar
      ?"تبدأ Merqiva بما تبيعه، ثم تبحث في الحسابات الخليجية المناسبة وسياق الأسطول والتشغيل والإشارات الحالية وأدوار المشترين. والهدف هو تقديم فرصة مدعومة بالأدلة توضح الملاءمة وسبب أهمية التوقيت الآن والخطوة البيعية التالية."
      :"Merqiva starts with what you sell, then researches relevant GCC accounts, fleet/operating context, current signals and buyer roles. The goal is an evidence-backed opportunity brief explaining fit, Why Now and the next sales action.";
  }
  if(hasAny(q,["free","sample","3 verified","three verified","مجاني","عينة","3 فرص","ثلاث فرص","فرص موثقة"])){
    return ar
      ?"يمكنك طلب 3 فرص موثقة ومخصصة لمنتجك. أخبرنا بما تبيعه والسوق الخليجي الذي تريد استهدافه، ومن يشتري المنتج أو الخدمة عادةً إذا كنت تعرف ذلك."
      :"You can request 3 verified opportunities for your exact product. Tell us what you sell, which GCC market you want to target, and who normally buys the product or service if you know.";
  }
  if(hasAny(q,["sales","contact","email","مبيعات","تواصل","اتصال","بريد","البريد"])){
    return ar
      ?"يمكنك التواصل عبر sales@merqivaintel.com أو ترك بريد العمل هنا للمتابعة. ولتسريع التأهيل، اذكر ما تبيعه والسوق الخليجي المستهدف."
      :"You can contact sales@merqivaintel.com or leave your work email here for follow-up. For the fastest qualification, include what you sell and your target GCC market.";
  }
  return ar
    ?"لإعداد عينة مفيدة من Merqiva، ابدأ بأمرين: ماذا تبيع، وأي سوق خليجي تريد استهدافه؟ وإذا كنت تعرف نوع السفينة أو دور المشتري المعتاد، أضف هذه المعلومة أيضاً."
    :"To qualify a useful Merqiva sample, start with two things: what do you sell, and which GCC market do you want to target? If you know the usual vessel type or buyer role, include that too.";
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
