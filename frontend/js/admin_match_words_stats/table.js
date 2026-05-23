window.AdminMatchWordsStatsTable = window.AdminMatchWordsStatsTable || {};

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
    return AdminMatchWordsStatsUI.escape(value ?? "-");
  }

  AdminMatchWordsStatsTable.render = function (items = []) {
    if (!items.length) {
      return `
        <div class="admin-ws-stats-empty">
          <strong>No Match Words sessions yet.</strong>
          <span>Results will appear here after learners finish games.</span>
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
                <th>Correct</th>
                <th>Wrong</th>
                <th>Best combo</th>
                <th>Survived</th>
                <th>Avg match</th>
                <th>XP</th>
                <th>Status</th>
                <th>Started at</th>
                <th>Finished at</th>
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
        <td>${cell(item.correct_count)}</td>
        <td>${cell(item.wrong_count)}</td>
        <td>${cell(`x${Number(item.best_combo || 0)}`)}</td>
        <td>${cell(AdminMatchWordsStatsUI.formatTime(item.survived_seconds))}</td>
        <td>${cell(`${Number(item.average_match_seconds || 0).toFixed(1)}s`)}</td>
        <td>${cell(item.xp_earned)}</td>
        <td>${cell(item.status || "-")}</td>
        <td>${cell(formatDate(item.started_at))}</td>
        <td>${cell(formatDate(item.finished_at))}</td>
      </tr>
    `;
  }
})();
