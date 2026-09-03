/* Merqiva growth copy + conversion UX layer. Runs after app.js. */
(function(){
  const copy={
    en:{
      eyebrow:"EVIDENCE-BACKED GCC MARITIME OPPORTUNITY INTELLIGENCE",
      hero:"Know which GCC maritime accounts are worth contacting now, why they fit your product, what changed, and who to approach — backed by sources.",
      cta:"Get 3 Verified Opportunities",
      start:"Start With 3 Verified Opportunities",
      contacth:"Get 3 verified opportunities for your exact product.",
      contactp:"Tell us what you sell and which GCC market matters. We’ll research a small, product-specific sample so you can judge the quality before subscribing.",
      formnote:"Request a product-specific opportunity sample. No long-term commitment.",
      focus:"GCC Maritime Opportunity Intelligence"
    },
    ar:{
      eyebrow:"استخبارات فرص بحرية موثقة بالأدلة في دول الخليج",
      hero:"اعرف أي الحسابات البحرية في الخليج تستحق التواصل الآن، ولماذا تناسب منتجك، وما الذي تغير، ومن الشخص المناسب للتواصل معه — مع مصادر داعمة.",
      cta:"احصل على 3 فرص موثقة",
      start:"ابدأ بـ 3 فرص موثقة",
      contacth:"احصل على 3 فرص موثقة تناسب منتجك تحديداً.",
      contactp:"أخبرنا بما تبيعه والسوق الخليجي الذي تستهدفه. سنبحث عينة صغيرة ومخصصة لمنتجك حتى تتمكن من تقييم الجودة قبل الاشتراك.",
      formnote:"اطلب عينة فرص مخصصة لمنتجك. بدون التزام طويل الأجل.",
      focus:"استخبارات فرص المبيعات البحرية في الخليج"
    }
  };

  const focusCopy={
    en:{
      kicker:"Initial commercial focus",
      title:"Built first for maritime suppliers where fleet fit and timing actually change the sale.",
      intro:"Merqiva is narrowing its initial validation around product categories where vessel profile, regulatory context and current fleet activity can materially improve prospecting.",
      cards:[
        ["Beachhead 01","NAVCOM, GMDSS & Marine Electronics","Match equipment to vessel/operator profiles and use new-vessel, retrofit, fleet-expansion and compliance signals to prioritize outreach.","Explore NAVCOM intelligence →"],
        ["Beachhead 02","Marine Safety & Compliance Equipment","Prioritize operators and technical organizations where vessel activity, compliance timing and fleet context create a credible sales reason.","Explore safety intelligence →"],
        ["Beachhead 03","Offshore Equipment & Technical Services","Map offshore operators, support fleets and commercial activity to supplier-specific opportunities instead of broad company lists.","Explore offshore intelligence →"]
      ],
      markets:["UAE Maritime Intelligence","Saudi Maritime Intelligence","Full GCC Coverage","Procurement Intelligence"]
    },
    ar:{
      kicker:"التركيز التجاري الأولي",
      title:"نبدأ مع موردي القطاع البحري حيث تؤثر ملاءمة الأسطول والتوقيت فعلياً في فرصة البيع.",
      intro:"تركّز Merqiva في مرحلة التحقق الأولى على فئات المنتجات التي يمكن أن يحسّن فيها نوع السفينة والسياق التنظيمي ونشاط الأسطول الحالي جودة الاستهداف التجاري.",
      cards:[
        ["المجال الأول","NAVCOM و GMDSS والإلكترونيات البحرية","مطابقة المعدات مع ملفات السفن والمشغلين، واستخدام إشارات السفن الجديدة والتحديث وتوسعة الأسطول والامتثال لترتيب أولوية التواصل.","استكشف استخبارات NAVCOM ←"],
        ["المجال الثاني","معدات السلامة والامتثال البحري","ترتيب أولوية المشغلين والجهات الفنية عندما يخلق نشاط السفن وتوقيت الامتثال وسياق الأسطول سبباً تجارياً واضحاً للتواصل.","استكشف استخبارات السلامة ←"],
        ["المجال الثالث","معدات الأوفشور والخدمات الفنية","ربط مشغلي الأوفشور وأساطيل الدعم والنشاط التجاري بفرص مخصصة للمورد بدلاً من قوائم شركات عامة.","استكشف استخبارات الأوفشور ←"]
      ],
      markets:["استخبارات السوق البحري في الإمارات","استخبارات السوق البحري في السعودية","تغطية دول الخليج","استخبارات المشتريات"]
    }
  };

  const chatCopy={
    en:{
      eyebrow:"MERQIVA QUALIFICATION ASSISTANT",
      title:"Find your first 3 opportunities",
      subtitle:"Start with what you sell and the GCC market you want to enter.",
      actions:[
        ["What do you sell?","I want 3 verified opportunities. I sell "],
        ["Target UAE","I want to target the UAE maritime market. I sell "],
        ["Target Saudi","I want to target the Saudi maritime market. I sell "],
        ["How we verify","How do you verify an opportunity and separate facts from inferences?"]
      ],
      welcome:"Hi — I’m Merqiva’s customer assistant. Tell me what you sell, which market you target, or ask about our opportunity intelligence service.",
      name:"Your name (optional)",
      email:"Work email for follow-up (optional)",
      input:"What do you sell, and which GCC market matters?",
      send:"Send",
      note:"Automated qualification responses. Do not share sensitive information.",
      launcher:"Merqiva Chat"
    },
    ar:{
      eyebrow:"مساعد MERQIVA لتأهيل الفرص",
      title:"اعثر على أول 3 فرص مناسبة لك",
      subtitle:"ابدأ بما تبيعه والسوق الخليجي الذي تريد استهدافه.",
      actions:[
        ["ماذا تبيع؟","أريد 3 فرص موثقة. أبيع "],
        ["استهداف الإمارات","أريد استهداف السوق البحري في الإمارات. أبيع "],
        ["استهداف السعودية","أريد استهداف السوق البحري في السعودية. أبيع "],
        ["كيف نتحقق؟","كيف تتحققون من الفرصة وتفصلون بين الحقائق والاستنتاجات؟"]
      ],
      welcome:"مرحباً — أنا مساعد Merqiva. أخبرني بما تبيعه والسوق الذي تستهدفه، أو اسألني عن خدمة استخبارات الفرص لدينا.",
      name:"الاسم (اختياري)",
      email:"بريد العمل للمتابعة (اختياري)",
      input:"ماذا تبيع، وأي سوق خليجي يهمك؟",
      send:"إرسال",
      note:"ردود آلية لتأهيل الفرص. لا تشارك معلومات حساسة.",
      launcher:"دردشة Merqiva"
    }
  };

  const lang=()=>document.documentElement.lang==="ar"?"ar":"en";
  const setText=(selector,value)=>{const el=document.querySelector(selector);if(el&&value!=null)el.textContent=value};

  function localizeFocus(current){
    const c=focusCopy[current];
    const root=document.getElementById("segments");
    if(!root)return;
    const head=root.querySelector(".section-head");
    if(head){
      const kicker=head.querySelector(".kicker");
      const title=head.querySelector("h2");
      const intro=head.querySelector("p");
      if(kicker)kicker.textContent=c.kicker;
      if(title)title.textContent=c.title;
      if(intro)intro.textContent=c.intro;
    }
    root.querySelectorAll(".focus-card").forEach((card,index)=>{
      const item=c.cards[index];
      if(!item)return;
      const tag=card.querySelector(".focus-tag");
      const title=card.querySelector("h3");
      const text=card.querySelector("p");
      const link=card.querySelector("a");
      if(tag)tag.textContent=item[0];
      if(title)title.textContent=item[1];
      if(text)text.textContent=item[2];
      if(link)link.textContent=item[3];
    });
    root.querySelectorAll(".market-link").forEach((link,index)=>{if(c.markets[index])link.textContent=c.markets[index]});
  }

  function localizeChat(current){
    const c=chatCopy[current];
    const widget=document.getElementById("chatWidget");
    if(!widget)return;
    setText(".chat-eyebrow",c.eyebrow);
    setText("#chatTitle",c.title);
    setText(".chat-modal-head p",c.subtitle);
    widget.querySelectorAll(".chat-quick-actions button").forEach((button,index)=>{
      const item=c.actions[index];
      if(!item)return;
      button.textContent=item[0];
      button.dataset.chatPrompt=item[1];
    });
    const name=document.getElementById("chatName");
    const email=document.getElementById("chatEmail");
    const input=document.getElementById("chatMessage");
    const send=document.getElementById("chatSend");
    const note=widget.querySelector(".chat-form small");
    const launcher=document.getElementById("merqivaChatLauncher");
    if(name)name.placeholder=c.name;
    if(email)email.placeholder=c.email;
    if(input)input.placeholder=c.input;
    if(send)send.textContent=c.send;
    if(note)note.textContent=c.note;
    if(launcher)launcher.textContent=c.launcher;

    const messages=document.getElementById("chatMessages");
    if(messages&&!messages.querySelector(".chat-msg.user")){
      const firstBot=messages.querySelector(".chat-msg.bot");
      if(firstBot)firstBot.textContent=c.welcome;
    }
  }

  function apply(){
    const current=lang();
    document.querySelectorAll("[data-growth]").forEach(el=>{
      const key=el.getAttribute("data-growth");
      if(copy[current][key])el.textContent=copy[current][key];
    });
    localizeFocus(current);
    localizeChat(current);
  }

  function initChatUX(){
    const widget=document.getElementById("chatWidget");
    const modal=widget?.querySelector(".chat-modal");
    const messages=document.getElementById("chatMessages");
    const messageInput=document.getElementById("chatMessage");
    const launcher=document.getElementById("merqivaChatLauncher");
    if(!widget||!modal)return;

    /* Do not force chat open. B2B visitors should choose when to engage. */
    try{sessionStorage.setItem("merqiva_chat_auto_shown","1")}catch(_){}
    if(launcher)launcher.hidden=false;

    widget.dataset.userOpen="0";

    /* Capture trusted open/close intent before app.js bubble handlers run. */
    document.addEventListener("click",event=>{
      const target=event.target instanceof Element?event.target:null;
      if(!target)return;
      if(target.closest("[data-chat-open],#merqivaChatLauncher,[data-chat-prompt]"))widget.dataset.userOpen="1";
      if(target.closest("[data-chat-close]"))widget.dataset.userOpen="0";
    },true);

    /* app.js still contains a legacy first-session timer. Suppress only non-user opens. */
    const widgetObserver=new MutationObserver(()=>{
      if(widget.classList.contains("open")&&widget.dataset.userOpen!=="1"){
        widget.classList.remove("open");
        widget.setAttribute("aria-hidden","true");
        if(launcher)launcher.hidden=false;
        setTimeout(()=>{if(document.activeElement===messageInput)messageInput.blur()},100);
      }
      setTimeout(()=>localizeChat(lang()),0);
    });
    widgetObserver.observe(widget,{attributes:true,attributeFilter:["class"]});

    /* Contact capture appears only after the visitor starts a conversation. */
    const updateEngagement=()=>{
      if(messages?.querySelector(".chat-msg.user"))modal.classList.add("chat-engaged");
      localizeChat(lang());
    };
    updateEngagement();
    if(messages){
      const messageObserver=new MutationObserver(updateEngagement);
      messageObserver.observe(messages,{childList:true,subtree:true});
    }
  }

  function init(){
    apply();
    document.querySelectorAll(".lang").forEach(btn=>btn.addEventListener("click",()=>setTimeout(apply,0)));
    initChatUX();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
