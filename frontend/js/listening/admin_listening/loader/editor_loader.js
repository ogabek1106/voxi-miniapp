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

  window.showAdminListeningEditor = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);

    const screen = document.getElementById("screen-mocks");
    if (!screen) return;
    screen.style.display = "block";

    const state = AdminListeningState.get();
    if (!state || !state.sections?.length) {
      AdminListeningState.init();
    }

    AdminListeningDynamic.mount(screen);
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

