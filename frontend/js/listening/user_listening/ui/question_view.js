// frontend/js/user_reading/ui/question_view.js

window.UserListening = window.UserListening || {};

UserListening.isMatchingType = function (type) {
  const normalizedType = UserListening.normalizeListeningQuestionType
    ? UserListening.normalizeListeningQuestionType(type)
    : String(type || "").toUpperCase();
  return normalizedType === "MATCHING" || normalizedType === "PARAGRAPH_MATCHING";
};

UserListening.normalizeListeningQuestionType = function (type) {
  const normalized = String(type || "").trim().toUpperCase();
  const aliases = {
    MCQ_SINGLE: "SINGLE_CHOICE",
    MCQ_MULTIPLE: "MULTIPLE_CHOICE",
    MULTI_CHOICE: "MULTIPLE_CHOICE",
    MAP_LABELING: "MAP_LABELING",
    DIAGRAM_LABELING: "DIAGRAM_LABELING"
  };
  return aliases[normalized] || normalized;
};

UserListening.getQuestionText = function (question) {
  const content = question?.content;
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    return content.text || content.prompt || content.label || "";
  }
  return "";
};

UserListening.getQuestionOptions = function (question, group = null) {
  const sources = [
    question?.meta?.options,
    question?.content?.options,
    question?.options,
    group?.meta?.options,
    group?.content?.options
  ];
  const raw = sources.find((item) => Array.isArray(item)) || [];
  return raw
    .map((option, index) => {
      if (typeof option === "string") {
        return {
          key: String.fromCharCode(65 + index),
          text: option
        };
      }
      return {
        key: option?.key || option?.value || String.fromCharCode(65 + index),
        text: option?.text || option?.label || option?.value || ""
      };
    })
    .filter((option) => String(option.text || option.key || "").trim().length > 0);
};

UserListening.getListeningVisualUrl = function (item) {
  const firstQuestion = Array.isArray(item?.questions) ? (item.questions[0] || {}) : {};
  return item?.image_url
    || item?.meta?.image_url
    || item?.content?.image_url
    || firstQuestion?.image_url
    || firstQuestion?.meta?.image_url
    || firstQuestion?.content?.image_url
    || "";
};

UserListening.renderListeningVisual = function (item, alt = "Question visual") {
  const imageUrl = UserListening.getListeningVisualUrl(item);
  if (!imageUrl) return "";
  const src = UserListening.toMediaUrl ? UserListening.toMediaUrl(imageUrl) : imageUrl;

  return `
    <div class="image-questions-image-wrap listening-block-visual">
      <img
        src="${UserListening.escapeHtml(src)}"
        class="image-questions-image"
        alt="${UserListening.escapeHtml(alt)}"
        data-full-image-src="${UserListening.escapeHtml(src)}"
        onclick="UserListening.openImageQuestionsViewer(this.getAttribute('data-full-image-src'))"
      />
    </div>
  `;
};

UserListening.isListeningCompletionType = function (type) {
  return [
    "FORM_COMPLETION",
    "NOTE_COMPLETION",
    "SENTENCE_COMPLETION",
    "SUMMARY_COMPLETION",
    "FLOWCHART_COMPLETION",
    "TABLE_COMPLETION",
    "SHORT_ANSWER"
  ].includes(UserListening.normalizeListeningQuestionType(type));
};

UserListening.isListeningLabelType = function (type) {
  return [
    "MAP_LABEL",
    "PLAN_LABEL",
    "DIAGRAM_LABEL",
    "MAP_LABELING",
    "DIAGRAM_LABELING"
  ].includes(UserListening.normalizeListeningQuestionType(type));
};

UserListening.isListeningGroupedType = function (type) {
  return UserListening.isListeningCompletionType(type) || UserListening.isListeningLabelType(type);
};

