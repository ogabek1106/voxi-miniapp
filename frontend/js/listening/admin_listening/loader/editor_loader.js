// frontend/js/listening/admin_listening/loader/editor_loader.js
window.AdminListeningLoader = window.AdminListeningLoader || {};

(function () {
  let adminPanelPatched = false;

  function patchAdminPanelButton() {
    if (adminPanelPatched) return;
    adminPanelPatched = true;

    const originalShowAdminPanel = window.showAdminPanel;
    if (typeof originalShowAdminPanel !== "function") return;

    window.showAdminPanel = function () {
      originalShowAdminPanel();
      const screen = document.getElementById("screen-mocks");
      if (!screen) return;

      const exists = screen.querySelector('button[onclick="showAdminListeningEditor()"]');
      if (exists) return;

      const dbBtn = screen.querySelector('button[onclick="showDbStats()"]');
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("onclick", "showAdminListeningEditor()");
      btn.textContent = "Listening Editor";

      if (dbBtn && dbBtn.parentNode) {
        dbBtn.insertAdjacentElement("afterend", btn);
      } else {
        screen.appendChild(btn);
      }
    };
  }

  window.showAdminListeningEditor = async function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);

    const screen = document.getElementById("screen-mocks");
    if (!screen) return;
    screen.style.display = "block";
    screen.innerHTML = `<p style="opacity:0.7;">Loading listening editor...</p>`;

    const packId = Number(window.__currentListeningPackId || window.__currentPackId || 0) || null;

    try {
      if (packId) {
        const loaded = await AdminListeningApi.loadDraft(packId);
        AdminListeningState.setState(loaded);
      } else {
        const state = AdminListeningState.get();
        if (!state || !state.sections?.length) {
          AdminListeningState.init();
        }
      }
    } catch (error) {
      console.error("Listening load error:", error);
      AdminListeningState.init();
    }

    AdminListeningDynamic.mount(screen, { packId });
  };

  AdminListeningLoader.init = function () {
    patchAdminPanelButton();
    if (!AdminListeningState.get()) {
      AdminListeningState.init();
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    AdminListeningLoader.init();
  });
})();
