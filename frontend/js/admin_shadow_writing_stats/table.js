window.AdminShadowWritingStatsTable = window.AdminShadowWritingStatsTable || {};

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
    return AdminShadowWritingStatsUI.escape(value ?? "-");
  }

  AdminShadowWritingStatsTable.render = function (items = []) {
    if (!items.length) {
      return `
        <div class="admin-sw-stats-empty">
          <strong>No completed attempts yet.</strong>
          <span>Shadow Writing usage will appear here after learners finish essays.</span>
        </div>
      `;
    }

    return `
      <div class="admin-sw-table-card">
        <div class="admin-sw-table-scroll">
          <table class="admin-sw-table">
            <thead>
              <tr>
                <th>User name</th>
                <th>Login method</th>
                <th>Essay title</th>
                <th>Band/Level</th>
                <th>Theme</th>
                <th>Time spent</th>
                <th>Speed/WPM</th>
                <th>Accuracy</th>
                <th>Mistakes</th>
                <th>Typed characters</th>
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
        <td>${cell(item.essay_title || "Untitled Essay")}</td>
        <td>${cell(item.essay_level)}</td>
        <td>${cell(item.essay_theme)}</td>
        <td>${cell(AdminShadowWritingStatsUI.formatTime(item.time_seconds))}</td>
        <td>${cell(`${Number(item.speed_wpm || 0).toFixed(1)} WPM`)}</td>
        <td>${cell(AdminShadowWritingStatsUI.formatPercent(item.accuracy))}</td>
        <td>${cell(item.mistakes_count)}</td>
        <td>${cell(item.typed_chars)}</td>
        <td>${cell(formatDate(item.completed_at))}</td>
      </tr>
    `;
  }
})();