UserListening.groupListeningQuestionBlocks = function (items) {
  const result = [];

  items.forEach((item) => {
    const type = UserListening.normalizeListeningQuestionType(item?.type);
    if (UserListening.isMatchingType(type) || !UserListening.isListeningGroupedType(type) || !item.question_group_id) {
      result.push(item);
      return;
    }

    let group = result.find(
      (entry) => entry.type === "LISTENING_TYPED_GROUP" && entry.group_id === item.question_group_id
    );

    if (!group) {
      group = {
        type: "LISTENING_TYPED_GROUP",
        question_type: type,
        group_id: item.question_group_id,
        questions: [],
        meta: item.meta || {},
        content: item.content || {},
        image_url: item.image_url || "",
        instruction: item.instruction || ""
      };
      result.push(group);
    }

    group.questions.push(item);
    group.meta = { ...(group.meta || {}), ...(item.meta || {}) };
    if (!group.image_url && item.image_url) group.image_url = item.image_url;
    if (!group.instruction && item.instruction) group.instruction = item.instruction;
  });

  result.forEach((item) => {
    if (item.type === "LISTENING_TYPED_GROUP") {
      item.questions.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
  });

  return result;
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
          meta: q.meta || {},
          image_url: q.image_url || ""
        };
        result.push(group);
      }

      if (!group.image_url && q.image_url) group.image_url = q.image_url;
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

  UserListening.__questionDisplayNumbers = new Map();
  const groupedMatching = UserListening.groupMatchingQuestions(passage.questions);
  const groupedSummary = UserListening.groupSummaryQuestions
    ? UserListening.groupSummaryQuestions(groupedMatching)
    : groupedMatching;
  const grouped = UserListening.groupImageQuestions
    ? UserListening.groupImageQuestions(groupedSummary)
    : groupedSummary;
  const listeningGrouped = UserListening.groupListeningQuestionBlocks(grouped);
  let currentNumber = startingQuestionNumber;
  const registerDisplayNumbers = (questions, startNumber) => {
    (questions || []).forEach((question, index) => {
      const qid = Number(question?.id);
      if (Number.isFinite(qid) && qid > 0) {
        UserListening.__questionDisplayNumbers.set(qid, startNumber + index);
      }
    });
  };

  return `
    <div class="questions-container">
      ${listeningGrouped.map((item, index) => {
        if (item.type === "MATCHING_GROUP") {
          registerDisplayNumbers(item.questions, currentNumber);
          const block = UserListening.renderMatchingGroup(item, passageIndex, currentNumber, passage);
          currentNumber += item.questions.length;
          return block;
        }

        if (item.type === "LISTENING_TYPED_GROUP") {
          registerDisplayNumbers(item.questions, currentNumber);
          const block = UserListening.renderListeningTypedGroup(item, currentNumber);
          currentNumber += item.questions.length;
          return block;
        }

        if (item.type === "SUMMARY_GROUP") {
          registerDisplayNumbers(item.questions, currentNumber);
          const block = UserListening.renderSummaryGroup(item, currentNumber);
          currentNumber += item.questions.length;
          return block;
        }

        if (item.type === "IMAGE_QUESTIONS_GROUP") {
          registerDisplayNumbers(item.questions, currentNumber);
          const block = UserListening.renderImageQuestionsGroup(item, currentNumber);
          currentNumber += item.questions.length;
          return block;
        }

        registerDisplayNumbers([item], currentNumber);
        const block = UserListening.renderSingleQuestion(item, index, passageIndex, currentNumber, passage);
        currentNumber += 1;
        return block;
      }).join("")}
    </div>
  `;
};

UserListening.renderListeningGroupHeader = function (group, startNumber) {
  const endNumber = startNumber + (group.questions?.length || 1) - 1;
  const label = (group.questions?.length || 0) > 1
    ? `Questions ${startNumber}-${endNumber}`
    : `Question ${startNumber}`;

  return `
    <div class="question-header">
      <div class="question-number">${label}</div>
      ${group.instruction ? `
        <div class="question-instruction">
          ${UserListening.escapeHtml(group.instruction)}
        </div>
      ` : ""}
    </div>
    ${UserListening.renderListeningVisual(group)}
  `;
};

