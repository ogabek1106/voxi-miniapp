// frontend/js/user_reading/ui/question_view.js

window.UserReading = window.UserReading || {};

/**
 * MAIN ENTRY (used by dynamic.js)
 * This keeps compatibility while we refactor
 */
window.renderSingleQuestion = function (question, index) {
  return UserReading.renderQuestion(question, index);
};

/**
 * Render ONE question block
 */
UserReading.renderQuestion = function (question, index) {
  const number = question.order_index || index + 1;
  const type = question.type;
  const text = question.content?.text || "";

  return `
    <div class="reading-question"
         data-question-id="${question.id}"
         data-question-type="${UserReading.escapeHtml(type)}"
         style="
           margin:12px 0;
           padding:12px;
           border-radius:8px;
           background:var(--card-bg, #f4f4f6);
         ">
         
      <div style="font-weight:700; margin-bottom:6px;">
        Q${number}
      </div>

      ${text ? `
        <div style="margin-bottom:8px;">
          ${UserReading.escapeHtml(text)}
        </div>
      ` : ""}

      ${UserReading.renderAnswerInput(question)}
    </div>
  `;
};

/**
 * Render INPUT based on question type
 */
UserReading.renderAnswerInput = function (question) {
  if (question.type === "SINGLE_CHOICE") {
    const options = question.meta?.options || [];

    return options.map((option, index) => {
      const key = String.fromCharCode(65 + index);

      return `
        <label style="display:block; margin:6px 0;">
          <input type="radio" name="q_${question.id}" value="${key}" />
          ${key}. ${UserReading.escapeHtml(option)}
        </label>
      `;
    }).join("");
  }

  if (question.type === "MULTI_CHOICE") {
    const options = question.content?.options || [];

    return options.map((option) => `
      <label style="display:block; margin:6px 0;">
        <input type="checkbox"
               name="q_${question.id}"
               value="${UserReading.escapeHtml(option.key)}" />
        ${UserReading.escapeHtml(option.key)}.
        ${UserReading.escapeHtml(option.text)}
      </label>
    `).join("");
  }

  if (question.type === "TFNG") {
    return UserReading.renderSelect(question.id, ["TRUE", "FALSE", "NOT_GIVEN"]);
  }

  if (question.type === "YES_NO_NG") {
    return UserReading.renderSelect(question.id, ["YES", "NO", "NOT_GIVEN"]);
  }

  // DEFAULT = text input
  return `
    <input
      name="q_${question.id}"
      placeholder="Type your answer..."
      style="
        width:100%;
        padding:10px;
        border-radius:6px;
        border:1px solid #ccc;
        box-sizing:border-box;
      "
    />
  `;
};

/**
 * Shared select renderer
 */
UserReading.renderSelect = function (questionId, options) {
  return `
    <select name="q_${questionId}"
            style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc;">
      <option value="">Choose answer</option>
      ${options.map(option => `
        <option value="${option}">
          ${option.replace("_", " ")}
        </option>
      `).join("")}
    </select>
  `;
};
