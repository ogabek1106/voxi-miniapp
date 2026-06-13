window.AdminLearningPreview = window.AdminLearningPreview || {};

(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function list(items) {
    return Array.isArray(items) && items.length
      ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "";
  }

  function renderBlock(block) {
    const type = block?.block_type || "intro";
    const content = block?.content_json || {};
    if (type === "multiple_choice") {
      return `
        <h3>${escapeHtml(content.question || "Multiple choice")}</h3>
        <div class="admin-learning-preview-options">
          ${(content.options || []).map((item, index) => `<div>${index + 1}. ${escapeHtml(item)}</div>`).join("") || `<div>No options yet.</div>`}
        </div>
        ${content.explanation ? `<p>${escapeHtml(content.explanation)}</p>` : ""}
      `;
    }
    if (type === "word_shuffle") {
      return `
        <h3>${escapeHtml(content.prompt || "Word shuffle")}</h3>
        ${list(content.words)}
        ${content.correct_sentence ? `<p>${escapeHtml(content.correct_sentence)}</p>` : ""}
      `;
    }
    if (type === "match_words") {
      return `
        <h3>Match words</h3>
        <div class="admin-learning-preview-pairs">
          ${(content.pairs || []).map((pair) => `<div><span>${escapeHtml(pair.left)}</span><span>${escapeHtml(pair.right)}</span></div>`).join("") || `<p>No pairs yet.</p>`}
        </div>
      `;
    }
    if (type === "completion") {
      return `
        <h3>${escapeHtml(content.title || "Complete")}</h3>
        <p>${escapeHtml(content.message || "Day complete.")}</p>
        ${content.xp_reward != null ? `<strong>${Number(content.xp_reward)} XP</strong>` : ""}
      `;
    }
    if (type === "explanation") {
      return `
        <h3>${escapeHtml(content.title || "Explanation")}</h3>
        <p>${escapeHtml(content.text || "No explanation text yet.")}</p>
        ${list(content.examples)}
      `;
    }
    return `
      <h3>${escapeHtml(content.title || "Intro")}</h3>
      <p>${escapeHtml(content.text || "No intro text yet.")}</p>
      ${content.button_text ? `<strong>${escapeHtml(content.button_text)}</strong>` : ""}
    `;
  }

  AdminLearningPreview.render = function (state = {}) {
    const day = state.previewDay || {};
    const blocks = day.blocks || [];
    const index = Math.max(0, Math.min(Number(state.previewIndex || 0), Math.max(blocks.length - 1, 0)));
    const block = blocks[index] || null;
    return `
      <div class="admin-learning-head">
        <div>
          <div class="admin-learning-kicker">Admin preview</div>
          <h2>${escapeHtml(day.title || `Day ${day.day_number ?? ""}` || "Day preview")}</h2>
          <p>${blocks.length ? `Screen ${index + 1} of ${blocks.length}` : "This day has no blocks yet."}</p>
        </div>
        <button type="button" data-learning-back-editor>Editor</button>
      </div>
      <div class="admin-learning-preview-shell">
        <section class="admin-learning-preview-screen">
          ${block ? renderBlock(block) : `<h3>Empty day</h3><p>Add blocks in the editor to preview the user flow.</p>`}
        </section>
        <div class="admin-learning-preview-nav">
          <button type="button" data-preview-step="back" ${index <= 0 ? "disabled" : ""}>Back</button>
          <button type="button" data-preview-step="next" ${index >= blocks.length - 1 ? "disabled" : ""}>Next</button>
        </div>
      </div>
    `;
  };
})();
