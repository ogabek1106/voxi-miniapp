window.AdminWordShuffleUI = window.AdminWordShuffleUI || {};

(function () {
  AdminWordShuffleUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  AdminWordShuffleUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) {
      screen.classList.remove("vocab-ooo-host", "shadow-writing-host", "word-shuffle-host");
      screen.style.display = "block";
    }
    return screen;
  };

  AdminWordShuffleUI.renderShell = function () {
    const screen = AdminWordShuffleUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-word-shuffle-screen">
        <div class="admin-word-shuffle-head">
          <div>
            <h2>Voxi Word Shuffle</h2>
            <p>Manage drag-and-drop vocabulary arcade words.</p>
          </div>
          <div class="admin-word-shuffle-head-actions">
            <button class="admin-word-shuffle-secondary" onclick="WordShuffleState.set({ returnToAdmin: true }); WordShuffleLoader.start()">Test game</button>
            <button class="admin-word-shuffle-secondary" onclick="showAdminPanel()">Back</button>
          </div>
        </div>
        <div class="admin-word-shuffle-layout">
          <div id="admin-word-shuffle-form-host"></div>
          <div id="admin-word-shuffle-list-host"></div>
        </div>
      </div>
    `;
  };

  AdminWordShuffleUI.renderMessage = function (message, tone = "info") {
    const host = document.getElementById("admin-word-shuffle-message");
    if (!host) return;
    host.className = `admin-word-shuffle-message is-${tone}`;
    host.textContent = message || "";
    host.hidden = !message;
  };
})();
