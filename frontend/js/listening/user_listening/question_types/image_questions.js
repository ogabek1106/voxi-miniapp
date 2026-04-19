// frontend/js/user_reading/question_types/image_questions.js
window.UserListening = window.UserListening || {};

UserListening.isImageQuestionsQuestion = function (question) {
  return String(question?.type || "").toUpperCase() === "TEXT_INPUT"
    && question?.meta?.mode === "image_questions";
};

UserListening.groupImageQuestions = function (items) {
  const result = [];

  items.forEach((item) => {
    if (UserListening.isImageQuestionsQuestion(item) && item.question_group_id) {
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

UserListening.renderImageQuestionsGroup = function (group, startNumber) {
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
            ${UserListening.escapeHtml(instruction)}
          </div>
        ` : ""}
      </div>

      ${imageUrl ? `
        <div class="image-questions-image-wrap">
          <img
            src="${window.API}${imageUrl}"
            class="image-questions-image"
            alt="Question image"
            data-full-image-src="${window.API}${imageUrl}"
            onclick="UserListening.openImageQuestionsViewer(this.getAttribute('data-full-image-src'))"
          />
        </div>
      ` : ""}

      <div class="image-questions-list">
        ${group.questions.map((q, i) => {
          const number = startNumber + i;
          return `
            <div class="image-questions-row">
              <div class="image-questions-label">${number}.</div>
              <div class="image-questions-text">
                ${UserListening.renderImageQuestionInlineGap(q)}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
};

UserListening.renderImageQuestionInlineGap = function (question) {
  const rawText = String(question?.content?.text || "");
  const parts = rawText.split(/_{3,}/g);
  const blanksCount = parts.length - 1;
  let html = "";

  parts.forEach((part, index) => {
    html += `<span>${UserListening.escapeHtml(part)}</span>`;
    if (index < blanksCount) {
      html += UserListening.renderImageQuestionInlineInput(question, index);
    }
  });

  if (blanksCount <= 0) {
    html += ` ${UserListening.renderImageQuestionInlineInput(question, 0)}`;
  }

  return html;
};

UserListening.renderImageQuestionInlineInput = function (question, blankIndex) {
  return `
    <input
      type="text"
      name="q_${question.id}_${blankIndex}"
      data-qid="${question.id}"
      data-blank-index="${blankIndex}"
      class="image-inline-gap-input"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    />
  `;
};

UserListening.ensureImageQuestionsViewer = function () {
  if (document.getElementById("image-questions-viewer")) return;

  const viewer = document.createElement("div");
  viewer.id = "image-questions-viewer";
  viewer.className = "image-questions-viewer";
  viewer.innerHTML = `
    <div class="image-questions-viewer-backdrop" onclick="UserListening.closeImageQuestionsViewer()"></div>
    <div class="image-questions-viewer-content">
      <button type="button" class="image-questions-viewer-close" onclick="UserListening.closeImageQuestionsViewer()">✕</button>
      <div class="image-questions-viewer-scroll">
        <img id="image-questions-viewer-img" class="image-questions-viewer-img" alt="Question image zoom view" />
      </div>
    </div>
  `;
  document.body.appendChild(viewer);

  const img = viewer.querySelector("#image-questions-viewer-img");
  if (img) {
    img.addEventListener("click", () => {
      img.classList.toggle("zoomed");
    });
  }
};

UserListening.openImageQuestionsViewer = function (src) {
  if (!src) return;
  UserListening.ensureImageQuestionsViewer();

  const viewer = document.getElementById("image-questions-viewer");
  const img = document.getElementById("image-questions-viewer-img");
  if (!viewer || !img) return;

  img.src = src;
  img.classList.remove("zoomed");
  viewer.classList.add("open");
  document.body.style.overflow = "hidden";
};

UserListening.closeImageQuestionsViewer = function () {
  const viewer = document.getElementById("image-questions-viewer");
  const img = document.getElementById("image-questions-viewer-img");
  if (!viewer || !img) return;

  viewer.classList.remove("open");
  img.classList.remove("zoomed");
  document.body.style.overflow = "";
};
