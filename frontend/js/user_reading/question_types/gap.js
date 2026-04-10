// frontend/js/user_reading/question_types/gap.js

window.UserReading = window.UserReading || {};

/**
 * GAP / TEXT_INPUT renderer
 * Replaces ______ with input fields
 */
UserReading.renderGap = function (q, base) {
  const rawText = q.content?.text || "";

  // Detect blanks (____ or ______ or longer)
  const parts = rawText.split(/_{3,}/g); // split by 3+ underscores
  const blanksCount = parts.length - 1;

  let html = `<div class="question-text">`;

  parts.forEach((part, index) => {
    // text part
    html += `<span>${UserReading.escapeHtml(part)}</span>`;

    // insert input if not last part
    if (index < blanksCount) {
      html += UserReading.renderGapInput(q, index);
    }
  });

  html += `</div>`;

  return html;
};


/**
 * Single input field for gap
 */
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
    />
  `;
};
