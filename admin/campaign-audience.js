// admin/campaign-audience.js


const LEADS_URL =
"/api/admin/leads";


const CAMPAIGN_URL =
"/api/admin/campaigns";


const RECIPIENT_URL =
"/api/admin/campaign-recipients";



let session =
localStorage.getItem(
"admin_session"
);



let campaigns = [];

let leads = [];

let selected = [];

let currentCampaign = "";




// GET CAMPAIGN FROM URL

const urlParams =
new URLSearchParams(
window.location.search
);


const campaignFromUrl =
urlParams.get(
"campaign"
);


if(campaignFromUrl){

currentCampaign =
campaignFromUrl;

}




// --------------------
// INIT
// --------------------


document
.addEventListener(
"DOMContentLoaded",
()=>{


document
.getElementById("campaignSelect")
?.addEventListener(
"change",
e=>{


currentCampaign =
e.target.value;


loadRecipients();


}
);




document
.getElementById("filterBtn")
?.addEventListener(
"click",
loadLeads
);





document
.getElementById("saveAudienceBtn")
?.addEventListener(
"click",
saveAudience
);




loadCampaigns();

loadLeads();



}

);








// --------------------
// LOAD CAMPAIGNS
// --------------------


async function loadCampaigns(){


const res =
await fetch(

CAMPAIGN_URL,

{

headers:{

"Authorization":
"Bearer "+session

}

}

);



const data =
await res.json();




if(!data.success)
return;



campaigns =
data.campaigns || [];




const select =
document.getElementById(
"campaignSelect"
);



if(!select)
return;




select.innerHTML =

`
<option value="">
Select Campaign
</option>
`;





campaigns.forEach(

campaign=>{


select.innerHTML +=

`
<option value="${campaign.id}">
${campaign.name}
</option>

`;

}

);





if(currentCampaign){


select.value =
currentCampaign;


loadRecipients();


}



}









// --------------------
// LOAD LEADS
// --------------------


async function loadLeads(){



const search =
document
.getElementById(
"searchAudience"
)
?.value || "";



const status =
document
.getElementById(
"statusFilter"
)
?.value || "";



const country =
document
.getElementById(
"countryFilter"
)
?.value || "";





const params =
new URLSearchParams({

page:1,

limit:100,

search,

status

});






const res =
await fetch(

`${LEADS_URL}?${params}`,

{

headers:{

"Authorization":
"Bearer "+session

}

}

);






const data =
await res.json();






if(!data.success)
return;





leads =
(data.leads || [])
.filter(

lead=>

!country ||
lead.country === country

);






renderLeads();





}









// --------------------
// RENDER LEADS
// --------------------


function renderLeads(){



const table =
document.getElementById(
"audienceTable"
);



if(!table)
return;



table.innerHTML = "";





leads.forEach(

lead=>{



table.innerHTML +=

`

<tr>

<td>

<input

type="checkbox"

class="leadCheck"

data-id="${lead.id}"

${selected.includes(lead.id) ? "checked":""}

/>

</td>


<td>
${lead.name || ""}
</td>


<td>
${lead.email || ""}
</td>


<td>
${lead.company || ""}
</td>


<td>
${lead.country || ""}
</td>


<td>
${lead.status || ""}
</td>


</tr>

`;



}

);







document
.querySelectorAll(
".leadCheck"
)
.forEach(

checkbox=>{


checkbox.addEventListener(

"change",

()=>{


const id =
checkbox.dataset.id;




if(
checkbox.checked
){


if(
!selected.includes(id)
){

selected.push(id);

}


}
else{


selected =
selected.filter(

item=>
item !== id

);


}



updateCount();



}

);


}

);



updateCount();


}









// --------------------
// SAVE AUDIENCE
// --------------------


async function saveAudience(){



if(!currentCampaign){


alert(
"Select campaign first"
);


return;


}





const res =
await fetch(

RECIPIENT_URL,

{

method:"POST",

headers:{


"Content-Type":
"application/json",


"Authorization":
"Bearer "+session


},


body:

JSON.stringify({

campaignId:
currentCampaign,


recipients:
selected


})


}

);






const data =
await res.json();





if(data.success){


alert(
"Audience saved"
);


}
else{


alert(
data.error ||
"Save failed"
);


}



}









// --------------------
// LOAD RECIPIENTS
// --------------------


async function loadRecipients(){



if(!currentCampaign)
return;






const res =
await fetch(

`${RECIPIENT_URL}?campaignId=${currentCampaign}`,

{

headers:{


"Authorization":
"Bearer "+session


}

}

);






const data =
await res.json();






if(data.success){



selected =
data.recipients || [];



updateCount();


renderLeads();



}



}









// --------------------
// COUNTER
// --------------------


function updateCount(){


const count =
document.getElementById(
"selectedCount"
);



if(count){

count.innerText =
selected.length;

}


}
