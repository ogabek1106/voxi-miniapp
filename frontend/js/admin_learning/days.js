window.AdminLearningDays = window.AdminLearningDays || {};

(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  AdminLearningDays.render = function (state = {}) {
    const month = state.currentMonth || {};
    const days = state.days || [];
    return `
      <div class="admin-learning-head">
        <div>
          <div class="admin-learning-kicker">Month ${escapeHtml(month.month_number ?? "-")}</div>
          <h2>${escapeHtml(month.title || "Learning Days")}</h2>
          <p>${escapeHtml(month.description || "Create draft days and arrange their learning blocks.")}</p>
        </div>
        <button type="button" data-learning-back-months>Months</button>
      </div>
      <form class="admin-learning-card admin-learning-form" id="admin-learning-day-form">
        <div class="admin-learning-form-grid">
          <label>Day number
            <input id="learning-day-number" type="number" min="1" value="${Number(days.length || 0) + 1}">
          </label>
          <label>Status
            <input id="learning-day-status" value="draft">
          </label>
        </div>
        <label>Title
          <input id="learning-day-title" placeholder="Optional">
        </label>
        <button type="submit">Add day</button>
      </form>
      <div class="admin-learning-day-grid">
        ${days.length ? days.map((day) => `
          <article class="admin-learning-card admin-learning-day">
            <div>
              <div class="admin-learning-day-number">Day ${escapeHtml(day.day_number ?? "-")}</div>
              <h3>${escapeHtml(day.title || "Untitled day")}</h3>
              <p>${escapeHtml(day.status || "draft")} - ${Number(day.blocks_count || 0)} blocks</p>
            </div>
            <div class="admin-learning-actions">
              <button type="button" data-open-day="${Number(day.id)}">Editor</button>
              <button type="button" data-delete-day="${Number(day.id)}">Delete</button>
            </div>
          </article>
        `).join("") : `<div class="admin-learning-empty">No days in this month yet.</div>`}
      </div>
    `;
  };

  AdminLearningDays.collect = function () {
    const dayNumber = document.getElementById("learning-day-number")?.value;
    return {
      day_number: dayNumber === "" ? null : Number(dayNumber),
      title: document.getElementById("learning-day-title")?.value?.trim() || null,
      subtitle: null,
      status: document.getElementById("learning-day-status")?.value?.trim() || "draft",
      estimated_minutes: null,
      xp_reward: null,
    };
  };
})();
