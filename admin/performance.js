const session=localStorage.getItem("admin_session");
const $=id=>document.getElementById(id);
async function req(url,options={}){const headers=new Headers(options.headers||{});headers.set("Authorization","Bearer "+session);const r=await fetch(url,{...options,headers});if(r.status===401){localStorage.removeItem("admin_session");location.href="/admin/index.html";throw new Error("Session expired");}const d=await r.json();if(!r.ok||d.success===false)throw new Error(d.error||"Request failed");return d;}
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
async function load(){
try{
 const [m,c,b]=await Promise.all([req("/api/admin/metrics"),req("/api/admin/guarantee-claim"),req("/api/admin/billing")]);
 const x=m.metrics;
 $("metricsGrid").innerHTML=[
 ["Leads",x.leads],["Opportunities",x.opportunities],["Qualified",x.qualifiedOpportunities],["Average Score",x.averageScore],["Evidence Coverage",x.evidenceCoverage+"%"],["Replies",x.replies],["Meetings",x.meetings],["Won",x.won]
 ].map(([a,v])=>'<div class="metric"><small>'+esc(a)+'</small><strong>'+esc(v)+'</strong></div>').join("");
 $("signals").innerHTML=(m.recentSignals||[]).length?m.recentSignals.map(o=>'<div class="list-row"><div><strong>'+esc(o.companyName)+'</strong><small>'+esc(o.id)+' · score '+esc(o.score)+'</small></div><p>'+esc(o.whyNow||"No why-now recorded.")+'</p></div>').join(""):"<p class='muted'>No recent signals.</p>";
 $("claims").innerHTML=(c.claims||[]).length?c.claims.map(q=>'<div class="list-row"><div><strong>'+esc(q.id)+'</strong><span class="pill">'+esc(q.status)+'</span></div><p>'+esc(q.reason||"No reason supplied.")+'</p><small>'+esc(q.opportunityId)+' · '+esc(q.createdAt)+'</small></div>').join(""):"<p class='muted'>No guarantee claims.</p>";
 $("plans").innerHTML=(b.plans||[]).map(p=>'<div class="plan-row"><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.delivery)+' · '+esc(p.billing)+'</small></div><strong>$'+esc(p.priceUsd)+'</strong></div>').join("") + '<p class="muted billing-note">'+(b.billingConfigured?"Checkout provider configured.":"Checkout provider not configured yet.")+'</p>';
 $("status").textContent="Updated "+new Date().toLocaleString();
}catch(e){$("status").textContent=e.message;}
}
$("refreshBtn").onclick=load;
$("logoutBtn").onclick=()=>{localStorage.removeItem("admin_session");location.href="/admin/index.html";};
if(session)load();else location.href="/admin/index.html";