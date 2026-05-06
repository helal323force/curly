// ---------- STORAGE KEYS ----------
let servers = [];
let pendingServers = [];
let userVotes = JSON.parse(localStorage.getItem('bmc_votes')) || {};
let adminUnlocked = false;

// Load initial data + fallback demo servers
function loadDemoData() {
  const saved = localStorage.getItem('bmc_servers');
  if(saved && JSON.parse(saved).length > 0) {
    servers = JSON.parse(saved);
  } else {
    servers = [
      { id: Date.now()+1, name:"PixelCraft SMP", ip:"play.pixelcraftbd.net", category:"Survival", description:"Java+Bedrock | Friendly community", logo:"", votes:12, version:"1.20+", players:0, motd:"", ping:"..." },
      { id: Date.now()+2, name:"NetherZone PvP", ip:"pvp.netherzonebd.com", category:"PvP", description:"Intense KitPvP & Duels", logo:"", votes:8, version:"1.8-1.20", players:0, motd:"", ping:"..." },
      { id: Date.now()+3, name:"The Knights Of BD", ip:"theknightsofbd.mcsh.io:11772", category:"Factions", description:"Land claiming | Raids", logo:"", votes:5, version:"1.19+", players:0, motd:"", ping:"..." },
      { id: Date.now()+4, name:"HavenCraft", ip:"mc.havencraft.pro:25666", category:"Survival", description":"SMP | Claims | Quests", logo:"", votes:10, version:"1.20+", players:0, motd:"", ping:"..." },
      { id: Date.now()+5, name:"FIRESTORM SMP", ip:"play.firestrom.fun:25881", category:"Lifesteal", description:"Lifesteal + PvP", logo:"", votes:3, version:"1.20+", players:0, motd:"", ping:"..." }
    ];
    saveServers();
  }
  const pendingSaved = localStorage.getItem('bmc_pending');
  if(pendingSaved) pendingServers = JSON.parse(pendingSaved); else pendingServers = [];
}

function saveServers() { localStorage.setItem('bmc_servers', JSON.stringify(servers)); updateStatsUI(); }
function savePending() { localStorage.setItem('bmc_pending', JSON.stringify(pendingServers)); }

// Helper: Update total counters
function updateStatsUI() {
  document.getElementById('totalServersCount').innerText = servers.length;
  const totalVotes = servers.reduce((sum,s)=> sum + (s.votes||0),0);
  document.getElementById('totalVotesCount').innerText = totalVotes;
}

// ---------- VOTE LOGIC (Daily cooldown) ----------
function canVoteToday(serverId) {
  const last = userVotes[serverId];
  if(!last) return true;
  const today = new Date().toDateString();
  return last !== today;
}
function recordVote(serverId) {
  userVotes[serverId] = new Date().toDateString();
  localStorage.setItem('bmc_votes', JSON.stringify(userVotes));
}
function addVote(serverId) {
  const idx = servers.findIndex(s => s.id == serverId);
  if(idx !== -1 && canVoteToday(serverId)) {
    servers[idx].votes = (servers[idx].votes || 0) + 1;
    saveServers();
    recordVote(serverId);
    renderCurrentView(); // refresh UI
    return true;
  }
  return false;
}

// ---------- REAL-TIME FETCH (mcsrvstat) ----------
async function enrichServerStatus(server) {
  if(!server.ip) return;
  try {
    const res = await fetch(`https://api.mcsrvstat.us/2/${server.ip}`);
    const data = await res.json();
    if(data.online) {
      server.players = data.players?.online || 0;
      let cleanMotd = "";
      if(data.motd && data.motd.clean) cleanMotd = Array.isArray(data.motd.clean) ? data.motd.clean[0] : data.motd.clean;
      server.motd = cleanMotd || "Minecraft Server";
      server.ping = data.ping || "?";
      server.version = data.version || server.version;
    } else {
      server.players = 0; server.motd = "Offline"; server.ping = "-";
    }
  } catch(e) { console.warn("status error",e); server.players = 0; server.motd = "Error"; server.ping = "-"; }
}

// ---------- RENDER HOME (Server Grid) ----------
let currentCategory = "all";
let searchQuery = "";

function renderServerGrid() {
  const grid = document.getElementById('serverGrid');
  let filtered = [...servers];
  if(currentCategory !== "all") filtered = filtered.filter(s => s.category === currentCategory);
  if(searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.ip.toLowerCase().includes(q) || (s.category && s.category.toLowerCase().includes(q)));
  }
  if(filtered.length === 0) { document.getElementById('noResultsMsg').classList.remove('hidden'); grid.innerHTML = ''; return; }
  document.getElementById('noResultsMsg').classList.add('hidden');
  grid.innerHTML = '';
  filtered.forEach(async (s) => {
    if(!s.players && s.players !== 0) await enrichServerStatus(s);
    const canVote = canVoteToday(s.id);
    const logoHtml = s.logo ? `<img src="${s.logo}" class="w-12 h-12 rounded-xl object-cover bg-gray-800 border border-gray-700" onerror="this.src='https://via.placeholder.com/48?text=MC'">` : `<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-900/40 to-gray-800 flex items-center justify-center text-2xl">🎮</div>`;
    const card = document.createElement('div');
    card.className = 'server-card p-4 flex flex-col gap-3';
    card.innerHTML = `
      <div class="flex gap-3 items-start"><div>${logoHtml}</div><div class="flex-1"><h3 class="font-bold text-lg flex justify-between"><span>${escapeHtml(s.name)}</span><span class="text-xs bg-gray-800 px-2 py-0.5 rounded-full">${s.category || 'Other'}</span></h3><p class="text-xs text-gray-400 font-mono">${s.ip}</p><p class="text-sm text-gray-300 mt-1 line-clamp-2">${escapeHtml(s.description||'')}</p></div></div>
      <div class="flex justify-between items-center text-xs"><span class="status-badge"><i class="fas fa-users mr-1"></i> ${s.players ?? '...'} online</span><span class="status-badge"><i class="fas fa-tachometer-alt"></i> ${s.ping || '?'}ms</span><span class="status-badge"><i class="fab fa-java"></i> ${s.version || '1.8+'}</span></div>
      <div class="flex justify-between items-center"><div><i class="fas fa-heart text-pink-500 mr-1"></i><span class="font-bold">${s.votes || 0}</span> votes</div><button class="vote-btn px-4 py-1.5 rounded-full text-sm font-semibold transition flex items-center gap-1 ${!canVote ? 'opacity-50 cursor-not-allowed' : ''}" data-id="${s.id}" ${!canVote ? 'disabled' : ''}><i class="fas fa-arrow-up"></i> Vote</button></div>
    `;
    grid.appendChild(card);
  });
  document.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { const id = parseInt(btn.getAttribute('data-id')); addVote(id); });
  });
}

