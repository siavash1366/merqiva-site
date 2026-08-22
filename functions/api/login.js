async function login(){

const token =
document.getElementById("token").value.trim();


if(!token){
    return;
}


const response =
await fetch("/api/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
token
})

});


const data =
await response.json();


if(data.success){


localStorage.setItem(
"admin_session",
data.session
);


adminSession =
data.session;


showPanel();


}
else{


document.getElementById("loginError")
.innerText =
"Invalid token";


}


}
