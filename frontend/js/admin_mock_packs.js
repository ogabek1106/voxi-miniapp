// frontend/js/admin_mock_packs.js
window.showAdminMockPacks = function () {
  hideAllScreens();
  hideAnnouncement();

  const screen = document.getElementById("screen-mocks");
  if (!screen) return;

  screen.style.display = "block";

  screen.innerHTML = `
    <h3>📦 MOCK Packs</h3>
    <div id="mock-pack-list">
      <p style="opacity:0.6;">Loading...</p>
    </div>
    <button onclick="createMockPack()">➕ Create New Pack</button>
    <button onclick="showAdminPanel()" style="margin-top:12px;">⬅ Back</button>
  `;

  loadMockPacks();
};


window.loadMockPacks = async function () {
  try {
    const packs = await apiGet("/admin/mock-packs"); // we build backend later

    const wrap = document.getElementById("mock-pack-list");

    wrap.innerHTML = packs.length
      ? packs.map(p => `
          <button onclick="openMockPack(${p.id})">
            📦 ${p.title}
          </button>
        `).join("")
      : `<p style="opacity:0.6;">No packs yet</p>`;

  } catch (e) {
    console.error(e);
    alert("Failed to load packs");
  }
};


window.openMockPack = function (packId) {
  hideAllScreens();
  hideAnnouncement();

  const screen = document.getElementById("screen-mocks");
  screen.style.display = "block";

  screen.innerHTML = `
    <h3>📦 Mock Pack #${packId}</h3>

    <button onclick="showPackReading(${packId})">📖 Reading</button>
    <button onclick="alert('Writing coming')">✍️ Writing</button>
    <button onclick="alert('Listening coming')">🎧 Listening</button>
    <button onclick="alert('Speaking coming')">🗣 Speaking</button>

    <button onclick="showAdminMockPacks()" style="margin-top:12px;">⬅ Back</button>
  `;
};


window.createMockPack = async function () {
  const title = prompt("Enter pack title");
  if (!title) return;

  try {
    await apiPost("/admin/mock-packs", { title });
    loadMockPacks();
  } catch (e) {
    alert("Failed to create pack");
  }
};
