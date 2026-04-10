// frontend/js/user_reading/question_types/tfng.js
window.UserReading = window.UserReading || {};

/**
 * TFNG renderer
 * Shows statement + True / False / Not Given options
 */
UserReading.renderTFNG = function (q, base) {
  const text = q.content?.text || "";

  return `
    <div class="tfng-question">
      
      <div class="tfng-text">
        ${UserReading.escapeHtml(text)}
      </div>

      <div class="tfng-options">
        ${UserReading.renderTFNGOption(q, "TRUE")}
        ${UserReading.renderTFNGOption(q, "FALSE")}
        ${UserReading.renderTFNGOption(q, "NOT GIVEN")}
      </div>

    </div>
  `;
};


UserReading.renderTFNGOption = function (q, value) {
  const name = `q_${q.id}`;

  return `
    <label class="tfng-option">
      <input
        type="radio"
        name="${name}"
        value="${value}"
        data-qid="${q.id}"
      />
      <span>${value}</span>
    </label>
  `;
};
