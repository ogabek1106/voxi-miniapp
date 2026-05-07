window.AdminVocabularyOddOneOutUI = window.AdminVocabularyOddOneOutUI || {};

(function () {
  AdminVocabularyOddOneOutUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  AdminVocabularyOddOneOutUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) screen.style.display = "block";
    return screen;
  };

  AdminVocabularyOddOneOutUI.renderShell = function () {
    const screen = AdminVocabularyOddOneOutUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-vocab-screen">
        <div class="admin-vocab-head">
          <div>
            <h2>Vocabulary Odd One Out</h2>
            <p>Create and manage four-card vocabulary puzzles.</p>
          </div>
          <button class="admin-vocab-secondary" onclick="showAdminPanel()">Back</button>
        </div>
        <div class="admin-vocab-layout">
          <div id="admin-vocab-form-host"></div>
          <div id="admin-vocab-list-host"></div>
        </div>
      </div>
    `;
  };

  AdminVocabularyOddOneOutUI.renderMessage = function (message, tone = "info") {
    const host = document.getElementById("admin-vocab-message");
    if (!host) return;
    host.className = `admin-vocab-message is-${tone}`;
    host.textContent = message || "";
    host.hidden = !message;
  };
})();
