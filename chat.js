(function(){
  const messages=document.getElementById("messages");
  const form=document.getElementById("chatForm");
  const nameInput=document.getElementById("name");
  const emailInput=document.getElementById("email");
  const messageInput=document.getElementById("message");
  const sendButton=document.getElementById("send");
  const status=document.getElementById("status");
  if(!messages||!form||!messageInput||!sendButton)return;

  let conversationId;
  try{
    conversationId=localStorage.getItem("merqiva_chat_id")||crypto.randomUUID();
    localStorage.setItem("merqiva_chat_id",conversationId);
    if(nameInput)nameInput.value=localStorage.getItem("merqiva_chat_name")||"";
    if(emailInput)emailInput.value=localStorage.getItem("merqiva_chat_email")||"";
  }catch(_){conversationId=crypto.randomUUID()}

  function add(role,text){
    if(!text)return;
    const node=document.createElement("div");
    node.className="msg "+(role==="user"?"user":"bot");
    node.textContent=text;
    messages.appendChild(node);
    messages.scrollTop=messages.scrollHeight;
  }

  add("bot","Tell me what you sell and which GCC market you want to target. Merqiva’s current validation offer is 3 product-specific verified opportunities.");

  document.querySelectorAll("[data-prompt]").forEach(button=>button.addEventListener("click",()=>{
    messageInput.value=button.dataset.prompt||"";
    messageInput.focus();
  }));

  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const message=messageInput.value.trim();
    const name=nameInput?.value.trim()||"";
    const email=emailInput?.value.trim()||"";
    if(!message)return;

    try{
      localStorage.setItem("merqiva_chat_name",name);
      localStorage.setItem("merqiva_chat_email",email);
    }catch(_){}

    add("user",message);
    messageInput.value="";
    sendButton.disabled=true;
    status.textContent="Sending…";

    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),18000);
    try{
      const response=await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({conversationId,message,name,email}),
        signal:controller.signal
      });
      const data=await response.json();
      if(!response.ok||!data.success)throw new Error(data.error||"Chat unavailable");
      add("bot",data.reply);
      status.textContent=data.leadCaptured?"Your work email has been captured for Merqiva follow-up.":"";
    }catch(error){
      add("bot",error?.name==="AbortError"?"The assistant took too long to respond. Please try again.":"The assistant is unavailable right now. You can email sales@merqivaintel.com.");
      status.textContent=error?.message||"Chat unavailable";
    }finally{
      clearTimeout(timeout);
      sendButton.disabled=false;
      messageInput.focus();
    }
  });
})();
