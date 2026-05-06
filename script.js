// ---------- DEFAULT SERVERS ----------
let servers = [
    { id: "1", name: "BDCraft PvP", ip: "mc.hypixel.net", category: "PvP", description: "Competitive PvP arena", logo: "", votes: 124, createdAt: Date.now() },
    { id: "2", name: "Bangla Skyblock", ip: "minemalia.com", category: "Skyblock", description: "Island skyblock fun", logo: "", votes: 89, createdAt: Date.now() },
    { id: "3", name: "Lifesteal Legacy", ip: "play.lifestealbd.com", category: "Lifesteal", description: "Steal hearts & dominate", logo: "", votes: 210, createdAt: Date.now() },
    { id: "4", name: "Factions Extreme", ip: "veltpvp.com", category: "Factions", description: "Epic faction wars", logo: "", votes: 56, createdAt: Date.now() },
    { id: "5", name: "Bedwar Rush", ip: "saicopvp.com", category: "Bedwar", description: "Fast bedwars action", logo: "", votes: 332, createdAt: Date.now() }
];
let pendingPromotions = []; // store submitted servers from users
let currentFilter = "all"; // all, trending, newest
let searchQuery = "";
let adminUnlocked = false;
let currentPage = "home";

// Helper: generate unique id
function generateId() { return Date.now() + "-" + Math.random().toString(36).substr(2, 6); }

// Load/Save localStorage
function loadData() {
    const savedServers = localStorage.getItem("bmc_servers");
    if (savedServers) servers = JSON.parse(savedServers);
    const savedPending = localStorage.getItem("bmc_pending");
    if (savedPending) pendingPromotions = JSON.parse(savedPending);
    // ensure each server has votes and createdAt
    servers.forEach(s => { if (!s.votes) s.votes = 0; if (!s.createdAt) s.createdAt = Date.now(); });
    saveAll();
}
function saveAll() {
    localStorage.setItem("bmc_servers", JSON.stringify(servers));
    localStorage.setItem("bmc_pending", JSON.stringify(pendingPromotions));
}
// Fetch realtime data from mcsrvstat
async function fetchServerStatus(ip) {
    try {
        const res = await fetch(`https://api.mcsrvstat.us/2/${ip}`);
        const data = await res.json();
        if (data.online) {
            let cleanMotd = "";
            if (data.motd && data.motd.clean) cleanMotd = Array.isArray(data.motd.clean) ? data.motd.clean.join(" ") : data.motd.clean;
            else cleanMotd = "Minecraft Server";
            return {
                online: true,
                players: data.players?.online || 0,
                motd: cleanMotd.substring(0, 60),
                ping: data.ping || 45,
                version: data.version || "?"
            };
        } else {
            return { online: false, players: 0, motd: "Offline", ping: "-", version: "-" };
        }
    } catch(e) {
        return { online: false, players: 0, motd: "Error", ping: "-", version: "-" };
    }
}

