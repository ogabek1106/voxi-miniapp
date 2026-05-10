window.AdminWordMergeUI = window.AdminWordMergeUI || {};

(function () {
  AdminWordMergeUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  AdminWordMergeUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) {
      screen.classList.remove("vocab-ooo-host", "shadow-writing-host");
      screen.style.display = "block";
    }
    return screen;
  };

  AdminWordMergeUI.renderShell = function () {
    const screen = AdminWordMergeUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-word-merge-screen">
        <div class="admin-word-merge-head">
          <div>
            <h2>Voxi Word Merge</h2>
            <p>Create vocabulary ladders and test the merge game.</p>
          </div>
          <div class="admin-word-merge-head-actions">
            <button class="admin-word-merge-secondary" onclick="WordMergeLoader.start()">Test game</button>
            <button class="admin-word-merge-secondary" onclick="AdminWordMergeStats.show()">Stats</button>
            <button class="admin-word-merge-secondary" onclick="showAdminPanel()">Back</button>
          </div>
        </div>
        <div class="admin-word-merge-layout">
          <div id="admin-word-merge-form-host"></div>
          <div id="admin-word-merge-list-host"></div>
        </div>
      </div>
    `;
  };

  AdminWordMergeUI.renderMessage = function (message, tone = "info") {
    const host = document.getElementById("admin-word-merge-message");
    if (!host) return;
    host.className = `admin-word-merge-message is-${tone}`;
    host.textContent = message || "";
    host.hidden = !message;
  };
})();
