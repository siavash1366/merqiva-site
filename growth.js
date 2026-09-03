/* Merqiva growth copy layer. Runs after app.js so growth messaging stays consistent in EN/AR. */
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
  function init(){
    apply();
    document.querySelectorAll(".lang").forEach(btn=>btn.addEventListener("click",()=>setTimeout(apply,0)));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