// Render Home/Explore/Leaderboard
async function renderAll() {
    let filtered = [...servers];
    if (searchQuery) filtered = filtered.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.ip.toLowerCase().includes(searchQuery.toLowerCase()));
    if (currentFilter === "trending") filtered.sort((a,b) => b.votes - a.votes);
    else if (currentFilter === "newest") filtered.sort((a,b) => b.createdAt - a.createdAt);
    else filtered.sort((a,b) => b.votes - a.votes); // default by votes

    // update stats
    document.getElementById("totalServersCount").innerText = servers.length;
    document.getElementById("totalVotesCount").innerText = servers.reduce((sum,s)=>sum+s.votes,0);

    // Home page servers container (cards)
    const container = document.getElementById("serversContainer");
    if (container) {
        container.innerHTML = `<div class="col-span-full text-center py-10"><i class="fas fa-spinner fa-pulse"></i> Fetching live data...</div>`;
        let cardsHtml = '';
        for (let s of filtered) {
            const status = await fetchServerStatus(s.ip);
            const logoUrl = s.logo && s.logo.trim() !== "" ? s.logo : "https://via.placeholder.com/56?text=MC";
            const onlineStatus = status.online ? `<span class="status-online">🟢 ${status.players} online</span>` : `<span class="status-offline">🔴 Offline</span>`;
            const motdShort = status.motd ? status.motd.substring(0, 50) : "No MOTD";
            cardsHtml += `
                <div class="bg-gray-800 rounded-xl overflow-hidden shadow-lg card-hover transition">
                    <div class="p-5">
                        <div class="flex gap-4 items-start">
                            <img src="${logoUrl}" class="server-logo w-14 h-14 rounded-xl object-cover" onerror="this.src='https://via.placeholder.com/56'">
                            <div class="flex-1">
                                <h3 class="text-xl font-bold">${escapeHtml(s.name)}</h3>
                                <p class="text-gray-400 text-sm mb-1">${escapeHtml(s.ip)}</p>
                                <span class="inline-block bg-gray-700 rounded-full px-2 py-0.5 text-xs">${s.category}</span>
                            </div>
                        </div>
                        <p class="mt-3 text-gray-300 text-sm">${escapeHtml(s.description || "No description")}</p>
                        <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <div><i class="fas fa-comment-dots text-yellow-400"></i> ${escapeHtml(motdShort)}</div>
                            <div class="ping-badge"><i class="fas fa-tachometer-alt"></i> ${status.ping !== "-" ? status.ping+"ms" : "-"}</div>
                        </div>
                        <div class="mt-3 flex justify-between items-center border-t border-gray-700 pt-3">
                            <div class="flex items-center gap-1"><i class="fas fa-thumbs-up text-yellow-400"></i> <span class="font-bold">${s.votes}</span> votes</div>
                            <button class="vote-btn bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-black px-3 py-1 rounded-full text-sm transition" data-id="${s.id}"><i class="fas fa-vote-yea"></i> Vote</button>
                        </div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = cardsHtml || `<div class="col-span-full text-center py-10">No servers found</div>`;
        attachVoteEvents();
    }

    // Explore container (same cards but no filters)
    const exploreContainer = document.getElementById("exploreContainer");
    if (exploreContainer && currentPage === "explore") {
        exploreContainer.innerHTML = `<div class="col-span-full text-center py-10"><i class="fas fa-spinner fa-pulse"></i> Loading...</div>`;
        let expHtml = '';
        for (let s of servers) {
            const status = await fetchServerStatus(s.ip);
            const logoUrl = s.logo || "https://via.placeholder.com/56";
            expHtml += `<div class="bg-gray-800 rounded-xl p-4 flex gap-4 items-center"><img src="${logoUrl}" class="w-12 h-12 rounded-lg object-cover"><div><h4 class="font-bold">${escapeHtml(s.name)}</h4><p class="text-xs text-gray-400">${s.ip}</p><span class="text-xs ${status.online ? 'text-green-400' : 'text-orange-400'}">${status.online ? status.players+" online" : "offline"}</span></div><div class="ml-auto"><button class="vote-btn-sm bg-yellow-500/20 px-2 py-1 rounded text-sm" data-id="${s.id}">Vote</button></div></div>`;
        }
        exploreContainer.innerHTML = expHtml;
        attachVoteEvents();
    }

    // Leaderboard
    const leaderboardBody = document.getElementById("leaderboardBody");
    if (leaderboardBody) {
        let sortedByVotes = [...servers].sort((a,b)=>b.votes - a.votes).slice(0,10);
        let rows = '';
        sortedByVotes.forEach((s,idx) => {
            rows += `<tr class="border-b border-gray-700"><td class="py-3 px-4">#${idx+1}</td><td class="py-3 px-4 font-bold">${escapeHtml(s.name)}</td><td class="py-3 px-4">${s.category}</td><td class="py-3 px-4">${s.votes}</td></tr>`;
        });
        leaderboardBody.innerHTML = rows || '<tr><td colspan="4" class="text-center py-6">No data</td></tr>';
    }
}

function attachVoteEvents() {
    document.querySelectorAll('.vote-btn, .vote-btn-sm').forEach(btn => {
        btn.removeEventListener('click', handleVote);
        btn.addEventListener('click', handleVote);
    });
}
function handleVote(e) {
    const id = e.currentTarget.getAttribute('data-id');
    const server = servers.find(s => s.id === id);
    if (server) { server.votes += 1; saveAll(); renderAll(); }
}
function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){ if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId + 'Page').classList.remove('hidden');
    currentPage = pageId;
    if (pageId === 'explore') renderAll();
    if (pageId === 'leaderboard') renderAll();
    if (pageId === 'home') renderAll();
    // update active nav links
    document.querySelectorAll('.nav-link, .nav-link-mobile').forEach(link => {
        link.classList.remove('active', 'text-yellow-400');
        if (link.getAttribute('data-page') === pageId) link.classList.add('active', 'text-yellow-400');
    });
}

