const LOGIN_URL = "/api/login";

const API_URL = "/api/admin/leads";

const HISTORY_URL = "/api/admin/history";



let adminSession =
localStorage.getItem("admin_session");



let currentPage = 1;

let currentLead = null;

let currentSearch = "";

let currentStatus = "";



const loginBtn =
document.getElementById("loginBtn");


if(loginBtn){

loginBtn.addEventListener(
"click",
login
);

}



const refreshBtn =
document.getElementById("refreshBtn");


if(refreshBtn){

refreshBtn.addEventListener(
"click",
()=>{
currentPage=1;
loadLeads();
}
);

}




const logoutBtn =
document.getElementById("logoutBtn");


if(logoutBtn){

logoutBtn.addEventListener(
"click",
logout
);

}




const searchBtn =
document.getElementById("searchBtn");


if(searchBtn){

searchBtn.addEventListener(
"click",
()=>{

currentSearch =
document.getElementById(
"searchInput"
).value.trim();


currentStatus =
document.getElementById(
"statusFilter"
).value;


currentPage=1;

loadLeads();

}

);

}




const prevPage =
document.getElementById(
"prevPage"
);


if(prevPage){

prevPage.addEventListener(
"click",
()=>{

if(currentPage>1){

currentPage--;

loadLeads();

}

}

);

}




const nextPage =
document.getElementById(
"nextPage"
);


if(nextPage){

nextPage.addEventListener(
"click",
()=>{

currentPage++;

loadLeads();

}

);

}




const closeDetails =
document.getElementById(
"closeDetails"
);


if(closeDetails){

closeDetails.addEventListener(
"click",
()=>{

document
.getElementById("leadDetails")
.classList
.add("hidden");

}

);

}




const replyBtn =
document.getElementById(
"replyBtn"
);


if(replyBtn){

replyBtn.addEventListener(
"click",
()=>{

if(currentLead?.email){

window.location.href =
`mailto:${currentLead.email}`;

}

}

);

}





const copyEmailBtn =
document.getElementById(
"copyEmailBtn"
);


if(copyEmailBtn){

copyEmailBtn.addEventListener(
"click",
async()=>{


if(currentLead?.email){

await navigator.clipboard.writeText(
currentLead.email
);


alert(
"Email copied"
);

}


}

);

}





if(adminSession){

showPanel();

}







async function login(){


const token =
document
.getElementById("token")
.value
.trim();



if(!token){

return;

}



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
.getElementById(
"loginBox"
)
.classList
.add("hidden");



document
.getElementById(
"panel"
)
.classList
.remove("hidden");



loadLeads();


}









function logout(){


localStorage.removeItem(
"admin_session"
);


adminSession=null;


location.reload();


}









async function loadLeads(){


const params =
new URLSearchParams({

page:currentPage,

limit:20,

search:currentSearch,

status:currentStatus

});





const response =
await fetch(

`${API_URL}?${params}`,

{

headers:{

"Authorization":
"Bearer "+adminSession

}

}

);



const data =
await response.json();





if(!data.success){

logout();

return;

}






const tbody =
document.getElementById(
"leadTable"
);



tbody.innerHTML="";





data.leads.forEach(
lead=>{


const row =
document.createElement(
"tr"
);



row.innerHTML = `


<td>${lead.id || ""}</td>

<td>${lead.name || ""}</td>

<td>${lead.email || ""}</td>

<td>${lead.company || ""}</td>

<td>${lead.country || ""}</td>

<td>${lead.offering || ""}</td>


<td>

<select class="statusSelect"
data-id="${lead.id}">


${statusOptions(
lead.status
)}


</select>


</td>


<td>


<button class="saveBtn">
Save
</button>


<button class="viewBtn">
View
</button>


</td>


`;





row
.querySelector(".saveBtn")
.addEventListener(
"click",
()=>updateStatus(lead.id)
);





row
.querySelector(".viewBtn")
.addEventListener(
"click",
()=>viewLead(lead)
);




tbody.appendChild(row);


}

);





const pageInfo =
document.getElementById(
"pageInfo"
);


if(pageInfo){

pageInfo.innerText =
`Page ${data.page} / ${data.pages || 1}`;

}



}










function statusOptions(
current
){


const list=[

"New",

"Reviewed",

"Contacted",

"Qualified",

"Proposal Sent",

"Won",

"Lost"

];



return list.map(
item=>`

<option value="${item}"
${current===item?"selected":""}>
${item}
</option>

`
)
.join("");

}









async function updateStatus(id){


const select =
document.querySelector(

`.statusSelect[data-id="${id}"]`

);



const status =
select.value;





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

id,

status

})

}

);





const data =
await response.json();




if(data.success){

alert(
"Status updated"
);


loadLeads();


}
else{


alert(
data.error ||
"Update failed"
);


}


}









async function viewLead(
lead
){


currentLead =
lead;



const box =
document.getElementById(
"leadDetails"
);



const content =
document.getElementById(
"detailsContent"
);





content.innerHTML = `


<p><b>ID:</b> ${lead.id || ""}</p>

<p><b>Name:</b> ${lead.name || ""}</p>

<p><b>Email:</b> ${lead.email || ""}</p>

<p><b>Company:</b> ${lead.company || ""}</p>

<p><b>Country:</b> ${lead.country || ""}</p>

<p><b>Market:</b> ${lead.market || ""}</p>

<p><b>Offering:</b> ${lead.offering || ""}</p>

<p><b>Status:</b> ${lead.status || ""}</p>

<p><b>Created:</b> ${lead.createdAt || ""}</p>

<p><b>Message:</b></p>

<p>${lead.message || ""}</p>


<div id="historyContent">
Loading...
</div>


`;



box
.classList
.remove("hidden");



loadHistory(
lead.id
);


}









async function loadHistory(id){


const historyBox =
document.getElementById(
"historyContent"
);



if(!historyBox){

return;

}





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




if(!data.success){

historyBox.innerHTML =
"No history";

return;

}





if(!data.history.length){

historyBox.innerHTML =
"No activity yet";

return;

}





historyBox.innerHTML =
data.history
.map(

item=>`

<p>

<b>${item.action}</b><br>

${item.from}
→
${item.to}

<br>

${item.date}

${item.note ? "<br>"+item.note:""}

</p>

`

)
.join("");

}
