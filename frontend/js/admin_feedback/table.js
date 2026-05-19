window.AdminFeedbackTable = window.AdminFeedbackTable || {};

(function () {
  function date(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function stars(value) {
    const rating = Math.max(0, Math.min(5, Number(value || 0)));
    if (!rating) return "-";
    return `${"*".repeat(rating)}${"-".repeat(5 - rating)} (${rating})`;
  }

  AdminFeedbackTable.render = function (items = []) {
    if (!items.length) {
      return `
        <div class="admin-feedback-empty">
          <strong>No ratings yet.</strong>
          <span>User feedback will appear here after completion prompts are submitted.</span>
        </div>
      `;
    }

    return `
      <div class="admin-feedback-table-card">
        <div class="admin-feedback-table-scroll">
          <table class="admin-feedback-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Login</th>
                <th>Feature</th>
                <th>Context</th>
                <th>Stars</th>
                <th>Review</th>
                <th>Public allowed</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>${items.map(renderRow).join("")}</tbody>
          </table>
        </div>
      </div>
    `;
  };

  function renderRow(item) {
    const user = item.user_name || item.username || item.email || item.telegram_id || item.user_id || "Guest";
    return `
      <tr>
        <td>${AdminFeedbackUI.escape(user)}</td>
        <td>${AdminFeedbackUI.escape(item.login_method || "-")}</td>
        <td>${AdminFeedbackUI.escape(item.feature_type || "-")}</td>
        <td>${AdminFeedbackUI.escape(item.context_key || "-")}</td>
        <td>${AdminFeedbackUI.escape(stars(item.rating))}</td>
        <td class="admin-feedback-comment">${AdminFeedbackUI.escape(item.comment || "-")}</td>
        <td>${item.public_permission ? "Yes" : "No"}</td>
        <td>${AdminFeedbackUI.escape(item.status || "-")}</td>
        <td>${AdminFeedbackUI.escape(date(item.created_at))}</td>
      </tr>
    `;
  }
})();