UserListening.getCompletionTemplate = function (group) {
  const first = group.questions?.[0] || {};
  return group.meta?.template_text
    || first.meta?.template_text
    || group.content?.text
    || UserListening.getQuestionText(first)
    || "";
};

UserListening.renderListeningTextInput = function (question, className = "question-input") {
  return `
    <input
      type="text"
      name="q_${question.id}"
      data-qid="${question.id}"
      class="${className}"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    />
  `;
};

UserListening.renderTemplateWithGapInputs = function (template, questions, inputClass = "summary-blank-input") {
  const byGap = new Map();
  (questions || []).forEach((question, index) => {
    const gap = String(question?.meta?.gap || index + 1);
    byGap.set(gap, question);
  });

  let fallbackIndex = 0;
  let html = "";
  let lastIndex = 0;
  let inserted = 0;
  const regex = /\[\[(\d+)\]\]|_{3,}/g;
  let match;

  while ((match = regex.exec(String(template || "")))) {
    html += UserListening.escapeHtml(String(template || "").slice(lastIndex, match.index));
    const question = match[1]
      ? byGap.get(String(match[1]))
      : questions?.[fallbackIndex++];
    if (question) {
      html += UserListening.renderListeningTextInput(question, inputClass);
      inserted += 1;
    }
    lastIndex = regex.lastIndex;
  }

  html += UserListening.escapeHtml(String(template || "").slice(lastIndex));
  if (inserted === 0 && questions?.length === 1) {
    html += ` ${UserListening.renderListeningTextInput(questions[0], inputClass)}`;
  }
  return html;
};

UserListening.renderCompletionAsForm = function (group, startNumber) {
  const template = UserListening.getCompletionTemplate(group);
  const lines = String(template || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const body = lines.length ? lines : [template];

  return `
    <div class="question-block listening-form-completion">
      ${UserListening.renderListeningGroupHeader(group, startNumber)}
      ${group.meta?.title ? `<div class="listening-form-title">${UserListening.escapeHtml(group.meta.title)}</div>` : ""}
      <div class="listening-form-lines">
        ${body.map((line) => {
          const parts = line.split(/:\s*/);
          const hasLabel = parts.length > 1;
          return `
            <div class="listening-form-row">
              ${hasLabel ? `<span class="listening-form-label">${UserListening.escapeHtml(parts.shift())}:</span>` : ""}
              <span class="listening-form-value">
                ${UserListening.renderTemplateWithGapInputs(parts.join(": ") || line, group.questions, "gap-input")}
              </span>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
};

UserListening.renderCompletionAsNotes = function (group, startNumber) {
  const template = UserListening.getCompletionTemplate(group);
  const lines = String(template || "")
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-\u2022]\s*/, ""))
    .filter(Boolean);

  return `
    <div class="question-block listening-note-completion">
      ${UserListening.renderListeningGroupHeader(group, startNumber)}
      <ul class="listening-note-list">
        ${(lines.length ? lines : [template]).map((line) => `
          <li>${UserListening.renderTemplateWithGapInputs(line, group.questions, "gap-input")}</li>
        `).join("")}
      </ul>
    </div>
  `;
};

UserListening.renderSentenceCompletionGroup = function (group, startNumber) {
  return `
    <div class="question-block listening-sentence-completion">
      ${UserListening.renderListeningGroupHeader(group, startNumber)}
      <div class="listening-sentence-list">
        ${(group.questions || []).map((question, index) => `
          <div class="listening-sentence-row">
            <span class="matching-row-number">${startNumber + index}.</span>
            <span>${UserListening.renderTemplateWithGapInputs(UserListening.getQuestionText(question), [question], "summary-blank-input")}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
};

UserListening.renderSummaryCompletionGroup = function (group, startNumber) {
  return `
    <div class="question-block summary-group listening-summary-completion">
      ${UserListening.renderListeningGroupHeader(group, startNumber)}
      <div class="summary-text">
        ${UserListening.renderTemplateWithGapInputs(UserListening.getCompletionTemplate(group), group.questions, "summary-blank-input")}
      </div>
    </div>
  `;
};

