// frontend/js/user_reading/ui/question_view.js

window.UserReading = window.UserReading || {};

/**
 * MAIN ENTRY (used by dynamic.js)
 * KEEP for compatibility
 */
window.renderSingleQuestion = function (question, index, passageIndex = 0) {
  return UserReading.renderSingleQuestion(question, index, passageIndex);
};


/**
 * Render ALL questions for a passage
 */
UserReading.renderQuestionsForPassage = function (passage, passageIndex) {
  if (!passage.questions || !passage.questions.length) return "";

  return `
    <div class="questions-container">
      ${passage.questions
        .map((q, qi) =>
          UserReading.renderSingleQuestion(q, qi, passageIndex)
        )
        .join("")}
    </div>
  `;
};


/**
 * ROUTER: decides which renderer to use
 */
UserReading.renderSingleQuestion = function (q, questionIndex, passageIndex) {
  const type = (q.type || "").toUpperCase();

  const base = {
    id: q.id,
    passageIndex,
    questionIndex,
    order: q.order_index || questionIndex + 1,
    instruction: q.instruction,
    image: q.image_url,
    meta: q.meta || {},
    content: q.content || {},
  };

  let inner = "";

  switch (type) {
    case "SINGLE_CHOICE":
      inner = UserReading.renderSingleChoice(q, base);
      break;

    case "MULTI_CHOICE":
      inner = UserReading.renderMultiChoice(q, base);
      break;

    case "TFNG":
      inner = UserReading.renderTFNG(q, base);
      break;

    case "YES_NO_NG":
      inner = UserReading.renderYNNG(q, base);
      break;

    case "TEXT_INPUT":
      inner = UserReading.renderGap(q, base);
      break;

    default:
      inner = `<div>Unsupported question type: ${type}</div>`;
  }

  return `
    <div class="question-block"
         data-question-id="${q.id}"
         data-passage-index="${passageIndex}"
         data-question-index="${questionIndex}"
         data-question-type="${UserReading.escapeHtml(type)}">

      ${UserReading.renderQuestionHeader(base)}

      ${inner}
    </div>
  `;
};


/**
 * Header (Q number + instruction)
 */
UserReading.renderQuestionHeader = function (base) {
  return `
    <div class="question-header">
      <div class="question-number">
        Q${base.order}
      </div>

      ${
        base.instruction
          ? `<div class="question-instruction">
               ${UserReading.escapeHtml(base.instruction)}
             </div>`
          : ""
      }
    </div>
  `;
};


/* =========================
   QUESTION TYPES
========================= */

/**
 * TEXT INPUT (your DB example)
 */
UserReading.renderTextInput = function (q, base) {
  const text = q.content?.text || "";
  const wordLimit = q.meta?.word_limit || q.word_limit;

  return `
    <div class="question-text">
      ${UserReading.formatPassageText(text)}
    </div>

    <input
      type="text"
      name="q_${q.id}"
      data-qid="${q.id}"
      placeholder="Write your answer..."
      class="question-input"
    />

    ${
      wordLimit
        ? `<div class="question-hint">
             Max ${wordLimit} word${wordLimit > 1 ? "s" : ""}
           </div>`
        : ""
    }
  `;
};


/**
 * SINGLE CHOICE
 */
UserReading.renderSingleChoice = function (q, base) {
  const options = q.options || q.meta?.options || [];

  return `
    <div class="question-text">
      ${UserReading.escapeHtml(q.content?.text || "")}
    </div>

    ${options.map((opt, i) => {
      const key = String.fromCharCode(65 + i);

      return `
        <label class="option">
          <input type="radio" name="q_${q.id}" value="${key}" />
          ${key}. ${UserReading.escapeHtml(opt)}
        </label>
      `;
    }).join("")}
  `;
};


/**
 * MULTI CHOICE
 */
UserReading.renderMultiChoice = function (q, base) {
  const options = q.options || q.content?.options || [];

  return `
    <div class="question-text">
      ${UserReading.escapeHtml(q.content?.text || "")}
    </div>

    ${options.map(opt => `
      <label class="option">
        <input type="checkbox" name="q_${q.id}" value="${opt.key}">
        ${UserReading.escapeHtml(opt.key)}. ${UserReading.escapeHtml(opt.text)}
      </label>
    `).join("")}
  `;
};


/**
 * TFNG
 */
UserReading.renderTFNG = function (q, base) {
  return UserReading.renderSelect(q.id, ["TRUE", "FALSE", "NOT_GIVEN"]);
};


/**
 * YES / NO / NOT GIVEN
 */
UserReading.renderYNNG = function (q, base) {
  return UserReading.renderSelect(q.id, ["YES", "NO", "NOT_GIVEN"]);
};


/**
 * SHARED SELECT
 */
UserReading.renderSelect = function (questionId, options) {
  return `
    <select name="q_${questionId}" class="question-select">
      <option value="">Choose answer</option>
      ${options.map(o => `
        <option value="${o}">
          ${o.replace("_", " ")}
        </option>
      `).join("")}
    </select>
  `;
};
