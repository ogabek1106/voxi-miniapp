// frontend/js/user_reading/question_types/tfng.js
window.UserListening = window.UserListening || {};

/**
 * TFNG renderer
 * Shows statement + True / False / Not Given options
 */
UserListening.renderTFNG = function (q, base) {
  const text = q.content?.text || "";

  return `
    <div class="tfng-question">
      
      <div class="tfng-text">
        ${UserListening.escapeHtml(text)}
      </div>

      <div class="tfng-options">
        ${UserListening.renderTFNGOption(q, "TRUE")}
        ${UserListening.renderTFNGOption(q, "FALSE")}
        ${UserListening.renderTFNGOption(q, "NOT GIVEN")}
      </div>

    </div>
  `;
};


UserListening.renderTFNGOption = function (q, value) {
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
