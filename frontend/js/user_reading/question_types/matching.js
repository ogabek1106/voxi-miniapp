// frontend/js/user_reading/question_types/matching.js
window.UserReading = window.UserReading || {};

UserReading.isMatchingType = function (type) {
  const normalizedType = String(type || "").toUpperCase();
  return normalizedType === "MATCHING" || normalizedType === "PARAGRAPH_MATCHING";
};

UserReading.groupMatchingQuestions = function (questions) {
  const result = [];

  questions.forEach((q) => {
    if (UserReading.isMatchingType(q.type) && q.question_group_id) {
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

UserReading.buildParagraphMatchingLetters = function (group, passage) {
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

UserReading.renderMatchingGroup = function (group, passageIndex, startNumber, passage = null) {
  const isParagraphMatching = group.question_type === "PARAGRAPH_MATCHING";
  const options = isParagraphMatching
    ? UserReading.buildParagraphMatchingLetters(group, passage)
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
                <strong>${letter}</strong>. ${UserReading.escapeHtml(opt)}
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
                <span class="matching-row-number">${number}.</span>
                ${UserReading.escapeHtml(q.content?.text || "")}
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
