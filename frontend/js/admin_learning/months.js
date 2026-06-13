window.AdminLearningMonths = window.AdminLearningMonths || {};

(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function status(value) {
    return escapeHtml(value || "draft");
  }

  AdminLearningMonths.render = function (state = {}) {
    const months = state.months || [];
    return `
      <div class="admin-learning-head">
        <div>
          <h2>Learning Plan</h2>
          <p>Manage the 12-month daily task map.</p>
        </div>
        <button type="button" onclick="showAdminPanel()">Back</button>
      </div>
      <form class="admin-learning-card admin-learning-form" id="admin-learning-month-form">
        <div class="admin-learning-form-grid">
          <label>Month number
            <input id="learning-month-number" type="number" min="1" max="12" value="${Number(months.length || 0) + 1}">
          </label>
          <label>Status
            <input id="learning-month-status" value="draft">
          </label>
        </div>
        <label>Title
          <input id="learning-month-title" placeholder="Optional">
        </label>
        <label>Description
          <textarea id="learning-month-description" placeholder="Optional"></textarea>
        </label>
        <button type="submit">Add month</button>
      </form>
      <div class="admin-learning-grid">
        ${months.length ? months.map((month) => `
          <article class="admin-learning-card admin-learning-item">
            <div>
              <div class="admin-learning-kicker">Month ${escapeHtml(month.month_number ?? "-")}</div>
              <h3>${escapeHtml(month.title || `Month ${month.month_number ?? ""}`)}</h3>
              <p>${escapeHtml(month.description || "No description yet.")}</p>
              <div class="admin-learning-meta">
                <span>${Number(month.days_count || 0)} days</span>
                <span>${status(month.status)}</span>
              </div>
            </div>
            <div class="admin-learning-actions">
              <button type="button" data-open-month="${Number(month.id)}">Open</button>
              <button type="button" data-edit-month="${Number(month.id)}">Edit</button>
              <button type="button" data-delete-month="${Number(month.id)}">Delete</button>
            </div>
          </article>
        `).join("") : `<div class="admin-learning-empty">No learning months yet.</div>`}
      </div>
    `;
  };

  AdminLearningMonths.collect = function () {
    const monthNumber = document.getElementById("learning-month-number")?.value;
    return {
      month_number: monthNumber === "" ? null : Number(monthNumber),
      title: document.getElementById("learning-month-title")?.value?.trim() || null,
      description: document.getElementById("learning-month-description")?.value?.trim() || null,
      status: document.getElementById("learning-month-status")?.value?.trim() || "draft",
    };
  };

  AdminLearningMonths.find = function (months, id) {
    return (months || []).find((month) => Number(month.id) === Number(id));
  };

  AdminLearningMonths.promptEdit = function (month) {
    if (!month) return null;
    const monthNumber = window.prompt("Month number", month.month_number ?? "");
    if (monthNumber === null) return null;
    const title = window.prompt("Title", month.title || "");
    if (title === null) return null;
    const statusValue = window.prompt("Status", month.status || "draft");
    if (statusValue === null) return null;
    const description = window.prompt("Description", month.description || "");
    if (description === null) return null;
    return {
      month_number: monthNumber === "" ? null : Number(monthNumber),
      title: title.trim() || null,
      description: description.trim() || null,
      status: statusValue.trim() || "draft",
    };
  };
})();
