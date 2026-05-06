// Default server list with IP for realtime data
let servers = [
    { rank:1, name:"MCPVP", category:"PVP", ip:"mc.hypixel.net", description:"Competitive PvP", logoUrl:"https://i.imgur.com/placeholder.png", version:"1.8-1.20" },
    { rank:2, name:"Hypixel Network", category:"SKYBLOCK", ip:"mc.hypixel.net", description:"Largest minigames", logoUrl:"", version:"1.8+" },
    { rank:3, name:"MineMalia", category:"PVP", ip:"minemalia.com", description:"Factions & Skyblock", logoUrl:"", version:"1.19" },
    { rank:4, name:"VeltPvP", category:"PVP", ip:"veltpvp.com", description:"Practice PvP", logoUrl:"", version:"1.7-1.20" },
    { rank:5, name:"SaicoPvP", category:"FACTIONS", ip:"saicopvp.com", description:"Epic Factions", logoUrl:"", version:"1.8-1.18" }
];

let pendingServers = [];
let adminUnlocked = false;
let currentCategory = "all";

// Load from localStorage
function loadLocalData() {
    let saved = localStorage.getItem("mineTiers_servers");
    if(saved) servers = JSON.parse(saved);
    let savedPending = localStorage.getItem("mineTiers_pending");
    if(savedPending) pendingServers = JSON.parse(savedPending);
    servers.forEach((s,idx)=> s.rank = idx+1);
    renderTable();
}
function saveServers() { localStorage.setItem("mineTiers_servers", JSON.stringify(servers)); }
function savePending() { localStorage.setItem("mineTiers_pending", JSON.stringify(pendingServers)); }

// Fetch realtime data from mcsrvstat.us
async function fetchServerStatus(ip) {
    if(!ip) return null;
    try {
        const res = await fetch(`https://api.mcsrvstat.us/2/${ip}`);
        const data = await res.json();
        if(data.online) {
            return {
                online: true,
                players: data.players?.online || 0,
                motd: data.motd?.clean?.[0] || data.motd?.clean || "Minecraft Server",
                ping: data.ping || 50,
                version: data.version || "?"
            };
        } else {
            return { online: false, players: 0, motd: "Offline", ping: "-", version: "-" };
        }
    } catch(e) {
        return { online: false, players: 0, motd: "Error", ping: "-", version: "-" };
    }
}

async function renderTable() {
    let filtered = (currentCategory === "all") ? servers : servers.filter(s => s.category === currentCategory);
    const tbody = document.getElementById("tableBody");
    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center">No servers in this category</td></tr>`;
        document.getElementById("globalStats").innerText = `Total: 0 servers | Online: 0 players`;
        return;
    }
    tbody.innerHTML = `<tr><td colspan="8"><div class="stats">Loading realtime data...</div></td></tr>`;
    let rowsHtml = '';
    let totalOnline = 0;
    for(let i=0; i<filtered.length; i++) {
        const s = filtered[i];
        const status = await fetchServerStatus(s.ip);
        if(status && status.online) totalOnline += status.players;
        const onlineText = status?.online ? `<span style="color:#6fcf97">🟢 ${status.players}</span>` : `<span style="color:#e67e22">🔴 offline</span>`;
        const motdText = status?.motd ? (status.motd.substring(0,40)) : "No MOTD";
        const pingText = status?.ping ? `${status.ping}ms` : "-";
        const versionText = status?.version || s.version || "?";
        const logo = s.logoUrl ? `<img src="${s.logoUrl}" class="logo-img" onerror="this.src='https://via.placeholder.com/36'">` : `<div class="logo-img" style="background:#2c2f36; display:flex; align-items:center; justify-content:center;">📦</div>`;
        rowsHtml += `
            <tr>
                <td>${s.rank}</td>
                <td>${logo}</td>
                <td><strong>${s.name}</strong><br><span style="font-size:0.7rem; color:#aaa;">${s.description||''}</span></td>
                <td><span class="status-badge">${s.category}</span></td>
                <td>${motdText}</td>
                <td>${onlineText}</td>
                <td class="ping">${pingText}</td>
                <td>${versionText}</td>
            </tr>
        `;
    }
    tbody.innerHTML = rowsHtml;
    document.getElementById("globalStats").innerText = `📊 TOTAL SERVERS: ${filtered.length} | ONLINE PLAYERS: ${totalOnline}`;
}

