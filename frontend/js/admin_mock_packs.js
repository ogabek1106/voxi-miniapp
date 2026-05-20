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
    window.__adminMockPackTitles = {};
    wrap.innerHTML = packs.length
      ? packs.map((p) => {
          window.__adminMockPackTitles[p.id] = p.title || "";
          const statusDot = p.status === "published" ? "Published" : "Draft";
          const premiere = p.premiere?.premiere_is_live ? " · PREMIERE" : "";
          const title = escapeAdminPackText(p.title);
          return `
            <div style="display:grid; grid-template-columns:minmax(0,1fr) 76px 78px 96px 42px; gap:6px; margin-bottom:8px; align-items:stretch; width:100%;">
              <button style="min-width:0; overflow:hidden; text-overflow:ellipsis;" onclick="openMockPack(${p.id})">
                📦 ${title} (${statusDot}${premiere})
              </button>
              <button onclick="toggleMockPack(${p.id})">
                ${p.status === "published" ? "Unpub" : "Publish"}
              </button>
              <button onclick="openRenameMockPackModal(${p.id})">
                Rename
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

window.openRenameMockPackModal = function (packId) {
  const currentTitle = window.__adminMockPackTitles?.[packId] || "";
  const existing = document.getElementById("mock-pack-rename-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "mock-pack-rename-modal";
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(15, 23, 42, 0.28);
    backdrop-filter: blur(6px);
  `;

  modal.innerHTML = `
    <div style="width:min(100%, 460px); border-radius:24px; background:#fff; box-shadow:0 24px 70px rgba(15,23,42,.18); padding:22px;">
      <h3 style="margin:0 0 8px;">Rename Mock Pack</h3>
      <p style="margin:0 0 16px; color:#64748b; font-weight:700;">Update the pack name shown in the admin list and user flows.</p>
      <input
        id="mock-pack-rename-input"
        value="${escapeAdminPackText(currentTitle)}"
        maxlength="255"
        style="width:100%; box-sizing:border-box; border:1px solid #dbeafe; border-radius:16px; padding:14px 16px; font:inherit; font-weight:800; outline:none;"
      />
      <div id="mock-pack-rename-error" style="min-height:22px; margin-top:8px; color:#ef4444; font-weight:800;"></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px;">
        <button type="button" onclick="closeRenameMockPackModal()" style="background:#f1f5f9; color:#0f172a;">Cancel</button>
        <button type="button" id="mock-pack-rename-save" onclick="submitRenameMockPack(${Number(packId)})">Save</button>
      </div>
    </div>
  `;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeRenameMockPackModal();
  });

  document.body.appendChild(modal);
  const input = document.getElementById("mock-pack-rename-input");
  if (input) {
    input.focus();
    input.select();
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submitRenameMockPack(Number(packId));
      if (event.key === "Escape") closeRenameMockPackModal();
    });
  }
};

window.closeRenameMockPackModal = function () {
  const modal = document.getElementById("mock-pack-rename-modal");
  if (modal) modal.remove();
};

window.submitRenameMockPack = async function (packId) {
  const input = document.getElementById("mock-pack-rename-input");
  const error = document.getElementById("mock-pack-rename-error");
  const save = document.getElementById("mock-pack-rename-save");
  const title = String(input?.value || "").trim();

  if (!title) {
    if (error) error.textContent = "Pack name is required.";
    return;
  }

  if (save) save.disabled = true;
  if (error) error.textContent = "";

  try {
    await apiPut(`/admin/mock-packs/${Number(packId)}`, { title });
    closeRenameMockPackModal();
    await loadMockPacks();
  } catch (e) {
    console.error("Rename error:", e);
    if (error) error.textContent = "Failed to rename pack.";
  } finally {
    if (save) save.disabled = false;
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