function renderLeaderboard() {
  const sorted = [...servers].sort((a,b)=> (b.votes||0) - (a.votes||0));
  const container = document.getElementById('leaderboardList');
  if(!container) return;
  if(sorted.length === 0) { container.innerHTML = '<div class="text-center text-gray-500 py-6">No servers yet.</div>'; return; }
  container.innerHTML = sorted.map((s,idx) => `<div class="bg-gray-800/40 rounded-xl p-3 flex justify-between items-center"><div class="flex items-center gap-3"><span class="text-amber-400 font-bold w-6">#${idx+1}</span><div><p class="font-semibold">${escapeHtml(s.name)}</p><p class="text-xs text-gray-400">${s.ip}</p></div></div><div class="flex items-center gap-4"><span><i class="fas fa-heart text-pink-500"></i> ${s.votes||0}</span><span class="text-xs bg-gray-700 px-2 py-1 rounded-full">${s.category}</span></div></div>`).join('');
}

// ---------- ADMIN LOGIC (hidden code=3233) ----------
function unlockAdmin(code) {
  if(code === "3233") {
    adminUnlocked = true;
    localStorage.setItem('bmc_admin', 'true');
    document.body.classList.add('admin-mode');
    renderPendingList();
    renderManageServerList();
    document.getElementById('adminDashboard').classList.remove('hidden');
    return true;
  } else { document.getElementById('adminErrorMsg').classList.remove('hidden'); return false; }
}
function renderPendingList() {
  const container = document.getElementById('pendingList');
  if(!container) return;
  if(pendingServers.length === 0) { container.innerHTML = '<div class="text-gray-400 italic">✨ No pending submissions.</div>'; return; }
  container.innerHTML = pendingServers.map((p,idx) => `<div class="border-b border-gray-700 py-3 flex justify-between items-center"><div><p class="font-semibold">${escapeHtml(p.name)}</p><p class="text-xs text-gray-400">${p.ip} | ${p.category}</p><p class="text-xs">${escapeHtml(p.desc||'')}</p></div><div class="flex gap-2"><button class="approve-pending bg-green-800 hover:bg-green-700 text-white text-xs px-3 py-1 rounded" data-idx="${idx}">Approve</button><button class="reject-pending bg-red-800 hover:bg-red-700 text-white text-xs px-3 py-1 rounded" data-idx="${idx}">Reject</button></div></div>`).join('');
  document.querySelectorAll('.approve-pending').forEach(btn => btn.addEventListener('click', (e) => { let idx = btn.getAttribute('data-idx'); approvePending(idx); }));
  document.querySelectorAll('.reject-pending').forEach(btn => btn.addEventListener('click', (e) => { let idx = btn.getAttribute('data-idx'); rejectPending(idx); }));
}
function approvePending(idx) {
  const p = pendingServers[idx];
  const newServer = { id: Date.now(), name: p.name, ip: p.ip, category: p.category, description: p.desc, logo: p.logo || '', votes: 0, version: '1.8+', players:0, motd:'', ping:'...' };
  servers.push(newServer);
  saveServers();
  pendingServers.splice(idx,1);
  savePending();
  renderPendingList();
  renderManageServerList();
  renderCurrentView();
}
function rejectPending(idx) { pendingServers.splice(idx,1); savePending(); renderPendingList(); }
function renderManageServerList() {
  const container = document.getElementById('manageServerList');
  if(!container) return;
  if(servers.length === 0) { container.innerHTML = '<div class="text-gray-400 italic">No servers available.</div>'; return; }
  container.innerHTML = servers.map((s,i) => `<div class="flex justify-between items-center border-b border-gray-700 py-2"><div><span class="font-medium">${escapeHtml(s.name)}</span><span class="text-xs text-gray-400 ml-2">${s.ip}</span></div><button class="delete-server bg-red-900/50 hover:bg-red-800 text-red-300 text-xs px-3 py-1 rounded" data-id="${s.id}">Delete</button></div>`).join('');
  document.querySelectorAll('.delete-server').forEach(btn => btn.addEventListener('click', (e) => { const id = parseInt(btn.getAttribute('data-id')); deleteServerById(id); }));
}
function deleteServerById(id) { servers = servers.filter(s => s.id !== id); saveServers(); renderManageServerList(); renderCurrentView(); }
function resetAllVotes() { if(confirm('⚠️ Reset ALL votes for every server? This cannot be undone.')) { servers.forEach(s => s.votes = 0); saveServers(); renderCurrentView(); renderLeaderboard(); alert('All votes reset.'); } }