UserListening.renderFlowchartCompletionGroup = function (group, startNumber) {
  const steps = String(UserListening.getCompletionTemplate(group) || "")
    .split(/\n+|\u2192|\u2193|->|=>/g)
    .map((step) => step.trim())
    .filter(Boolean);

  return `
    <div class="question-block listening-flowchart-completion">
      ${UserListening.renderListeningGroupHeader(group, startNumber)}
      <div class="listening-flowchart-list">
        ${(steps.length ? steps : [UserListening.getCompletionTemplate(group)]).map((step, index, list) => `
          <div class="listening-flowchart-step">
            ${UserListening.renderTemplateWithGapInputs(step, group.questions, "gap-input")}
          </div>
          ${index < list.length - 1 ? `<div class="listening-flowchart-arrow">&darr;</div>` : ""}
        `).join("")}
      </div>
    </div>
  `;
};

UserListening.renderTableCompletionGroup = function (group, startNumber) {
  const template = String(UserListening.getCompletionTemplate(group) || "");
  const rows = template
    .split(/\n+/)
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));

  if (!rows.length || rows.every((row) => row.length < 2)) {
    return UserListening.renderCompletionAsForm(group, startNumber);
  }

  return `
    <div class="question-block listening-table-completion">
      ${UserListening.renderListeningGroupHeader(group, startNumber)}
      <div class="listening-table-scroll">
        <table class="listening-completion-table">
          <tbody>
            ${rows.map((row, rowIndex) => `
              <tr>
                ${row.map((cell) => `
                  <${rowIndex === 0 ? "th" : "td"}>
                    ${UserListening.renderTemplateWithGapInputs(cell, group.questions, "gap-input")}
                  </${rowIndex === 0 ? "th" : "td"}>
                `).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

UserListening.renderShortAnswerGroup = function (group, startNumber) {
  return `
    <div class="question-block listening-short-answer">
      ${UserListening.renderListeningGroupHeader(group, startNumber)}
      <div class="listening-short-answer-list">
        ${(group.questions || []).map((question, index) => `
          <div class="listening-short-answer-row">
            <div class="question-text">
              ${startNumber + index}. ${UserListening.escapeHtml(UserListening.getQuestionText(question))}
            </div>
            ${UserListening.renderListeningTextInput(question, "question-input")}
          </div>
        `).join("")}
      </div>
    </div>
  `;
};

UserListening.renderLabelingGroup = function (group, startNumber) {
  const mode = group.meta?.answer_mode || "text";
  const options = UserListening.getQuestionOptions(group.questions?.[0] || {}, group);

  return `
    <div class="question-block image-questions-group listening-labeling-group">
      ${UserListening.renderListeningGroupHeader(group, startNumber)}
      <div class="image-questions-list">
        ${(group.questions || []).map((question, index) => {
          const number = startNumber + index;
          return `
            <div class="image-questions-row">
              <div class="image-questions-label">${number}.</div>
              <div class="image-questions-text">
                ${UserListening.escapeHtml(UserListening.getQuestionText(question) || `Label ${index + 1}`)}
              </div>
              ${mode === "dropdown" && options.length
                ? UserListening.renderMatchingSelect(question.id, options)
                : UserListening.renderListeningTextInput(question, "image-inline-gap-input")}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
};

UserListening.renderListeningTypedGroup = function (group, startNumber) {
  const type = UserListening.normalizeListeningQuestionType(group.question_type);
  if (type === "FORM_COMPLETION") return UserListening.renderCompletionAsForm(group, startNumber);
  if (type === "NOTE_COMPLETION") return UserListening.renderCompletionAsNotes(group, startNumber);
  if (type === "SENTENCE_COMPLETION") return UserListening.renderSentenceCompletionGroup(group, startNumber);
  if (type === "SUMMARY_COMPLETION") return UserListening.renderSummaryCompletionGroup(group, startNumber);
  if (type === "FLOWCHART_COMPLETION") return UserListening.renderFlowchartCompletionGroup(group, startNumber);
  if (type === "TABLE_COMPLETION") return UserListening.renderTableCompletionGroup(group, startNumber);
  if (type === "SHORT_ANSWER") return UserListening.renderShortAnswerGroup(group, startNumber);
  if (UserListening.isListeningLabelType(type)) return UserListening.renderLabelingGroup(group, startNumber);
  return UserListening.renderShortAnswerGroup(group, startNumber);
};

UserListening.renderSingleQuestion = function (q, questionIndex, passageIndex, displayOrder = null, passage = null) {
  const type = UserListening.normalizeListeningQuestionType(q.type || "");

  const base = {
    id: q.id,
    passageIndex,
    questionIndex,
    order: displayOrder || q.order_index || questionIndex + 1,
    instruction: q.instruction,
    meta: q.meta || {},
    content: q.content || {},
    image_url: q.image_url || "",
  };

  let inner = "";

  switch (type) {
    case "SINGLE_CHOICE":
      inner = UserListening.renderSingleChoice(q, base);
      break;

    case "MULTI_CHOICE":
    case "MULTIPLE_CHOICE":
      inner = UserListening.renderMultiChoice(q, base);
      break;

    case "FORM_COMPLETION":
    case "NOTE_COMPLETION":
    case "SENTENCE_COMPLETION":
    case "SUMMARY_COMPLETION":
    case "FLOWCHART_COMPLETION":
    case "TABLE_COMPLETION":
    case "SHORT_ANSWER":
    case "MAP_LABEL":
    case "PLAN_LABEL":
    case "DIAGRAM_LABEL":
    case "MAP_LABELING":
    case "DIAGRAM_LABELING":
      return UserListening.renderListeningTypedGroup({
        type: "LISTENING_TYPED_GROUP",
        question_type: type,
        group_id: q.question_group_id || q.id,
        questions: [q],
        meta: q.meta || {},
        content: q.content || {},
        image_url: q.image_url || "",
        instruction: q.instruction || ""
      }, base.order);

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
          content: q.content || {},
          image_url: q.image_url || ""
        }, base.order);
      } else if (UserListening.isImageQuestionsQuestion && UserListening.isImageQuestionsQuestion(q)) {
        inner = UserListening.renderImageQuestionsGroup({
          type: "IMAGE_QUESTIONS_GROUP",
          group_id: q.question_group_id || q.id,
          questions: [q],
          image_url: q.image_url || ""
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
        meta: q.meta || {},
        image_url: q.image_url || ""
      }, passageIndex, base.order, passage);
      break;

    default:
      inner = UserListening.renderTextInput(q, base);
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

      ${UserListening.renderListeningVisual(base)}

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
  const text = UserListening.getQuestionText(q);
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
  const options = UserListening.getQuestionOptions(q);

  return `
    <div class="question-text">
      ${UserListening.escapeHtml(UserListening.getQuestionText(q))}
    </div>

    ${options.map((opt, i) => {
      const key = opt.key || String.fromCharCode(65 + i);

      return `
        <label class="option">
          <input type="radio" name="q_${q.id}" data-qid="${q.id}" value="${UserListening.escapeHtml(key)}" />
          ${UserListening.escapeHtml(key)}. ${UserListening.escapeHtml(opt.text)}
        </label>
      `;
    }).join("")}
  `;
};

UserListening.renderMultiChoice = function (q, base) {
  const options = UserListening.getQuestionOptions(q);

  return `
    <div class="question-text">
      ${UserListening.escapeHtml(UserListening.getQuestionText(q))}
    </div>

    ${options.map((opt) => `
      <label class="option">
        <input type="checkbox" name="q_${q.id}" data-qid="${q.id}" value="${UserListening.escapeHtml(opt.key)}">
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
