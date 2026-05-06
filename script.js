let data = [];
let visible = 0;

fetch("data.json")
.then(r => r.json())
.then(d => {
  data = d.servers;
  load();
});

async function getStatus(ip){
  let res = await fetch(`https://api.mcsrvstat.us/2/${ip}`);
  let d = await res.json();

  return {
    players: d.players ? d.players.online : 0,
    max: d.players ? d.players.max : 0,
    online: d.online
  };
}

async function load(){
  let feed = document.getElementById("feed");

  for(let i=0;i<5;i++){
    let s = data[visible];
    if(!s) return;

    let status = await getStatus(s.ip);

    let card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${s.image}">
      <div>
        <h3>#${visible+1} ${s.title}</h3>
        <p>${s.ip}</p>
        <p>Players: ${status.players}/${status.max}</p>
        <p>${status.online ? "🟢 Online" : "🔴 Offline"}</p>
      </div>
    `;

    feed.appendChild(card);
    visible++;
  }
}

document.getElementById("loadMore").onclick = load;

function openAdmin(){
  let code = prompt("Enter Admin Code:");

  if(code === "3233"){
    window.location.href = "admin.html";
  } else {
    alert("Wrong Code");
  }
}

document.getElementById("menuBtn").onclick = ()=>{
  document.getElementById("sidebar").classList.toggle("show");
};