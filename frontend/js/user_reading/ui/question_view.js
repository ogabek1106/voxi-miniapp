// frontend/js/user_reading/ui/question_view.js

window.UserReading = window.UserReading || {};
UserReading.groupMatchingQuestions = function (questions) {
  const result = [];

  questions.forEach(q => {
    if (q.type === "MATCHING" && q.question_group_id) {
      let group = result.find(
        g => g.type === "MATCHING_GROUP" && g.group_id === q.question_group_id
      );

      if (!group) {
        group = {
          type: "MATCHING_GROUP",
          group_id: q.question_group_id,
          questions: [],
          meta: q.meta || {}
        };
        result.push(group);
      }

      group.questions.push(q);
    } else {
      result.push(q);
    }
  });
  result.forEach(item => {
    if (item.type === "MATCHING_GROUP") {
      item.questions.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
  });

  return result;
};

/**
 * MAIN ENTRY (used by dynamic.js)
 * KEEP for compatibility
 */
window.renderSingleQuestion = function (question, index, passageIndex = 0, displayOrder = null) {
  return UserReading.renderSingleQuestion(question, index, passageIndex, displayOrder);
};


/**
 * Render ALL questions for a passage
 */
UserReading.renderQuestionsForPassage = function (passage, passageIndex, startingQuestionNumber = 1) {
  if (!passage.questions || !passage.questions.length) return "";
  const grouped = UserReading.groupMatchingQuestions(passage.questions);

let currentNumber = startingQuestionNumber;

return `
  <div class="questions-container">
    ${grouped.map((item, index) => {

      // ✅ MATCHING GROUP
      if (item.type === "MATCHING_GROUP") {
        const block = UserReading.renderMatchingGroup(
          item,
          passageIndex,
          currentNumber
        );

        currentNumber += item.questions.length;
        return block;
      }

      // ✅ NORMAL QUESTIONS
      const block = UserReading.renderSingleQuestion(
        item,
        index,
        passageIndex,
        currentNumber
      );

      currentNumber += 1;
      return block;

    }).join("")}
  </div>
`;
};


/**
 * ROUTER: decides which renderer to use
 */
UserReading.renderSingleQuestion = function (q, questionIndex, passageIndex, displayOrder = null) {
  const type = (q.type || "").toUpperCase();

  const base = {
    id: q.id,
    passageIndex,
    questionIndex,
    order: displayOrder || q.order_index || questionIndex + 1,
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
        Question ${base.order}
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


UserReading.renderTFNG = function (q, base) {
  const text = q.content?.text || "";

  return `
    <div class="tfng-question">

      <div class="tfng-text">
        ${UserReading.escapeHtml(text)}
      </div>

      <div class="tfng-options">
        ${UserReading.renderTFNGOption(q.id, "TRUE")}
        ${UserReading.renderTFNGOption(q.id, "FALSE")}
        ${UserReading.renderTFNGOption(q.id, "NOT GIVEN")}
      </div>

    </div>
  `;
};


UserReading.renderTFNGOption = function (questionId, value) {
  return `
    <label class="tfng-option">
      <input
        type="radio"
        name="q_${questionId}"
        value="${value}"
        data-qid="${questionId}"
      />
      <span>${value}</span>
    </label>
  `;
};

/**
 * YES / NO / NOT GIVEN
 */
UserReading.renderYNNG = function (q, base) {
  return UserReading.renderSelect(q.id, ["YES", "NO", "NOT GIVEN"]);
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

UserReading.renderMatchingGroup = function (group, passageIndex, startNumber) {
  const options = group.meta?.options || [];

  return `
    <div class="question-block matching-group">

      <div class="question-header">
        <div class="question-number">
          Questions ${startNumber}–${startNumber + group.questions.length - 1}
        </div>
      </div>

      <div class="matching-options">
        ${options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          return `
            <div class="matching-option-item">
              <strong>${letter}</strong>. ${UserReading.escapeHtml(opt)}
            </div>
          `;
        }).join("")}
      </div>

      <div class="matching-rows">
        ${group.questions.map((q, i) => {
          const number = startNumber + i;

          return `
            <div class="matching-row">

              <div class="matching-text">
                ${number}. ${UserReading.escapeHtml(q.content?.text || "")}
              </div>

              ${UserReading.renderMatchingSelect(q.id, options)}

            </div>
          `;
        }).join("")}
      </div>

    </div>
  `;
};


UserReading.renderMatchingSelect = function (questionId, options) {
  return `
    <select name="q_${questionId}" class="matching-select">
      <option value="">Choose</option>

      ${options.map((_, index) => {
        const letter = String.fromCharCode(65 + index);

        return `
          <option value="${letter}">
            ${letter}
          </option>
        `;
      }).join("")}

    </select>
  `;
};
