const LOGIN_URL = "/api/login";
const API_URL = "/api/admin/leads";
const HISTORY_URL = "/api/admin/history";
const CAMPAIGN_URL = "/api/admin/campaigns";


let adminSession =
localStorage.getItem("admin_session");


let currentPage = 1;
let currentLead = null;
let currentSearch = "";
let currentStatus = "";




// =====================
// INIT
// =====================


document
.getElementById("loginBtn")
?.addEventListener(
"click",
login
);



document
.getElementById("refreshBtn")
?.addEventListener(
"click",
()=>{

currentPage = 1;

loadLeads();
loadCampaigns();

}

);



document
.getElementById("logoutBtn")
?.addEventListener(
"click",
logout
);



document
.getElementById("searchBtn")
?.addEventListener(
"click",
()=>{


currentSearch =
document
.getElementById("searchInput")
.value
.trim();



currentStatus =
document
.getElementById("statusFilter")
.value;



currentPage = 1;


loadLeads();


}

);



document
.getElementById("createCampaignBtn")
?.addEventListener(
"click",
createCampaign
);



document
.getElementById("prevPage")
?.addEventListener(
"click",
()=>{

if(currentPage > 1){

currentPage--;

loadLeads();

}

}

);



document
.getElementById("nextPage")
?.addEventListener(
"click",
()=>{

currentPage++;

loadLeads();

}

);





document
.getElementById("closeDetails")
?.addEventListener(
"click",
()=>{

document
.getElementById("leadDetails")
.classList
.add("hidden");

}

);





document
.getElementById("replyBtn")
?.addEventListener(
"click",
()=>{

if(currentLead?.email){

window.location.href =
`mailto:${currentLead.email}`;

}

}

);





document
.getElementById("copyEmailBtn")
?.addEventListener(
"click",
async()=>{

if(currentLead?.email){

await navigator.clipboard.writeText(
currentLead.email
);


showToast(
"Email copied"
);

}

}

);





document
.getElementById("saveNoteBtn")
?.addEventListener(
"click",
saveNote
);





if(adminSession){

showPanel();

}





// =====================
// LOGIN
// =====================


async function login(){


const token =
document
.getElementById("token")
.value
.trim();



if(!token)
return;



const response =
await fetch(
LOGIN_URL,
{

method:"POST",

headers:{

"Content-Type":
"application/json"

},

body:JSON.stringify({

token

})

}

);



const data =
await response.json();



if(data.success){


adminSession =
data.session;


localStorage.setItem(
"admin_session",
data.session
);



showPanel();


}
else{


document
.getElementById("loginError")
.innerText =
"Invalid token";


}


}






function showPanel(){


document
.getElementById("loginBox")
?.classList
.add("hidden");



document
.getElementById("panel")
?.classList
.remove("hidden");



loadLeads();

loadCampaigns();


}






function logout(){


localStorage.removeItem(
"admin_session"
);


adminSession = null;


location.reload();


}



let adminSession =
localStorage.getItem("admin_session");


let currentPage = 1;
let currentLead = null;
let currentSearch = "";
let currentStatus = "";




// =====================
// INIT
// =====================


document
.getElementById("loginBtn")
?.addEventListener(
"click",
login
);



document
.getElementById("refreshBtn")
?.addEventListener(
"click",
()=>{

currentPage = 1;

loadLeads();
loadCampaigns();

}

);



document
.getElementById("logoutBtn")
?.addEventListener(
"click",
logout
);



document
.getElementById("searchBtn")
?.addEventListener(
"click",
()=>{


currentSearch =
document
.getElementById("searchInput")
.value
.trim();



currentStatus =
document
.getElementById("statusFilter")
.value;



currentPage = 1;


loadLeads();


}

);



document
.getElementById("createCampaignBtn")
?.addEventListener(
"click",
createCampaign
);



document
.getElementById("prevPage")
?.addEventListener(
"click",
()=>{

if(currentPage > 1){

currentPage--;

loadLeads();

}

}

);



document
.getElementById("nextPage")
?.addEventListener(
"click",
()=>{

currentPage++;

loadLeads();

}

);





document
.getElementById("closeDetails")
?.addEventListener(
"click",
()=>{

document
.getElementById("leadDetails")
.classList
.add("hidden");

}

);





document
.getElementById("replyBtn")
?.addEventListener(
"click",
()=>{

if(currentLead?.email){

window.location.href =
`mailto:${currentLead.email}`;

}

}

);





document
.getElementById("copyEmailBtn")
?.addEventListener(
"click",
async()=>{

if(currentLead?.email){

await navigator.clipboard.writeText(
currentLead.email
);


showToast(
"Email copied"
);

}

}

);





document
.getElementById("saveNoteBtn")
?.addEventListener(
"click",
saveNote
);





if(adminSession){

showPanel();

}





// =====================
// LOGIN
// =====================


async function login(){


const token =
document
.getElementById("token")
.value
.trim();



if(!token)
return;



const response =
await fetch(
LOGIN_URL,
{

method:"POST",

headers:{

"Content-Type":
"application/json"

},

body:JSON.stringify({

token

})

}

);



const data =
await response.json();



if(data.success){


adminSession =
data.session;


localStorage.setItem(
"admin_session",
data.session
);



showPanel();


}
else{


document
.getElementById("loginError")
.innerText =
"Invalid token";


}


}






