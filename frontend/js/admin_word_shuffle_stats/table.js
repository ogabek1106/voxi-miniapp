window.AdminWordShuffleStatsTable = window.AdminWordShuffleStatsTable || {};

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
    return AdminWordShuffleStatsUI.escape(value ?? "-");
  }

  AdminWordShuffleStatsTable.render = function (items = []) {
    if (!items.length) {
      return `
        <div class="admin-ws-stats-empty">
          <strong>No completed sessions yet.</strong>
          <span>Word Shuffle usage will appear here after learners finish game sessions.</span>
        </div>
      `;
    }

    return `
      <div class="admin-ws-table-card">
        <div class="admin-ws-table-scroll">
          <table class="admin-ws-table">
            <thead>
              <tr>
                <th>User name</th>
                <th>Login method</th>
                <th>Score</th>
                <th>Solved words</th>
                <th>Best streak</th>
                <th>Average time / word</th>
                <th>Total time spent</th>
                <th>Status</th>
                <th>Started at</th>
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
        <td>${cell(item.score)}</td>
        <td>${cell(item.solved_count)}</td>
        <td>${cell(item.best_streak)}</td>
        <td>${cell(`${Number(item.average_time_per_word || 0).toFixed(1)}s`)}</td>
        <td>${cell(AdminWordShuffleStatsUI.formatTime(item.time_seconds))}</td>
        <td>${cell(item.status || "-")}</td>
        <td>${cell(formatDate(item.started_at))}</td>
        <td>${cell(formatDate(item.completed_at))}</td>
      </tr>
    `;
  }
})();
