window.AdminShadowWritingUI = window.AdminShadowWritingUI || {};

(function () {
  AdminShadowWritingUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  AdminShadowWritingUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) screen.style.display = "block";
    return screen;
  };

  AdminShadowWritingUI.renderShell = function () {
    const screen = AdminShadowWritingUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-shadow-screen">
        <div class="admin-shadow-head">
          <h2>Shadow Writing Essays</h2>
          <p>Create and manage rewriting practice essays.</p>
        </div>
        <button class="admin-shadow-primary" onclick="AdminShadowWritingAdd.show()">Add New Essay</button>
        <button class="admin-shadow-secondary" onclick="AdminShadowWritingLibrary.show()">Essay Library</button>
        <button class="admin-shadow-secondary" onclick="showAdminPanel()">Back</button>
      </div>
    `;
  };
})();
