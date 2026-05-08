window.AdminVocabularyOddOneOutStatsUI = window.AdminVocabularyOddOneOutStatsUI || {};

(function () {
  AdminVocabularyOddOneOutStatsUI.escape = function (value) {
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

  AdminVocabularyOddOneOutStatsUI.formatTime = formatTime;
  AdminVocabularyOddOneOutStatsUI.formatPercent = formatPercent;

  AdminVocabularyOddOneOutStatsUI.screen = function () {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) screen.style.display = "block";
    return screen;
  };

  AdminVocabularyOddOneOutStatsUI.renderLoading = function () {
    const screen = AdminVocabularyOddOneOutStatsUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-ooo-stats-screen">
        <div class="admin-ooo-stats-head">
          <h2>Odd One Out Stats</h2>
          <p>Loading completed puzzle sessions...</p>
        </div>
      </div>
    `;
  };

  AdminVocabularyOddOneOutStatsUI.render = function () {
    const screen = AdminVocabularyOddOneOutStatsUI.screen();
    if (!screen) return;
    const stats = AdminVocabularyOddOneOutStatsState.get();
    const summary = stats.summary || {};
    screen.innerHTML = `
      <div class="admin-ooo-stats-screen">
        <div class="admin-ooo-stats-head">
          <div>
            <h2>Odd One Out Stats</h2>
            <p>Completed vocabulary puzzle sessions, timeouts, streaks, and engagement.</p>
          </div>
          <button class="admin-ooo-stats-back" onclick="showAdminPanel()">Back</button>
        </div>
        <div class="admin-ooo-summary-grid">
          ${renderSummaryCard("Total attempts", Number(summary.total_attempts || 0))}
          ${renderSummaryCard("Unique users", Number(summary.unique_users || 0))}
          ${renderSummaryCard("Average accuracy", formatPercent(summary.average_accuracy))}
          ${renderSummaryCard("Average answer time", `${Number(summary.average_answer_time || 0).toFixed(1)}s`)}
          ${renderSummaryCard("Total time spent", formatTime(summary.total_time_seconds))}
          ${renderSummaryCard("Highest streak", Number(summary.highest_streak || 0))}
          ${renderSummaryCard("Total timeouts", Number(summary.total_timeouts || 0))}
        </div>
        ${AdminVocabularyOddOneOutStatsTable.render(stats.items)}
      </div>
    `;
  };

  AdminVocabularyOddOneOutStatsUI.renderError = function (message) {
    const screen = AdminVocabularyOddOneOutStatsUI.screen();
    if (!screen) return;
    screen.innerHTML = `
      <div class="admin-ooo-stats-screen">
        <div class="admin-ooo-stats-empty">
          <strong>Could not load Odd One Out stats.</strong>
          <span>${AdminVocabularyOddOneOutStatsUI.escape(message || "Please try again.")}</span>
          <button class="admin-ooo-stats-back" onclick="showAdminPanel()">Back</button>
        </div>
      </div>
    `;
  };

  function renderSummaryCard(label, value) {
    return `
      <article class="admin-ooo-summary-card">
        <span>${AdminVocabularyOddOneOutStatsUI.escape(label)}</span>
        <strong>${AdminVocabularyOddOneOutStatsUI.escape(value)}</strong>
      </article>
    `;
  }
})();
