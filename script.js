// Default server data (you can modify this)
let servers = [
    { rank: 1, name: "BDCraft PvP", category: "PVP", players: 245, description: "Best PvP practice in BD", logoUrl: "https://i.imgur.com/placeholder.png" },
    { rank: 2, name: "Bangla Lifesteal", category: "LIFESTEAL", players: 189, description: "Heart trading & steal", logoUrl: "" },
    { rank: 3, name: "Headsteal Legends", category: "HEADSTEAL", players: 102, description: "Collect heads for power", logoUrl: "" },
    { rank: 4, name: "Peaceful Builders", category: "PEACEFUL", players: 56, description: "No PvP, only creative", logoUrl: "" },
    { rank: 5, name: "Bedwar Arena", category: "BEDWAR", players: 310, description: "Fast bedwars matches", logoUrl: "" }
];

let currentCategory = "all";

// Render table based on filter
function renderTable() {
    const filtered = currentCategory === "all" ? servers : servers.filter(s => s.category === currentCategory);
    const tbody = document.getElementById("server-table");
    tbody.innerHTML = "";
    filtered.forEach(server => {
        const logoHtml = server.logoUrl ? `<img src="${server.logoUrl}" class="logo-img" onerror="this.src='https://via.placeholder.com/40'">` : `<div class="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-xs">No Logo</div>`;
        const row = `
            <tr class="border-b border-gray-700">
                <td class="px-3 font-bold">${server.rank}</td>
                <td class="px-3">${logoHtml}</td>
                <td class="px-3 font-semibold">${server.name}</td>
                <td class="px-3"><span class="bg-blue-900 text-xs px-2 py-1 rounded">${server.category}</span></td>
                <td class="px-3">${server.players}</td>
                <td class="px-3 text-gray-300">${server.description}</td>
                <td class="px-3 text-center">
                    <button class="change-logo-btn bg-purple-700 hover:bg-purple-600 text-white text-xs px-3 py-1 rounded" data-name="${server.name}">Change Logo</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    // Attach event listeners to "Change Logo" buttons
    document.querySelectorAll('.change-logo-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serverName = btn.getAttribute('data-name');
            const newLogoUrl = prompt("Paste your Imgur or Catbox image link (direct URL):", "https://i.imgur.com/example.png");
            if (newLogoUrl && newLogoUrl.trim() !== "") {
                const serverIndex = servers.findIndex(s => s.name === serverName);
                if (serverIndex !== -1) {
                    servers[serverIndex].logoUrl = newLogoUrl.trim();
                    renderTable(); // re-render to show new logo
                }
            }
        });
    });

    // Update stats
    const totalPlayers = filtered.reduce((sum, s) => sum + s.players, 0);
    document.getElementById("stats").innerHTML = `Total Servers: ${filtered.length} | Online Players: ${totalPlayers}`;
}

// Filter button logic
function initFilters() {
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active-filter', 'bg-blue-600'));
            btn.classList.add('active-filter', 'bg-blue-600');
            currentCategory = btn.getAttribute('data-cat');
            renderTable();
        });
    });
}

// Export data as JSON file
function exportToJSON() {
    const dataStr = JSON.stringify(servers, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "minecraft_bd_servers.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Event listeners after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    renderTable();
    initFilters();
    document.getElementById('exportBtn').addEventListener('click', exportToJSON);
});