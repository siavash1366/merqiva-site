const LOGIN_URL = "/api/login";

const API_URL = "/api/admin/leads";


let adminSession =
localStorage.getItem("admin_session");




// Login button

const loginBtn =
document.getElementById("loginBtn");


if(loginBtn){

loginBtn.addEventListener(
"click",
login
);

}




// Refresh button

const refreshBtn =
document.getElementById("refreshBtn");


if(refreshBtn){

refreshBtn.addEventListener(
"click",
loadLeads
);

}




// Logout button

const logoutBtn =
document.getElementById("logoutBtn");


if(logoutBtn){

logoutBtn.addEventListener(
"click",
logout
);

}




// Close details button

const closeBtn =
document.getElementById("closeDetails");


if(closeBtn){

closeBtn.addEventListener(
"click",
()=>{


const box =
document.getElementById(
"leadDetails"
);


if(box){

box.classList.add(
"hidden"
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



const loginBox =
document.getElementById(
"loginBox"
);


const panel =
document.getElementById(
"panel"
);



if(loginBox){

loginBox.classList.add(
"hidden"
);

}



if(panel){

panel.classList.remove(
"hidden"
);

}



loadLeads();


}









function logout(){


localStorage.removeItem(
"admin_session"
);



adminSession = null;



location.reload();


}









async function loadLeads(){


const response =
await fetch(

API_URL,

{

headers:{

"Authorization":

"Bearer " + adminSession

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



if(!tbody){

return;

}



tbody.innerHTML = "";





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

<select id="status-${lead.id}">


<option ${lead.status==="New"?"selected":""}>
New
</option>


<option ${lead.status==="Reviewed"?"selected":""}>
Reviewed
</option>


<option ${lead.status==="Contacted"?"selected":""}>
Contacted
</option>


<option ${lead.status==="Qualified"?"selected":""}>
Qualified
</option>


<option ${lead.status==="Proposal Sent"?"selected":""}>
Proposal Sent
</option>


<option ${lead.status==="Won"?"selected":""}>
Won
</option>


<option ${lead.status==="Lost"?"selected":""}>
Lost
</option>


</select>

</td>




<td>


<button onclick="updateStatus('${lead.id}')">
Save
</button>


<button onclick='viewLead(${JSON.stringify(lead)})'>
View
</button>


</td>


`;



tbody.appendChild(row);



}

);



}









async function updateStatus(id){



const select =
document.getElementById(
"status-" + id
);



if(!select){

return;

}



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
"Bearer " + adminSession

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


alert(
"Status updated"
);



loadLeads();


}
else{


alert(
data.error || "Update failed"
);


}



}









function viewLead(lead){



const box =
document.getElementById(
"leadDetails"
);



const content =
document.getElementById(
"detailsContent"
);




if(!box || !content){

return;

}





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


`;



box.classList.remove(
"hidden"
);


}