function exportJson() {
    const dataStr = JSON.stringify(servers, null, 2);
    const blob = new Blob([dataStr], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "minecraft_bd_rankings.json";
    a.click();
    URL.revokeObjectURL(url);
}

// Promote modal
function openPromote() { document.getElementById("promoteModal").style.display = "flex"; }
function closePromote() { document.getElementById("promoteModal").style.display = "none"; }
function submitPromote() {
    const name = document.getElementById("promoName").value.trim();
    const ip = document.getElementById("promoIp").value.trim();
    const cat = document.getElementById("promoCat").value;
    const desc = document.getElementById("promoDesc").value.trim();
    const logo = document.getElementById("promoLogo").value.trim();
    if(!name || !ip) { alert("Server name and IP required"); return; }
    pendingServers.push({ name, ip, category:cat, description:desc, logoUrl:logo });
    savePending();
    alert("Promotion request sent! Admin can approve it.");
    closePromote();
    if(adminUnlocked) refreshAdminPanel();
}

// Admin functions
function unlockAdmin(code) {
    if(code === "3233") {
        adminUnlocked = true;
        localStorage.setItem("admin_unlocked", "true");
        alert("Admin unlocked! You can now customize UI and manage servers.");
        refreshAdminPanel();
        return true;
    }
    return false;
}

function refreshAdminPanel() {
    if(!adminUnlocked) return;
    const pendingDiv = document.getElementById("pendingList");
    if(pendingDiv) {
        if(pendingServers.length===0) pendingDiv.innerHTML = "No pending requests.";
        else {
            let html = "";
            pendingServers.forEach((p,idx) => {
                html += `<div style="background:#2c2f36; margin:8px 0; padding:8px;"><b>${p.name}</b> (${p.ip}) [${p.category}]<br>${p.description}<br>
                <button class="approve-promo" data-idx="${idx}">✅ Approve</button>
                <button class="reject-promo" data-idx="${idx}">❌ Reject</button></div>`;
            });
            pendingDiv.innerHTML = html;
            document.querySelectorAll(".approve-promo").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    let idx = btn.getAttribute("data-idx");
                    let promo = pendingServers[idx];
                    let newServer = { rank: servers.length+1, name: promo.name, category: promo.category, ip: promo.ip, description: promo.description, logoUrl: promo.logoUrl, version:"1.8+" };
                    servers.push(newServer);
                    servers.forEach((s,ind)=> s.rank = ind+1);
                    saveServers();
                    pendingServers.splice(idx,1);
                    savePending();
                    refreshAdminPanel();
                    renderTable();
                });
            });
            document.querySelectorAll(".reject-promo").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    let idx = btn.getAttribute("data-idx");
                    pendingServers.splice(idx,1);
                    savePending();
                    refreshAdminPanel();
                });
            });
        }
    }
    const editDiv = document.getElementById("serverEditList");
    if(editDiv) {
        let editHtml = "";
        servers.forEach((s,i) => {
            editHtml += `<div style="border-bottom:1px solid #2c2f36; padding:6px;"><b>${s.name}</b> (${s.ip}) <button class="delServer" data-index="${i}">🗑 Delete</button></div>`;
        });
        editHtml += `<button id="addNewServerBtn">➕ Add new server</button>`;
        editDiv.innerHTML = editHtml;
        document.querySelectorAll(".delServer").forEach(btn => {
            btn.addEventListener("click", (e) => {
                let idx = btn.getAttribute("data-index");
                servers.splice(idx,1);
                servers.forEach((s,ind)=> s.rank = ind+1);
                saveServers();
                refreshAdminPanel();
                renderTable();
            });
        });
        const addBtn = document.getElementById("addNewServerBtn");
        if(addBtn) {
            addBtn.addEventListener("click", () => {
                let newName = prompt("Server name");
                let newIp = prompt("IP address");
                let newCat = prompt("Category (PVP, SKYBLOCK, etc)", "PVP");
                if(newName && newIp) {
                    servers.push({ rank: servers.length+1, name:newName, category:newCat, ip:newIp, description:"", logoUrl:"", version:"1.8+" });
                    servers.forEach((s,ind)=> s.rank = ind+1);
                    saveServers();
                    refreshAdminPanel();
                    renderTable();
                }
            });
        }
    }
}

function applyColor(color) {
    let style = document.createElement('style');
    style.textContent = `
        .tab.active { background: ${color} !important; border-color:${color}; }
        .menu-btn { color: ${color}; }
        .mine-header h1 { background: linear-gradient(135deg, ${color}, #ffdd77); -webkit-background-clip: text; background-clip: text; color: transparent; }
    `;
    document.head.appendChild(style);
}

// Event binding
document.addEventListener("DOMContentLoaded", () => {
    loadLocalData();
    // Category tabs
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
            tab.classList.add("active");
            currentCategory = tab.getAttribute("data-cat");
            renderTable();
        });
    });
    document.getElementById("promoteBtn").onclick = openPromote;
    document.getElementById("exportJsonBtn").onclick = exportJson;
    document.getElementById("adminPanelBtn").onclick = () => { document.getElementById("adminModal").style.display = "flex"; };
    document.getElementById("closePromoModal").onclick = closePromote;
    document.getElementById("submitPromo").onclick = submitPromote;
    document.getElementById("closeAdmin").onclick = () => document.getElementById("adminModal").style.display = "none";
    document.getElementById("verifyAdmin").onclick = () => {
        let code = document.getElementById("adminCode").value;
        if(unlockAdmin(code)) {
            document.getElementById("adminUnlockArea").style.display = "none";
            document.getElementById("adminFeatures").style.display = "block";
        } else alert("Wrong code");
    };
    document.getElementById("applyColor").onclick = () => {
        let col = document.getElementById("uiColor").value;
        applyColor(col);
        localStorage.setItem("ui_color", col);
    };
    document.getElementById("adminUnlockHint").onclick = () => {
        let code = prompt("Enter admin code (3233):");
        if(code === "3233") {
            adminUnlocked = true;
            localStorage.setItem("admin_unlocked","true");
            alert("Admin unlocked! Open Admin panel from menu.");
            refreshAdminPanel();
        } else alert("Invalid");
    };
    if(localStorage.getItem("admin_unlocked") === "true") {
        adminUnlocked = true;
        refreshAdminPanel();
    }
    let savedColor = localStorage.getItem("ui_color");
    if(savedColor) applyColor(savedColor);
});