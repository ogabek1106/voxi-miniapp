// frontend/js/user_reading/ui/question_view.js

window.UserListening = window.UserListening || {};

UserListening.isMatchingType = function (type) {
  const normalizedType = String(type || "").toUpperCase();
  return normalizedType === "MATCHING" || normalizedType === "PARAGRAPH_MATCHING";
};

UserListening.groupMatchingQuestions = function (questions) {
  const result = [];

  questions.forEach((q) => {
    if (UserListening.isMatchingType(q.type) && q.question_group_id) {
      let group = result.find(
        (g) => g.type === "MATCHING_GROUP" && g.group_id === q.question_group_id
      );

      if (!group) {
        group = {
          type: "MATCHING_GROUP",
          question_type: String(q.type || "").toUpperCase(),
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

  result.forEach((item) => {
    if (item.type === "MATCHING_GROUP") {
      item.questions.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
  });

  return result;
};

window.renderSingleQuestion = function (question, index, passageIndex = 0, displayOrder = null, passage = null) {
  return UserListening.renderSingleQuestion(question, index, passageIndex, displayOrder, passage);
};

UserListening.renderQuestionsForSection = function (passage, passageIndex, startingQuestionNumber = 1) {
  if (!passage.questions || !passage.questions.length) return "";

  const groupedMatching = UserListening.groupMatchingQuestions(passage.questions);
  const groupedSummary = UserListening.groupSummaryQuestions
    ? UserListening.groupSummaryQuestions(groupedMatching)
    : groupedMatching;
  const grouped = UserListening.groupImageQuestions
    ? UserListening.groupImageQuestions(groupedSummary)
    : groupedSummary;
  let currentNumber = startingQuestionNumber;

  return `
    <div class="questions-container">
      ${grouped.map((item, index) => {
        if (item.type === "MATCHING_GROUP") {
          const block = UserListening.renderMatchingGroup(item, passageIndex, currentNumber, passage);
          currentNumber += item.questions.length;
          return block;
        }

        if (item.type === "SUMMARY_GROUP") {
          const block = UserListening.renderSummaryGroup(item, currentNumber);
          currentNumber += item.questions.length;
          return block;
        }

        if (item.type === "IMAGE_QUESTIONS_GROUP") {
          const block = UserListening.renderImageQuestionsGroup(item, currentNumber);
          currentNumber += item.questions.length;
          return block;
        }

        const block = UserListening.renderSingleQuestion(item, index, passageIndex, currentNumber, passage);
        currentNumber += 1;
        return block;
      }).join("")}
    </div>
  `;
};

UserListening.renderSingleQuestion = function (q, questionIndex, passageIndex, displayOrder = null, passage = null) {
  const type = (q.type || "").toUpperCase();

  const base = {
    id: q.id,
    passageIndex,
    questionIndex,
    order: displayOrder || q.order_index || questionIndex + 1,
    instruction: q.instruction,
    meta: q.meta || {},
    content: q.content || {},
  };

  let inner = "";

  switch (type) {
    case "SINGLE_CHOICE":
      inner = UserListening.renderSingleChoice(q, base);
      break;

    case "MULTI_CHOICE":
      inner = UserListening.renderMultiChoice(q, base);
      break;

    case "TFNG":
      inner = UserListening.renderTFNG(q, base);
      break;

    case "YES_NO_NG":
      inner = UserListening.renderYNNG(q, base);
      break;

    case "TEXT_INPUT":
      if (UserListening.isSummaryQuestion && UserListening.isSummaryQuestion(q)) {
        inner = UserListening.renderSummaryGroup({
          type: "SUMMARY_GROUP",
          group_id: q.question_group_id || q.id,
          questions: [q],
          meta: q.meta || {},
          content: q.content || {}
        }, base.order);
      } else if (UserListening.isImageQuestionsQuestion && UserListening.isImageQuestionsQuestion(q)) {
        inner = UserListening.renderImageQuestionsGroup({
          type: "IMAGE_QUESTIONS_GROUP",
          group_id: q.question_group_id || q.id,
          questions: [q]
        }, base.order);
      } else {
        inner = UserListening.renderGap(q, base);
      }
      break;

    case "MATCHING":
    case "PARAGRAPH_MATCHING":
      inner = UserListening.renderMatchingGroup({
        type: "MATCHING_GROUP",
        question_type: type,
        group_id: q.question_group_id || q.id,
        questions: [q],
        meta: q.meta || {}
      }, passageIndex, base.order, passage);
      break;

    default:
      inner = `<div>Unsupported question type: ${type}</div>`;
  }

  if (
    UserListening.isMatchingType(type) ||
    (UserListening.isSummaryQuestion && UserListening.isSummaryQuestion(q)) ||
    (UserListening.isImageQuestionsQuestion && UserListening.isImageQuestionsQuestion(q))
  ) {
    return inner;
  }

  return `
    <div class="question-block"
         data-question-id="${q.id}"
         data-section-index="${passageIndex}"
         data-question-index="${questionIndex}"
         data-question-type="${UserListening.escapeHtml(type)}">

      ${UserListening.renderQuestionHeader(base)}

      ${inner}
    </div>
  `;
};

UserListening.renderQuestionHeader = function (base) {
  return `
    <div class="question-header">
      <div class="question-number">
        Question ${base.order}
      </div>

      ${
        base.instruction
          ? `<div class="question-instruction">
               ${UserListening.escapeHtml(base.instruction)}
             </div>`
          : ""
      }
    </div>
  `;
};

UserListening.renderTextInput = function (q, base) {
  const text = q.content?.text || "";
  const wordLimit = q.meta?.word_limit || q.word_limit;

  return `
    <div class="question-text">
      ${UserListening.formatPassageText(text)}
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

UserListening.renderSingleChoice = function (q, base) {
  const options = q.options || q.meta?.options || [];

  return `
    <div class="question-text">
      ${UserListening.escapeHtml(q.content?.text || "")}
    </div>

    ${options.map((opt, i) => {
      const key = String.fromCharCode(65 + i);

      return `
        <label class="option">
          <input type="radio" name="q_${q.id}" value="${key}" />
          ${key}. ${UserListening.escapeHtml(opt)}
        </label>
      `;
    }).join("")}
  `;
};

UserListening.renderMultiChoice = function (q, base) {
  const options = q.options || q.content?.options || [];

  return `
    <div class="question-text">
      ${UserListening.escapeHtml(q.content?.text || "")}
    </div>

    ${options.map((opt) => `
      <label class="option">
        <input type="checkbox" name="q_${q.id}" value="${opt.key}">
        ${UserListening.escapeHtml(opt.key)}. ${UserListening.escapeHtml(opt.text)}
      </label>
    `).join("")}
  `;
};

UserListening.renderTFNG = function (q, base) {
  const text = q.content?.text || "";

  return `
    <div class="tfng-question">
      <div class="tfng-text">
        ${UserListening.escapeHtml(text)}
      </div>

      <div class="tfng-options">
        ${UserListening.renderTFNGOption(q.id, "TRUE")}
        ${UserListening.renderTFNGOption(q.id, "FALSE")}
        ${UserListening.renderTFNGOption(q.id, "NOT GIVEN")}
      </div>
    </div>
  `;
};

UserListening.renderTFNGOption = function (questionId, value) {
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

UserListening.renderYNNG = function (q, base) {
  return UserListening.renderSelect(q.id, ["YES", "NO", "NOT GIVEN"]);
};

UserListening.renderSelect = function (questionId, options) {
  return `
    <select name="q_${questionId}" class="question-select">
      <option value="">Choose answer</option>
      ${options.map((option) => `
        <option value="${option}">
          ${option.replace("_", " ")}
        </option>
      `).join("")}
    </select>
  `;
};

UserListening.buildParagraphMatchingLetters = function (group, passage) {
  const savedParagraphCount = parseInt(group?.meta?.paragraph_count || "0", 10);

  if (savedParagraphCount > 0) {
    return Array.from({ length: savedParagraphCount }, (_, index) =>
      String.fromCharCode(65 + index)
    );
  }

  const paragraphCount = String(passage?.text || "")
    .split("\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .length;

  const maxAnswerIndex = (group.questions || []).reduce((maxIndex, question) => {
    const answer = String(question.correct_answer?.value || "").trim().toUpperCase();
    if (!answer) return maxIndex;

    const code = answer.charCodeAt(0);
    if (code < 65 || code > 90) return maxIndex;

    return Math.max(maxIndex, code - 64);
  }, 0);

  const optionCount = Math.max(paragraphCount, maxAnswerIndex, 1);

  return Array.from({ length: optionCount }, (_, index) =>
    String.fromCharCode(65 + index)
  );
};

UserListening.renderMatchingGroup = function (group, passageIndex, startNumber, passage = null) {
  const isParagraphMatching = group.question_type === "PARAGRAPH_MATCHING";
  const options = isParagraphMatching
    ? UserListening.buildParagraphMatchingLetters(group, passage)
    : (group.meta?.options || []);
  const endNumber = startNumber + group.questions.length - 1;
  const headerLabel = group.questions.length > 1
    ? `Questions ${startNumber}-${endNumber}`
    : `Question ${startNumber}`;

  return `
    <div class="question-block matching-group">
      <div class="question-header">
        <div class="question-number">
          ${headerLabel}
        </div>
      </div>

      ${isParagraphMatching ? "" : `
        <div class="matching-options">
          ${options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            return `
              <div class="matching-option-item">
                <strong>${letter}</strong>. ${UserListening.escapeHtml(opt)}
              </div>
            `;
          }).join("")}
        </div>
      `}

      <div class="matching-rows">
        ${group.questions.map((q, i) => {
          const number = startNumber + i;

          return `
            <div class="matching-row">
              <div class="matching-text">
                ${number}. ${UserListening.escapeHtml(q.content?.text || "")}
              </div>

              ${UserListening.renderMatchingSelect(q.id, options)}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
};

UserListening.renderMatchingSelect = function (questionId, options) {
  return `
    <select name="q_${questionId}" class="matching-select">
      <option value="">Choose</option>

      ${options.map((option, index) => {
        const letter = typeof option === "string" && option.length === 1
          ? option
          : String.fromCharCode(65 + index);

        return `
          <option value="${letter}">
            ${letter}
          </option>
        `;
      }).join("")}
    </select>
  `;
};
