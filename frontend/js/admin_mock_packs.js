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
      ? packs.map((p) => {
          const statusDot = p.status === "published" ? "Published" : "Draft";
          const premiere = p.premiere?.premiere_is_live ? " · PREMIERE" : "";
          return `
            <div style="display:grid; grid-template-columns:minmax(0,1fr) 76px 96px 42px; gap:6px; margin-bottom:8px; align-items:stretch; width:100%;">
              <button style="min-width:0; overflow:hidden; text-overflow:ellipsis;" onclick="openMockPack(${p.id})">
                📦 ${escapeAdminPackText(p.title)} (${statusDot}${premiere})
              </button>
              <button onclick="toggleMockPack(${p.id})">
                ${p.status === "published" ? "Unpub" : "Publish"}
              </button>
              <button onclick="window.AdminPremiereModal?.open(${p.id})">
                Premiere
              </button>
              <button
                onclick="deleteMockPack(${p.id})"
                style="padding:0; display:flex; align-items:center; justify-content:center;"
              >
                🗑
              </button>
            </div>
          `;
        }).join("")
      : `<p style="opacity:0.6;">No packs yet</p>`;
  } catch (e) {
    console.error("Load packs error:", e);
    wrap.innerHTML = `<p style="color:red;">Failed to load packs</p>`;
  }
};

function escapeAdminPackText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

window.openMockPack = function (packId) {
  hideAllScreens();
  hideAnnouncement();

  const screen = document.getElementById("screen-mocks");
  if (!screen) return;
  screen.style.display = "block";

  screen.innerHTML = `
    <h3>📦 Mock Pack #${packId}</h3>
    <button onclick="showPackReading(${packId})">📖 Reading</button>
    <button onclick="showPackWriting(${packId})">✍️ Writing</button>
    <button onclick="showPackListening(${packId})">🎧 Listening</button>
    <button onclick="showPackSpeaking(${packId})">🗣 Speaking</button>
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

window.showPackSpeaking = function (packId) {
  if (typeof window.showPackSpeakingEditor === "function") {
    window.showPackSpeakingEditor(Number(packId));
    return;
  }
  alert("Speaking editor is not loaded.");
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
