// frontend/js/user_reading/question_types/gap.js

window.UserReading = window.UserReading || {};

/**
 * GAP / TEXT_INPUT renderer
 * Replaces ______ with input fields
 */
UserReading.renderGap = function (q, base) {
  const rawText = q.content?.text || "";
  const parts = rawText.split(/_{3,}/g);
  const blanksCount = parts.length - 1;

  let html = `<div class="question-text">`;

  parts.forEach((part, index) => {
    html += `<span>${UserReading.escapeHtml(part)}</span>`;

    if (index < blanksCount) {
      html += UserReading.renderGapInput(q, index);
    }
  });

  html += `</div>`;

  return html;
};


UserReading.renderGapInput = function (q, blankIndex) {
  const name = `q_${q.id}_${blankIndex}`;

  return `
    <input
      type="text"
      name="${name}"
      data-qid="${q.id}"
      data-blank-index="${blankIndex}"
      class="gap-input"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    />
  `;
};