// Export JSON
function exportAllData() { const data = JSON.stringify({ servers, pendingServers }, null, 2); const blob = new Blob([data], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bmc_full_backup.json'; a.click(); URL.revokeObjectURL(a.href); }

// Navigation & UI helpers
function renderCurrentView() {
  const activeSection = document.querySelector('.nav-link.active')?.getAttribute('data-section') || 'home';
  if(activeSection === 'home') { document.getElementById('homeSection').classList.remove('hidden'); document.getElementById('leaderboardSection').classList.add('hidden'); document.getElementById('addServerSection').classList.add('hidden'); renderServerGrid(); }
  else if(activeSection === 'leaderboard') { document.getElementById('homeSection').classList.add('hidden'); document.getElementById('leaderboardSection').classList.remove('hidden'); document.getElementById('addServerSection').classList.add('hidden'); renderLeaderboard(); }
  else if(activeSection === 'add-server') { document.getElementById('homeSection').classList.add('hidden'); document.getElementById('leaderboardSection').classList.add('hidden'); document.getElementById('addServerSection').classList.remove('hidden'); }
}
function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){ if(m === '&') return '&amp;'; if(m === '<') return '&lt;'; if(m === '>') return '&gt;'; return m;}); }

// Event listeners on page load
document.addEventListener('DOMContentLoaded', () => {
  loadDemoData();
  renderCurrentView();
  updateStatsUI();

  // Search & Filters
  document.getElementById('searchBtn').onclick = () => { searchQuery = document.getElementById('searchInput').value; renderServerGrid(); };
  document.getElementById('resetSearchBtn')?.addEventListener('click', () => { searchQuery = ''; document.getElementById('searchInput').value = ''; renderServerGrid(); });
  document.querySelectorAll('.filter-chip').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active')); btn.classList.add('active'); currentCategory = btn.getAttribute('data-cat'); renderServerGrid(); }); });
  
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active')); link.classList.add('active'); renderCurrentView(); }); });
  
  // Submit server
  document.getElementById('submitServerBtn').onclick = () => {
    const name = document.getElementById('addName').value.trim(); const ip = document.getElementById('addIp').value.trim(); const category = document.getElementById('addCategory').value; const logo = document.getElementById('addLogo').value.trim(); const desc = document.getElementById('addDesc').value.trim();
    if(!name || !ip) { alert('Name & IP are required'); return; }
    pendingServers.push({ name, ip, category, logo, desc, id: Date.now() }); savePending(); alert('Server submitted for admin review!'); document.getElementById('addName').value = ''; document.getElementById('addIp').value = ''; document.getElementById('addLogo').value = ''; document.getElementById('addDesc').value = '';
  };
  
  // Admin UI
  document.getElementById('adminHeaderBtn').onclick = () => { document.getElementById('adminModal').classList.remove('hidden'); };
  document.getElementById('closeAdminModal').onclick = () => { document.getElementById('adminModal').classList.add('hidden'); document.getElementById('adminErrorMsg').classList.add('hidden'); };
  document.getElementById('unlockAdminBtn').onclick = () => { const code = document.getElementById('adminCodeInput').value; if(unlockAdmin(code)) { document.getElementById('adminModal').classList.add('hidden'); document.getElementById('adminDashboard').classList.remove('hidden'); } };
  document.getElementById('closeDashboardBtn').onclick = () => { document.getElementById('adminDashboard').classList.add('hidden'); };
  document.getElementById('exportDataBtn').onclick = () => exportAllData();
  document.getElementById('applyThemeBtn').onclick = () => { const color = document.getElementById('themeColorPicker').value; document.documentElement.style.setProperty('--color-primary', color); localStorage.setItem('bmc_primary', color); };
  document.getElementById('resetVotesBtn')?.addEventListener('click', () => resetAllVotes());
  document.getElementById('clearLeaderboardBtn')?.addEventListener('click', () => resetAllVotes());
  if(localStorage.getItem('bmc_admin') === 'true') { adminUnlocked = true; document.body.classList.add('admin-mode'); }
  const savedColor = localStorage.getItem('bmc_primary'); if(savedColor) document.documentElement.style.setProperty('--color-primary', savedColor);
  
  // Refresh realtime data every 35 seconds
  setInterval(() => { if(document.querySelector('.nav-link.active')?.getAttribute('data-section') === 'home') renderServerGrid(); }, 35000);
});