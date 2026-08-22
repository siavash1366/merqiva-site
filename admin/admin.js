const LOGIN_URL = "/api/login";
const API_URL = "/api/admin/leads";
const HISTORY_URL = "/api/admin/history";


let adminSession =
localStorage.getItem("admin_session");


let currentPage = 1;
let currentLead = null;
let currentSearch = "";
let currentStatus = "";





// --------------------
// INIT EVENTS
// --------------------


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

currentPage=1;
loadLeads();

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


currentPage=1;


loadLeads();


}

);





document
.getElementById("prevPage")
?.addEventListener(
"click",
()=>{


if(currentPage>1){

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






if(adminSession){

showPanel();

}









// --------------------
// LOGIN
// --------------------


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


}









function logout(){


localStorage.removeItem(
"admin_session"
);


adminSession=null;


location.reload();


}










// --------------------
// LOAD LEADS
// --------------------


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

<select
class="statusSelect"
data-id="${lead.id}"
>

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






document
.getElementById("pageInfo")
.innerText =
`Page ${data.page} / ${data.pages || 1}`;


}









function statusOptions(
current
){


return [

"New",

"Reviewed",

"Contacted",

"Qualified",

"Proposal Sent",

"Won",

"Lost"

]

.map(
status=>`

<option value="${status}"
${current===status?"selected":""}
>

${status}

</option>

`

)
.join("");

}









// --------------------
// UPDATE STATUS
// --------------------


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

status,

note:"Updated from CRM"

})

}

);





const data =
await response.json();




if(data.success){


showToast(
"Status updated"
);


loadLeads();


}
else{


showToast(
data.error || "Update failed"
);


}


}









// --------------------
// VIEW LEAD
// --------------------


function viewLead(lead){


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

<p>
${lead.message || ""}
</p>


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









// --------------------
// HISTORY
// --------------------


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









// --------------------
// TOAST
// --------------------


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
