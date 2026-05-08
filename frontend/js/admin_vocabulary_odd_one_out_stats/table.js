window.AdminVocabularyOddOneOutStatsTable = window.AdminVocabularyOddOneOutStatsTable || {};

(function () {
  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function cell(value) {
    return AdminVocabularyOddOneOutStatsUI.escape(value ?? "-");
  }

  AdminVocabularyOddOneOutStatsTable.render = function (items = []) {
    if (!items.length) {
      return `
        <div class="admin-ooo-stats-empty">
          <strong>No completed sessions yet.</strong>
          <span>Odd One Out usage will appear here after learners finish puzzle sessions.</span>
        </div>
      `;
    }

    return `
      <div class="admin-ooo-table-card">
        <div class="admin-ooo-table-scroll">
          <table class="admin-ooo-table">
            <thead>
              <tr>
                <th>User name</th>
                <th>Login method</th>
                <th>Total sets played</th>
                <th>Correct answers</th>
                <th>Wrong answers</th>
                <th>Timeouts</th>
                <th>Accuracy</th>
                <th>Best streak</th>
                <th>Average answer time</th>
                <th>Total time spent</th>
                <th>Completed at</th>
              </tr>
            </thead>
            <tbody>${items.map(renderRow).join("")}</tbody>
          </table>
        </div>
      </div>
    `;
  };

  function renderRow(item) {
    return `
      <tr>
        <td>${cell(item.user_name || item.telegram_id || "-")}</td>
        <td>${cell(item.login_method || "-")}</td>
        <td>${cell(item.total_sets_played)}</td>
        <td>${cell(item.correct_answers)}</td>
        <td>${cell(item.wrong_answers)}</td>
        <td>${cell(item.timeouts)}</td>
        <td>${cell(AdminVocabularyOddOneOutStatsUI.formatPercent(item.accuracy))}</td>
        <td>${cell(item.best_streak)}</td>
        <td>${cell(`${Number(item.average_answer_time || 0).toFixed(1)}s`)}</td>
        <td>${cell(AdminVocabularyOddOneOutStatsUI.formatTime(item.total_time_seconds))}</td>
        <td>${cell(formatDate(item.completed_at))}</td>
      </tr>
    `;
  }
})();
