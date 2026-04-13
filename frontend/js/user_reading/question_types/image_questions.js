// frontend/js/user_reading/question_types/image_questions.js
window.UserReading = window.UserReading || {};

UserReading.isImageQuestionsQuestion = function (question) {
  return String(question?.type || "").toUpperCase() === "TEXT_INPUT"
    && question?.meta?.mode === "image_questions";
};

UserReading.groupImageQuestions = function (items) {
  const result = [];

  items.forEach((item) => {
    if (UserReading.isImageQuestionsQuestion(item) && item.question_group_id) {
      let group = result.find(
        (entry) => entry.type === "IMAGE_QUESTIONS_GROUP" && entry.group_id === item.question_group_id
      );

      if (!group) {
        group = {
          type: "IMAGE_QUESTIONS_GROUP",
          group_id: item.question_group_id,
          questions: []
        };
        result.push(group);
      }

      group.questions.push(item);
    } else {
      result.push(item);
    }
  });

  result.forEach((item) => {
    if (item.type === "IMAGE_QUESTIONS_GROUP") {
      item.questions.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
  });

  return result;
};

UserReading.renderImageQuestionsGroup = function (group, startNumber) {
  const first = group.questions?.[0] || {};
  const instruction = first.instruction || "";
  const imageUrl = first.image_url || "";
  const endNumber = startNumber + group.questions.length - 1;
  const headerLabel = group.questions.length > 1
    ? `Questions ${startNumber}-${endNumber}`
    : `Question ${startNumber}`;

  return `
    <div class="question-block image-questions-group">
      <div class="question-header">
        <div class="question-number">${headerLabel}</div>
        ${instruction ? `
          <div class="question-instruction">
            ${UserReading.escapeHtml(instruction)}
          </div>
        ` : ""}
      </div>

      ${imageUrl ? `
        <div class="image-questions-image-wrap">
          <img src="${window.API}${imageUrl}" class="image-questions-image" alt="Question image" />
        </div>
      ` : ""}

      <div class="image-questions-list">
        ${group.questions.map((q, i) => {
          const number = startNumber + i;
          return `
            <div class="image-questions-row">
              <div class="image-questions-label">${number}.</div>
              <div class="image-questions-text">${UserReading.escapeHtml(q.content?.text || "")}</div>
              <input
                type="text"
                name="q_${q.id}"
                data-qid="${q.id}"
                class="image-questions-input"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
              />
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
};
