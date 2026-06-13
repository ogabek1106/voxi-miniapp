window.AdminLearningDayEditor = window.AdminLearningDayEditor || {};

(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function blockSummary(block) {
    const content = block.content_json || {};
    return content.title || content.question || content.prompt || content.message || "Empty draft block";
  }

  AdminLearningDayEditor.render = function (state = {}) {
    const day = state.currentDay || {};
    const blocks = day.blocks || [];
    return `
      <div class="admin-learning-head">
        <div>
          <div class="admin-learning-kicker">Day ${escapeHtml(day.day_number ?? "-")}</div>
          <h2>${escapeHtml(day.title || "Day Editor")}</h2>
          <p>${escapeHtml(day.subtitle || "Edit optional day details and ordered blocks.")}</p>
        </div>
        <div class="admin-learning-head-actions">
          <button type="button" data-learning-preview="${Number(day.id)}">Preview Day</button>
          <button type="button" data-learning-back-days>Days</button>
        </div>
      </div>
      <form class="admin-learning-card admin-learning-form" id="admin-learning-day-info-form">
        <div class="admin-learning-form-grid">
          <label>Day number <input id="learning-edit-day-number" type="number" value="${day.day_number ?? ""}"></label>
          <label>Status <input id="learning-edit-day-status" value="${escapeHtml(day.status || "draft")}"></label>
        </div>
        <label>Title <input id="learning-edit-day-title" value="${escapeHtml(day.title || "")}"></label>
        <label>Subtitle <textarea id="learning-edit-day-subtitle">${escapeHtml(day.subtitle || "")}</textarea></label>
        <div class="admin-learning-form-grid">
          <label>Estimated minutes <input id="learning-edit-day-minutes" type="number" value="${day.estimated_minutes ?? ""}"></label>
          <label>XP reward <input id="learning-edit-day-xp" type="number" value="${day.xp_reward ?? ""}"></label>
        </div>
        <button type="submit">Save day info</button>
      </form>
      <div class="admin-learning-editor-grid">
        <section class="admin-learning-card">
          <h3>Blocks</h3>
          ${blocks.length ? blocks.map((block, index) => `
            <div class="admin-learning-block-row">
              <div>
                <strong>${Number(block.sort_order || index + 1)}. ${escapeHtml(block.block_type || "empty")}</strong>
                <small>${escapeHtml(blockSummary(block))}</small>
              </div>
              <div class="admin-learning-block-actions">
                <button type="button" data-move-block="${Number(block.id)}" data-direction="up">Up</button>
                <button type="button" data-move-block="${Number(block.id)}" data-direction="down">Down</button>
                <button type="button" data-edit-block="${Number(block.id)}">Edit</button>
                <button type="button" data-delete-block="${Number(block.id)}">Delete</button>
              </div>
            </div>
          `).join("") : `<div class="admin-learning-empty">This day has zero blocks.</div>`}
        </section>
        <section>${AdminLearningBlockEditor.render(state.editingBlock)}</section>
      </div>
    `;
  };

  AdminLearningDayEditor.collect = function () {
    const dayNumber = document.getElementById("learning-edit-day-number")?.value;
    const minutes = document.getElementById("learning-edit-day-minutes")?.value;
    const xp = document.getElementById("learning-edit-day-xp")?.value;
    return {
      day_number: dayNumber === "" ? null : Number(dayNumber),
      title: document.getElementById("learning-edit-day-title")?.value?.trim() || null,
      subtitle: document.getElementById("learning-edit-day-subtitle")?.value?.trim() || null,
      status: document.getElementById("learning-edit-day-status")?.value?.trim() || "draft",
      estimated_minutes: minutes === "" ? null : Number(minutes),
      xp_reward: xp === "" ? null : Number(xp),
    };
  };
})();
