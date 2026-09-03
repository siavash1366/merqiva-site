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

  function apply(){
    const lang=document.documentElement.lang==="ar"?"ar":"en";
    document.querySelectorAll("[data-growth]").forEach(el=>{
      const key=el.getAttribute("data-growth");
      if(copy[lang][key])el.textContent=copy[lang][key];
    });
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
      if(target.closest("[data-chat-open],#merqivaChatLauncher,[data-chat-prompt]")){
        widget.dataset.userOpen="1";
      }
      if(target.closest("[data-chat-close]")){
        widget.dataset.userOpen="0";
      }
    },true);

    /* app.js still contains a legacy first-session timer. Suppress only non-user opens. */
    const widgetObserver=new MutationObserver(()=>{
      if(widget.classList.contains("open")&&widget.dataset.userOpen!=="1"){
        widget.classList.remove("open");
        widget.setAttribute("aria-hidden","true");
        if(launcher)launcher.hidden=false;
        setTimeout(()=>{
          if(document.activeElement===messageInput)messageInput.blur();
        },100);
      }
    });
    widgetObserver.observe(widget,{attributes:true,attributeFilter:["class"]});

    /* Hide contact capture until the visitor has actually started a conversation. */
    const updateEngagement=()=>{
      if(messages?.querySelector(".chat-msg.user"))modal.classList.add("chat-engaged");
    };
    updateEngagement();
    if(messages){
      const messageObserver=new MutationObserver(updateEngagement);
      messageObserver.observe(messages,{childList:true,subtree:true});
    }

    const chatNote=widget.querySelector(".chat-form small");
    if(chatNote)chatNote.textContent="Automated qualification responses. Do not share sensitive information.";
  }

  function init(){
    apply();
    document.querySelectorAll(".lang").forEach(btn=>btn.addEventListener("click",()=>setTimeout(apply,0)));
    initChatUX();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
