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
  const wrap = document.getElementById("mock-pack-list");
  if (!wrap) return;

  try {
    const packs = await apiGet("/admin/mock-packs");
    wrap.innerHTML = packs.length
      ? packs.map((p) => `
          <div style="display:flex; gap:6px; margin-bottom:8px;">
            <button style="flex:1;" onclick="openMockPack(${p.id})">
              📦 ${p.title} ${p.status === "published" ? "🟢" : "⚪"}
            </button>
            <button onclick="toggleMockPack(${p.id})" style="width:70px;">
              ${p.status === "published" ? "Unpub" : "Publish"}
            </button>
            <button
              onclick="deleteMockPack(${p.id})"
              style="width:42px; padding:0; display:flex; align-items:center; justify-content:center;"
            >
              🗑
            </button>
          </div>
        `).join("")
      : `<p style="opacity:0.6;">No packs yet</p>`;
  } catch (e) {
    console.error("Load packs error:", e);
    wrap.innerHTML = `<p style="color:red;">Failed to load packs</p>`;
  }
};

window.openMockPack = function (packId) {
  hideAllScreens();
  hideAnnouncement();

  const screen = document.getElementById("screen-mocks");
  if (!screen) return;
  screen.style.display = "block";

  screen.innerHTML = `
    <h3>📦 Mock Pack #${packId}</h3>
    <button onclick="showPackReading(${packId})">📖 Reading</button>
    <button onclick="alert('Writing coming')">✍️ Writing</button>
    <button onclick="showPackListening(${packId})">🎧 Listening</button>
    <button onclick="alert('Speaking coming')">🗣 Speaking</button>
    <button onclick="showAdminMockPacks()" style="margin-top:12px;">⬅ Back</button>
  `;
};

window.showPackListening = function (packId) {
  window.__currentPackId = packId;
  window.__currentListeningPackId = packId;
  if (typeof window.showAdminListeningEditor === "function") {
    window.showAdminListeningEditor();
    return;
  }
  alert("Listening editor is not loaded.");
};

window.createMockPack = async function () {
  const title = prompt("Enter pack title");
  if (!title) return;

  try {
    await apiPost("/admin/mock-packs", { title });
    await loadMockPacks();
  } catch (e) {
    console.error("Create error:", e);
    alert("Failed to create pack: " + e.message);
  }
};

window.deleteMockPack = async function (packId) {
  const confirmed = confirm("Delete this Mock Pack and ALL its content?");
  if (!confirmed) return;

  try {
    await apiDelete(`/admin/mock-packs/${packId}`);
    await loadMockPacks();
  } catch (e) {
    console.error("Delete error:", e);
    alert("Failed to delete pack: " + e.message);
  }
};

window.toggleMockPack = async function (packId) {
  try {
    await apiPost(`/admin/mock-packs/${packId}/toggle`);
    await loadMockPacks();
  } catch (e) {
    console.error("Toggle error:", e);
    alert("Failed to change publish state");
  }
};
