window.AdminMatchWordsStatsUI = window.AdminMatchWordsStatsUI || {};

(function () {
  AdminMatchWordsStatsUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  function formatTime(seconds) {
    const total = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    return minutes ? `${minutes}m ${secs}s` : `${secs}s`;
  }

  AdminMatchWordsStatsUI.formatTime = formatTime;

  AdminMatchWordsStatsUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) screen.style.display = "block";
    return screen;
  };

  AdminMatchWordsStatsUI.renderLoading = function () {
    const screen = AdminMatchWordsStatsUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-ws-stats-screen">
        <div class="admin-ws-stats-head">
          <h2>Match Words Stats</h2>
          <p>Loading completed sessions...</p>
        </div>
      </div>
    `;
  };

  AdminMatchWordsStatsUI.render = function () {
    const screen = AdminMatchWordsStatsUI.screen();
    if (!screen) return;
    const stats = AdminMatchWordsStatsState.get();
    const summary = stats.summary || {};
    screen.innerHTML = `
      <div class="admin-ws-stats-screen">
        <div class="admin-ws-stats-head">
          <div>
            <h2>Match Words Stats</h2>
            <p>Fast vocabulary matching sessions, combos, XP, and survival time.</p>
          </div>
          <button class="admin-ws-stats-back" onclick="showAdminPanel()">Back</button>
        </div>
        <div class="admin-ws-summary-grid">
          ${renderSummaryCard("Total sessions", Number(summary.total_sessions || 0))}
          ${renderSummaryCard("Unique users", Number(summary.unique_users || 0))}
          ${renderSummaryCard("Correct matches", Number(summary.total_correct || 0))}
          ${renderSummaryCard("Wrong taps", Number(summary.total_wrong || 0))}
          ${renderSummaryCard("Highest combo", `x${Number(summary.highest_combo || 0)}`)}
          ${renderSummaryCard("Total XP", Number(summary.total_xp || 0))}
          ${renderSummaryCard("Average survival", formatTime(summary.average_survival_seconds))}
        </div>
        ${AdminMatchWordsStatsTable.render(stats.items)}
      </div>
    `;
  };

  AdminMatchWordsStatsUI.renderError = function (message) {
    const screen = AdminMatchWordsStatsUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-ws-stats-screen">
        <div class="admin-ws-stats-empty">
          <strong>Could not load Match Words stats.</strong>
          <span>${AdminMatchWordsStatsUI.escape(message || "Please try again.")}</span>
          <button class="admin-ws-stats-back" onclick="showAdminPanel()">Back</button>
        </div>
      </div>
    `;
  };

  function renderSummaryCard(label, value) {
    return `
      <article class="admin-ws-summary-card">
        <span>${AdminMatchWordsStatsUI.escape(label)}</span>
        <strong>${AdminMatchWordsStatsUI.escape(value)}</strong>
      </article>
    `;
  }
})();
