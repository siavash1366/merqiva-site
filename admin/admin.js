const LOGIN_URL="/api/login";

const API_URL="/api/admin/leads";


let adminSession =
localStorage.getItem("admin_session");



document
.getElementById("loginBtn")
.addEventListener(
"click",
login
);



document
.getElementById("refreshBtn")
.addEventListener(
"click",
loadLeads
);



document
.getElementById("logoutBtn")
.addEventListener(
"click",
logout
);





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

token:token

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
.classList
.add("hidden");


document
.getElementById("panel")
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


const response =
await fetch(

API_URL,

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
document
.getElementById("leadTable");



tbody.innerHTML="";



data.leads.forEach(

lead=>{


const row =
document.createElement("tr");



row.innerHTML=`

<td>${lead.id || ""}</td>

<td>${lead.name || ""}</td>

<td>${lead.email || ""}</td>

<td>${lead.company || ""}</td>

<td>${lead.country || ""}</td>

<td>${lead.offering || ""}</td>

<td>

<select id="status-${lead.id}">

<option ${lead.status==="New" ? "selected":""}>
New
</option>

<option ${lead.status==="Reviewed" ? "selected":""}>
Reviewed
</option>

<option ${lead.status==="Contacted" ? "selected":""}>
Contacted
</option>

<option ${lead.status==="Qualified" ? "selected":""}>
Qualified
</option>

<option ${lead.status==="Proposal Sent" ? "selected":""}>
Proposal Sent
</option>

<option ${lead.status==="Won" ? "selected":""}>
Won
</option>

<option ${lead.status==="Lost" ? "selected":""}>
Lost
</option>

</select>

</td>


<td>

<button onclick="updateStatus('${lead.id}')">
Save
</button>

</td>

`;



tbody.appendChild(row);


}

);

async function updateStatus(id){


const status =
document.getElementById(
"status-"+id
).value;



const response =
await fetch(
API_URL,
{

method:"PATCH",

headers:{

"Content-Type":"application/json",

"Authorization":
"Bearer "+adminSession

},

body:JSON.stringify({

id:id,

status:status

})

}

);



const data =
await response.json();



if(data.success){

alert("Status updated");

loadLeads();

}
else{

alert(
data.error || "Update failed"
);

}


}
}
