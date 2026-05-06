window.AdminShadowWritingStatsUI = window.AdminShadowWritingStatsUI || {};

(function () {
  AdminShadowWritingStatsUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  function formatPercent(value) {
    const number = Number(value || 0);
    return `${number.toFixed(number % 1 ? 1 : 0)}%`;
  }

  function formatTime(seconds) {
    const total = Math.max(0, Number(seconds || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = Math.floor(total % 60);
    if (hours) return `${hours}h ${minutes}m`;
    if (minutes) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  AdminShadowWritingStatsUI.formatTime = formatTime;
  AdminShadowWritingStatsUI.formatPercent = formatPercent;

  AdminShadowWritingStatsUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) screen.style.display = "block";
    return screen;
  };

  AdminShadowWritingStatsUI.renderLoading = function () {
    const screen = AdminShadowWritingStatsUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-sw-stats-screen">
        <div class="admin-sw-stats-head">
          <h2>Shadow Writing Stats</h2>
          <p>Loading completed attempts...</p>
        </div>
      </div>
    `;
  };

  AdminShadowWritingStatsUI.render = function () {
    const screen = AdminShadowWritingStatsUI.screen();
    if (!screen) return;
    const stats = AdminShadowWritingStatsState.get();
    const summary = stats.summary || {};
    screen.innerHTML = `
      <div class="admin-sw-stats-screen">
        <div class="admin-sw-stats-head">
          <div>
            <h2>Shadow Writing Stats</h2>
            <p>Completed rewriting attempts and learner performance.</p>
          </div>
          <button class="admin-sw-stats-back" onclick="showAdminPanel()">Back</button>
        </div>
        <div class="admin-sw-summary-grid">
          ${renderSummaryCard("Total attempts", Number(summary.total_attempts || 0))}
          ${renderSummaryCard("Unique users", Number(summary.unique_users || 0))}
          ${renderSummaryCard("Average accuracy", formatPercent(summary.average_accuracy))}
          ${renderSummaryCard("Average speed", `${Number(summary.average_speed_wpm || 0).toFixed(1)} WPM`)}
          ${renderSummaryCard("Total time spent", formatTime(summary.total_time_seconds))}
        </div>
        ${AdminShadowWritingStatsTable.render(stats.items)}
      </div>
    `;
  };

  AdminShadowWritingStatsUI.renderError = function (message) {
    const screen = AdminShadowWritingStatsUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-sw-stats-screen">
        <div class="admin-sw-stats-empty">
          <strong>Could not load Shadow Writing stats.</strong>
          <span>${AdminShadowWritingStatsUI.escape(message || "Please try again.")}</span>
          <button class="admin-sw-stats-back" onclick="showAdminPanel()">Back</button>
        </div>
      </div>
    `;
  };

  function renderSummaryCard(label, value) {
    return `
      <article class="admin-sw-summary-card">
        <span>${AdminShadowWritingStatsUI.escape(label)}</span>
        <strong>${AdminShadowWritingStatsUI.escape(value)}</strong>
      </article>
    `;
  }
})();