function showPanel(){


document
.getElementById("loginBox")
?.classList
.add("hidden");



document
.getElementById("panel")
?.classList
.remove("hidden");



loadLeads();

loadCampaigns();


}






function logout(){


localStorage.removeItem(
"admin_session"
);


adminSession = null;


location.reload();


}
// =====================
// HISTORY
// =====================


async function loadHistory(id){


const box =
document.getElementById(
"historyContent"
);



if(!box)
return;



const response =
await fetch(

`${HISTORY_URL}?id=${id}`,

{

headers:{

"Authorization":
"Bearer "+adminSession

}

}

);



const data =
await response.json();



if(
!data.success ||
!data.history.length
){

box.innerHTML =
"No activity yet";

return;

}



box.innerHTML =

data.history
.reverse()
.map(

item=>`

<div class="history-item">


<div class="history-title">

${item.action}

</div>


<div class="history-change">

${item.from}

↓

${item.to}

</div>


<div class="history-date">

${new Date(item.date)
.toLocaleString()}

</div>


${item.note ?

`
<div>
Note:
${item.note}
</div>
`

:

""

}


</div>

`

)
.join("");

}









// =====================
// INTERNAL NOTES
// =====================


async function saveNote(){


if(!currentLead)
return;



const input =
document.getElementById(
"noteInput"
);



if(!input)
return;



const note =
input.value.trim();



if(!note)
return;



const response =
await fetch(

API_URL,

{

method:"PATCH",

headers:{

"Content-Type":
"application/json",

"Authorization":
"Bearer "+adminSession

},

body:JSON.stringify({

id:currentLead.id,

note

})

}

);



const data =
await response.json();



if(data.success){


showToast(
"Note saved"
);



input.value = "";



currentLead =
data.lead;



loadNotes(
currentLead
);


}
else{


showToast(
data.error || "Note failed"
);


}


}







function loadNotes(lead){


const box =
document.getElementById(
"notesList"
);



if(!box)
return;



if(
!lead.notes ||
!lead.notes.length
){

box.innerHTML =
"No notes";

return;

}



box.innerHTML =

lead.notes
.map(

note=>`

<div class="note-item">


<div>
${note.text}
</div>


<div class="note-date">

${new Date(note.date)
.toLocaleString()}

</div>


</div>

`

)
.join("");

}









// =====================
// CAMPAIGNS
// =====================


async function loadCampaigns(){


const table =
document.getElementById(
"campaignTable"
);



if(!table)
return;



const response =
await fetch(

CAMPAIGN_URL,

{

headers:{

"Authorization":
"Bearer "+adminSession

}

}

);



const data =
await response.json();



if(!data.success)
return;



table.innerHTML = "";



data.campaigns.forEach(

campaign=>{


const row =
document.createElement(
"tr"
);



row.innerHTML = `


<td>
${campaign.id}
</td>


<td>
${campaign.name}
</td>


<td>
${campaign.subject}
</td>


<td>
${campaign.status}
</td>


<td>


<button
class="audienceBtn"
>
Audience
</button>


<button
class="deleteCampaignBtn"
>
Delete
</button>


</td>


`;





row
.querySelector(".audienceBtn")
.addEventListener(
"click",
()=>openAudience(campaign.id)
);





row
.querySelector(".deleteCampaignBtn")
.addEventListener(
"click",
()=>deleteCampaign(campaign.id)
);





table.appendChild(row);


}

);


}









async function createCampaign(){


const name =
document
.getElementById("campaignName")
.value
.trim();



const subject =
document
.getElementById("campaignSubject")
.value
.trim();



const body =
document
.getElementById("campaignBody")
.value
.trim();



if(!name || !subject || !body){

showToast(
"Fill all fields"
);

return;

}




const response =
await fetch(

CAMPAIGN_URL,

{

method:"POST",

headers:{

"Content-Type":
"application/json",

"Authorization":
"Bearer "+adminSession

},

body:JSON.stringify({

name,

subject,

body

})

}

);



const data =
await response.json();



if(data.success){


showToast(
"Campaign created"
);



document
.getElementById("campaignName")
.value="";


document
.getElementById("campaignSubject")
.value="";


document
.getElementById("campaignBody")
.value="";



loadCampaigns();


}
else{


showToast(
data.error || "Campaign failed"
);


}


}









async function deleteCampaign(id){


const response =
await fetch(

CAMPAIGN_URL,

{

method:"DELETE",

headers:{

"Content-Type":
"application/json",

"Authorization":
"Bearer "+adminSession

},

body:JSON.stringify({

id

})

}

);



const data =
await response.json();



if(data.success){

showToast(
"Campaign deleted"
);


loadCampaigns();

}

}









function openAudience(id){

window.location.href =
`/admin/campaign-audience.html?campaign=${id}`;

}









// =====================
// TOAST
// =====================


function showToast(message){


let toast =
document.querySelector(
".toast"
);



if(!toast){


toast =
document.createElement(
"div"
);


toast.className =
"toast";


document.body.appendChild(
toast
);


}



toast.innerText =
message;



toast.classList.add(
"show"
);



setTimeout(
()=>{

toast.classList.remove(
"show"
);

},
2000
);


}
