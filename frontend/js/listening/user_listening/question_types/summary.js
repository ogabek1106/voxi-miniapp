// frontend/js/user_reading/question_types/summary.js
window.UserListening = window.UserListening || {};

UserListening.isSummaryQuestion = function (question) {
  return String(question?.type || "").toUpperCase() === "TEXT_INPUT"
    && question?.meta?.mode === "summary";
};

UserListening.groupSummaryQuestions = function (items) {
  const result = [];

  items.forEach((item) => {
    if (UserListening.isSummaryQuestion(item) && item.question_group_id) {
      let group = result.find(
        (entry) => entry.type === "SUMMARY_GROUP" && entry.group_id === item.question_group_id
      );

      if (!group) {
        group = {
          type: "SUMMARY_GROUP",
          group_id: item.question_group_id,
          questions: [],
          meta: item.meta || {},
          content: item.content || {}
        };
        result.push(group);
      }

      group.questions.push(item);
    } else {
      result.push(item);
    }
  });

  result.forEach((item) => {
    if (item.type === "SUMMARY_GROUP") {
      item.questions.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
  });

  return result;
};

UserListening.renderSummaryBlankControl = function (question, number, wordBank) {
  if (Array.isArray(wordBank) && wordBank.length > 0) {
    return `
      <span class="summary-inline-blank">
        <span class="summary-blank-label">${number}</span>
        <select name="q_${question.id}" class="summary-blank-select">
          <option value="">Choose</option>
          ${wordBank.map((word) => `
            <option value="${UserListening.escapeHtml(word)}">
              ${UserListening.escapeHtml(word)}
            </option>
          `).join("")}
        </select>
      </span>
    `;
  }

  return `
    <span class="summary-inline-blank">
      <span class="summary-blank-label">${number}</span>
      <input
        type="text"
        name="q_${question.id}"
        data-qid="${question.id}"
        class="summary-blank-input"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </span>
  `;
};

UserListening.renderSummaryGroup = function (group, startNumber) {
  const text = group.content?.text || group.questions?.[0]?.content?.text || "";
  const instruction = group.questions?.[0]?.instruction || "";
  const wordLimit = group.meta?.word_limit || group.questions?.[0]?.meta?.word_limit;
  const wordBank = group.meta?.word_bank || group.questions?.[0]?.meta?.word_bank || [];
  const endNumber = startNumber + group.questions.length - 1;
  const headerLabel = group.questions.length > 1
    ? `Questions ${startNumber}-${endNumber}`
    : `Question ${startNumber}`;
  const parts = String(text).split(/_{3,}/g);
  const blankCount = Math.max(parts.length - 1, 0);

  let blanksUsed = 0;
  let summaryHtml = "";

  parts.forEach((part, index) => {
    summaryHtml += `<span>${UserListening.escapeHtml(part)}</span>`;

    if (index < blankCount && group.questions[blanksUsed]) {
      summaryHtml += UserListening.renderSummaryBlankControl(
        group.questions[blanksUsed],
        startNumber + blanksUsed,
        wordBank
      );
      blanksUsed += 1;
    }
  });

  const remaining = group.questions.slice(blanksUsed);

  return `
    <div class="question-block summary-group">
      <div class="question-header">
        <div class="question-number">${headerLabel}</div>
        ${instruction ? `
          <div class="question-instruction">
            ${UserListening.escapeHtml(instruction)}
          </div>
        ` : ""}
      </div>

      ${wordLimit ? `
        <div class="summary-word-limit">
          No more than ${wordLimit} word${wordLimit > 1 ? "s" : ""}
        </div>
      ` : ""}

      ${wordBank.length ? `
        <div class="summary-word-bank">
          <div class="summary-word-bank-label">Word bank</div>
          <div class="summary-word-bank-items">
            ${wordBank.map((word) => `
              <span class="summary-word-bank-item">${UserListening.escapeHtml(word)}</span>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <div class="summary-text">
        ${summaryHtml}
      </div>

      ${remaining.length ? `
        <div class="summary-extra-blanks">
          ${remaining.map((question, index) =>
            UserListening.renderSummaryBlankControl(
              question,
              startNumber + blanksUsed + index,
              wordBank
            )
          ).join("")}
        </div>
      ` : ""}
    </div>
  `;
};
