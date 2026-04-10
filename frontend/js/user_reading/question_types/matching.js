// frontend/js/user_reading/question_types/matching.js
window.UserReading = window.UserReading || {};

/**
 * GROUP MATCHING QUESTIONS by question_group_id
 */
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

  return result;
};


/**
 * RENDER MATCHING GROUP (MAIN BLOCK)
 */
UserReading.renderMatchingGroup = function (group, passageIndex) {
  const options = group.meta?.options || [];

  return `
    <div class="question-block matching-group">

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
        ${group.questions.map((q) => {
          return `
            <div class="matching-row">

              <div class="matching-text">
                ${q.order_index}. ${UserReading.escapeHtml(q.content?.text || "")}
              </div>

              ${UserReading.renderMatchingSelect(q.id, options)}

            </div>
          `;
        }).join("")}
      </div>

    </div>
  `;
};


/**
 * SINGLE SELECT (per row)
 */
UserReading.renderMatchingSelect = function (questionId, options) {
  return `
    <select name="q_${questionId}" class="matching-select">
      <option value="">Choose</option>

      ${options.map((opt, index) => {
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