// Admin functions
function unlockAdmin(code) {
    if (code === "3233") {
        adminUnlocked = true;
        localStorage.setItem("bmc_admin_unlocked", "true");
        alert("✅ Admin unlocked! You can now manage servers.");
        refreshAdminPanel();
        document.getElementById("adminUnlockArea").style.display = "none";
        document.getElementById("adminFeatures").style.display = "block";
        return true;
    }
    alert("❌ Wrong code");
    return false;
}
function refreshAdminPanel() {
    if (!adminUnlocked) return;
    const adminServerListDiv = document.getElementById("adminServerList");
    if (adminServerListDiv) {
        let html = '';
        servers.forEach((s, idx) => {
            html += `<div class="flex justify-between items-center bg-gray-700 p-2 rounded"><span><b>${escapeHtml(s.name)}</b> (${s.ip}) [${s.category}]</span><button class="delServerAdmin bg-red-600 px-2 py-1 rounded text-sm" data-idx="${idx}">Delete</button></div>`;
        });
        adminServerListDiv.innerHTML = html;
        document.querySelectorAll(".delServerAdmin").forEach(btn => {
            btn.addEventListener("click", (e) => {
                let idx = btn.getAttribute("data-idx");
                if (confirm("Delete server?")) { servers.splice(idx,1); saveAll(); refreshAdminPanel(); renderAll(); }
            });
        });
    }
    const pendingDiv = document.getElementById("pendingPromotionsList");
    if (pendingDiv) {
        if (pendingPromotions.length === 0) pendingDiv.innerHTML = "<div class='text-gray-400'>No pending promotions</div>";
        else {
            let pendHtml = '';
            pendingPromotions.forEach((p, idx) => {
                pendHtml += `<div class="bg-gray-700 p-2 rounded mb-2"><b>${escapeHtml(p.name)}</b> (${p.ip}) [${p.category}]<br>${escapeHtml(p.desc)}<br><button class="approvePromo bg-green-600 text-xs px-2 py-1 rounded mt-1" data-idx="${idx}">✅ Approve</button> <button class="rejectPromo bg-orange-600 text-xs px-2 py-1 rounded" data-idx="${idx}">❌ Reject</button></div>`;
            });
            pendingDiv.innerHTML = pendHtml;
            document.querySelectorAll(".approvePromo").forEach(btn => {
                btn.addEventListener("click", (e) => { let idx = btn.getAttribute("data-idx"); let promo = pendingPromotions[idx]; let newServer = { id: generateId(), name: promo.name, ip: promo.ip, category: promo.category, description: promo.desc, logo: promo.logo || "", votes: 0, createdAt: Date.now() }; servers.push(newServer); saveAll(); pendingPromotions.splice(idx,1); saveAll(); refreshAdminPanel(); renderAll(); });
            });
            document.querySelectorAll(".rejectPromo").forEach(btn => {
                btn.addEventListener("click", (e) => { let idx = btn.getAttribute("data-idx"); pendingPromotions.splice(idx,1); saveAll(); refreshAdminPanel(); });
            });
        }
    }
}
// Add new server via admin
document.getElementById("addNewServerAdmin")?.addEventListener("click", () => {
    let name = prompt("Server name");
    let ip = prompt("IP address");
    let cat = prompt("Category (PvP, Skyblock, Lifesteal, Factions, Bedwar, Peaceful)");
    if (name && ip) {
        servers.push({ id: generateId(), name, ip, category: cat || "PvP", description: "", logo: "", votes: 0, createdAt: Date.now() });
        saveAll(); refreshAdminPanel(); renderAll();
    }
});
// Export/Import
document.getElementById("exportDataBtn")?.addEventListener("click", () => {
    const dataStr = JSON.stringify(servers, null, 2);
    const blob = new Blob([dataStr], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = "bmc_servers_backup.json"; a.click(); URL.revokeObjectURL(url);
});
document.getElementById("importDataTrigger")?.addEventListener("click", () => document.getElementById("importFileInput").click());
document.getElementById("importFileInput")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try { const imported = JSON.parse(ev.target.result); if (Array.isArray(imported)) { servers = imported; servers.forEach(s => { if (!s.id) s.id = generateId(); if (!s.votes) s.votes=0; if (!s.createdAt) s.createdAt=Date.now(); }); saveAll(); renderAll(); refreshAdminPanel(); alert("Import successful"); } else alert("Invalid format"); } catch(e) { alert("Invalid JSON"); }
    };
    reader.readAsText(file);
});
// Apply color customization
function applyColor(color) {
    let style = document.createElement('style');
    style.textContent = `.bg-yellow-500 { background-color: ${color} !important; } .text-yellow-400, .text-yellow-500, .nav-link.active { color: ${color} !important; } .bg-gradient-to-r { background-image: linear-gradient(to right, ${color}, #ffdd77) !important; } .border-yellow-400 { border-color: ${color} !important; } .focus\\:ring-yellow-500:focus { --tw-ring-color: ${color} !important; }`;
    document.head.appendChild(style);
    localStorage.setItem("bmc_theme_color", color);
}
// Event listeners on DOM load
document.addEventListener("DOMContentLoaded", () => {
    loadData();
    // Navigation events
    document.querySelectorAll('.nav-link, .nav-link-mobile').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); const page = link.getAttribute('data-page'); if(page) showPage(page); });
    });
    document.getElementById("mobileMenuBtn").onclick = () => { document.getElementById("mobileMenu").classList.toggle("hidden"); };
    document.getElementById("listServerBtn").onclick = () => showPage("addserver");
    document.getElementById("adminMenuBtn").onclick = () => document.getElementById("adminModal").classList.remove("hidden");
    document.getElementById("closeAdminModal").onclick = () => document.getElementById("adminModal").classList.add("hidden");
    document.getElementById("verifyAdminBtn").onclick = () => { const code = document.getElementById("adminCode").value; if(unlockAdmin(code)) { document.getElementById("adminUnlockArea").style.display = "none"; document.getElementById("adminFeatures").style.display = "block"; } };
    document.getElementById("applyColor").onclick = () => { const col = document.getElementById("uiColor").value; applyColor(col); };
    // Filters
    document.getElementById("filterAll").onclick = () => { currentFilter="all"; document.querySelectorAll(".filter-chip").forEach(c=>c.classList.remove("active","bg-yellow-500","text-black")); document.getElementById("filterAll").classList.add("active","bg-yellow-500","text-black"); renderAll(); };
    document.getElementById("filterTrending").onclick = () => { currentFilter="trending"; document.querySelectorAll(".filter-chip").forEach(c=>c.classList.remove("active","bg-yellow-500","text-black")); document.getElementById("filterTrending").classList.add("active","bg-yellow-500","text-black"); renderAll(); };
    document.getElementById("filterNewest").onclick = () => { currentFilter="newest"; document.querySelectorAll(".filter-chip").forEach(c=>c.classList.remove("active","bg-yellow-500","text-black")); document.getElementById("filterNewest").classList.add("active","bg-yellow-500","text-black"); renderAll(); };
    document.getElementById("searchInput").addEventListener("input", (e) => { searchQuery = e.target.value; renderAll(); });
    // Add server form (user)
    document.getElementById("addServerForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("serverName").value.trim();
        const ip = document.getElementById("serverIp").value.trim();
        const category = document.getElementById("serverCategory").value;
        const desc = document.getElementById("serverDesc").value.trim();
        const logo = document.getElementById("serverLogo").value.trim();
        if(!name || !ip) { alert("Name and IP required"); return; }
        pendingPromotions.push({ name, ip, category, desc, logo });
        saveAll();
        alert("Your server has been submitted for admin review. Thank you!");
        document.getElementById("addServerForm").reset();
        showPage("home");
    });
    // Admin unlock from footer? (optional but we have modal)
    if (localStorage.getItem("bmc_admin_unlocked") === "true") { adminUnlocked = true; refreshAdminPanel(); }
    const savedColor = localStorage.getItem("bmc_theme_color"); if(savedColor) applyColor(savedColor);
    showPage("home");
});