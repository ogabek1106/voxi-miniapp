window.AdminWordShuffleStatsUI = window.AdminWordShuffleStatsUI || {};

(function () {
  AdminWordShuffleStatsUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  function formatTime(seconds) {
    const total = Math.max(0, Number(seconds || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = Math.floor(total % 60);
    if (hours) return `${hours}h ${minutes}m`;
    if (minutes) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  AdminWordShuffleStatsUI.formatTime = formatTime;

  AdminWordShuffleStatsUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) screen.style.display = "block";
    return screen;
  };

  AdminWordShuffleStatsUI.renderLoading = function () {
    const screen = AdminWordShuffleStatsUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-ws-stats-screen">
        <div class="admin-ws-stats-head">
          <h2>Word Shuffle Stats</h2>
          <p>Loading completed game sessions...</p>
        </div>
      </div>
    `;
  };

  AdminWordShuffleStatsUI.render = function () {
    const screen = AdminWordShuffleStatsUI.screen();
    if (!screen) return;
    const stats = AdminWordShuffleStatsState.get();
    const summary = stats.summary || {};
    screen.innerHTML = `
      <div class="admin-ws-stats-screen">
        <div class="admin-ws-stats-head">
          <div>
            <h2>Word Shuffle Stats</h2>
            <p>Completed drag-and-drop vocabulary sessions, streaks, score, and time spent.</p>
          </div>
          <button class="admin-ws-stats-back" onclick="showAdminPanel()">Back</button>
        </div>
        <div class="admin-ws-summary-grid">
          ${renderSummaryCard("Total sessions", Number(summary.total_sessions || 0))}
          ${renderSummaryCard("Unique users", Number(summary.unique_users || 0))}
          ${renderSummaryCard("Solved words", Number(summary.total_solved || 0))}
          ${renderSummaryCard("Average score", Number(summary.average_score || 0).toFixed(1))}
          ${renderSummaryCard("Highest score", Number(summary.highest_score || 0))}
          ${renderSummaryCard("Highest streak", Number(summary.highest_streak || 0))}
          ${renderSummaryCard("Total time spent", formatTime(summary.total_time_seconds))}
        </div>
        ${AdminWordShuffleStatsTable.render(stats.items)}
      </div>
    `;
  };

  AdminWordShuffleStatsUI.renderError = function (message) {
    const screen = AdminWordShuffleStatsUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-ws-stats-screen">
        <div class="admin-ws-stats-empty">
          <strong>Could not load Word Shuffle stats.</strong>
          <span>${AdminWordShuffleStatsUI.escape(message || "Please try again.")}</span>
          <button class="admin-ws-stats-back" onclick="showAdminPanel()">Back</button>
        </div>
      </div>
    `;
  };

  function renderSummaryCard(label, value) {
    return `
      <article class="admin-ws-summary-card">
        <span>${AdminWordShuffleStatsUI.escape(label)}</span>
        <strong>${AdminWordShuffleStatsUI.escape(value)}</strong>
      </article>
    `;
  }
})();
