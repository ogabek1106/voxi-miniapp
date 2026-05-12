window.AdminLiveDashboardTable = window.AdminLiveDashboardTable || {};

(function () {
  function escape(value) {
    return AdminLiveDashboardUI.escape(value ?? "-");
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  AdminLiveDashboardTable.render = function (users = []) {
    if (!users.length) {
      return `
        <div class="admin-live-empty">
          <strong>No live users yet.</strong>
          <span>Users will appear here after heartbeat events arrive.</span>
        </div>
      `;
    }
    return `
      <div class="admin-live-table-card">
        <div class="admin-live-table-scroll">
          <table class="admin-live-table">
            <thead>
              <tr>
                <th>Telegram ID</th>
                <th>User</th>
                <th>Current page</th>
                <th>Device</th>
                <th>Status</th>
                <th>Session duration</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>${users.map(renderRow).join("")}</tbody>
          </table>
        </div>
      </div>
    `;
  };

  function renderRow(user) {
    const status = String(user.status || "offline").toLowerCase();
    return `
      <tr>
        <td>${escape(user.telegram_id || "-")}</td>
        <td>${escape(user.user_name || "Visitor")}</td>
        <td>${escape(user.current_page || "-")}</td>
        <td>${escape(user.device_type || "-")}</td>
        <td><span class="admin-live-status admin-live-status--${escape(status)}">${escape(status)}</span></td>
        <td>${escape(AdminLiveDashboardUI.formatTime(user.session_duration))}</td>
        <td>${escape(formatDate(user.last_seen))}</td>
      </tr>
    `;
  }
})();
