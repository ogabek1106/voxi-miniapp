window.AdminMatchWordsUI = window.AdminMatchWordsUI || {};

(function () {
  AdminMatchWordsUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  AdminMatchWordsUI.screen = function () {
    return document.getElementById("screen-mocks");
  };

  AdminMatchWordsUI.renderShell = function () {
    hideAllScreens();
    window.hideAnnouncement?.();
    window.setBottomNavVisible?.(false);
    const screen = AdminMatchWordsUI.screen();
    if (!screen) return;
    screen.style.display = "block";
    screen.innerHTML = `
      <div class="admin-match-words-screen">
        <div class="admin-match-words-head">
          <div>
            <h2>Match Words</h2>
          </div>
          <div class="admin-match-words-head-actions">
            <button class="admin-match-words-secondary" onclick="MatchWordsState.set({ returnToAdmin: true }); MatchWordsLoader.start()">Test game</button>
            <button class="admin-match-words-secondary" onclick="showAdminPanel()">Back</button>
          </div>
        </div>
        <div class="admin-match-words-layout">
          <div id="admin-match-words-form-host"></div>
          <div id="admin-match-words-list-host"></div>
        </div>
      </div>
    `;
  };

  AdminMatchWordsUI.renderMessage = function (message, tone = "success") {
    const host = document.getElementById("admin-match-words-message");
    if (!host) return;
    host.textContent = message;
    host.className = `admin-match-words-message is-${tone}`;
    host.hidden = false;
  };
})();
