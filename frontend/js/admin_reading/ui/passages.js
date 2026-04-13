// frontend/js/admin_reading/ui/passages.js
window.AdminReading = window.AdminReading || {};

window.getInstructionTypeForEditor = function (uiType) {
  const map = {
    matching: "MATCHING",
    paragraph_matching: "PARAGRAPH_MATCHING",
    single_choice: "SINGLE_CHOICE",
    multiple_choice: "MULTI_CHOICE",
    yes_no_ng: "YES_NO_NG",
    tf_ng: "TFNG",
    gap: "TEXT_INPUT",
    summary: "TEXT_INPUT",
    image_questions: "IMAGE_QUESTIONS"
  };

  return map[String(uiType || "").trim()] || "TEXT_INPUT";
};

window.getGeneratedCountForQuestionBlock = function (block) {
  if (!block) return 1;

  const type = String(block.querySelector(".q-type-select")?.value || block.dataset.type || "").trim();

  if (type === "matching") {
    return Math.max(block.querySelectorAll(".match-question").length, 1);
  }
  if (type === "paragraph_matching") {
    return Math.max(block.querySelectorAll(".paragraph-match-row").length, 1);
  }
  if (type === "summary") {
    return Math.max(block.querySelectorAll(".summary-answer-block").length, 1);
  }
  if (type === "image_questions") {
    return Math.max(block.querySelectorAll(".image-questions-row").length, 1);
  }
  if (type === "gap") {
    return Math.max(block.querySelectorAll(".gap-answer-block").length, 1);
  }
  return 1;
};

window.recalculateQuestionNumbers = function () {
  const blocks = Array.from(document.querySelectorAll(".question-block"));
  let current = 1;

  blocks.forEach((block) => {
    const generated = getGeneratedCountForQuestionBlock(block);
    block.dataset.globalQ = String(current);
    block.dataset.generatedQuestions = String(generated);

    const header = block.querySelector(".q-header");
    if (header) {
      header.textContent = `Q${current}`;
    }

    const type = String(block.querySelector(".q-type-select")?.value || block.dataset.type || "").trim();

    if (type === "matching") {
      block.querySelectorAll(".match-q-label").forEach((label, index) => {
        label.textContent = `Q${current + index}`;
      });
    }

    if (type === "paragraph_matching") {
      block.querySelectorAll(".paragraph-match-q-label").forEach((label, index) => {
        label.textContent = `Q${current + index}`;
      });
    }

    if (type === "summary") {
      block.querySelectorAll(".summary-blank-label").forEach((label, index) => {
        label.textContent = `Q${current + index} Blank #${index + 1}`;
      });
    }

    if (type === "image_questions") {
      block.querySelectorAll(".image-question-label").forEach((label, index) => {
        label.textContent = `Q${current + index}`;
      });
    }

    current += generated;
  });

  window.__globalQuestionCounter = Math.max(current - 1, 0);
  return window.__globalQuestionCounter;
};

window.getNextQuestionNumber = function () {
  const last = recalculateQuestionNumbers();
  return (last || 0) + 1;
};

window.renderAdminQuestionBlock = function (qNum) {
  return `
    <div class="question-block"
         data-type=""
         data-global-q="${qNum}"
         data-question-id="temp_${qNum}"
         style="border:1px solid #e5e5ea; border-radius:8px; padding:8px; margin-bottom:8px;">

      <div class="q-fixed-layer" style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div class="q-header" style="font-weight:700;">Q${qNum}</div>

          <button
            type="button"
            class="delete-question-btn"
            style="
              width:28px;
              height:28px;
              border-radius:50%;
              background:#fee2e2;
              color:#b91c1c;
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:14px;
              cursor:pointer;
            "
          >
            ✖
          </button>
        </div>

        <div style="margin-bottom:6px;">
          <label>Question type</label>
          <select class="q-type-select" style="width:100%; height:36px;">
            <option value="matching" selected>Matching</option>
            <option value="paragraph_matching">Paragraph Matching</option>
            <option value="single_choice">Single Choice</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="gap">Gap Filling</option>
            <option value="yes_no_ng">Yes / No / Not Given</option>
            <option value="tf_ng">True / False / Not Given</option>
            <option value="summary">Summary Completion</option>
            <option value="image_questions">Questions with Image</option>
          </select>
        </div>

        <div style="margin-top:6px;">
          <label>Instruction</label>
          <select class="q-instruction-select" style="width:100%; height:36px;">
            <option value="">Select instruction</option>
          </select>
        </div>
      </div>

      <div class="q-dynamic-layer">
        <div class="q-meta-wrap">
          <div class="q-type-root"></div>
        </div>
      </div>
    </div>
  `;
};

window.wireAdminQuestionBlock = function (block, initialType = "matching") {
  if (!block) return;

  const root = block.querySelector(".q-type-root");
  const select = block.querySelector(".q-type-select");
  const instructionSelect = block.querySelector(".q-instruction-select");
  const header = block.querySelector(".q-header");

  if (!root || !select || !instructionSelect) return;

  select.value = initialType;
  block.dataset.type = initialType;

  if (window.ReadingInstructions?.fillSelect) {
    window.ReadingInstructions.fillSelect(
      instructionSelect,
      getInstructionTypeForEditor(initialType)
    );
  }

  if (header) {
    header.style.opacity = initialType === "matching" ? "0.3" : "1";
  }

  AdminReading.loadQuestionUI(initialType, root);

  select.addEventListener("change", () => {
    const nextType = select.value;
    block.dataset.type = nextType;

    if (window.ReadingInstructions?.fillSelect) {
      window.ReadingInstructions.fillSelect(
        instructionSelect,
        getInstructionTypeForEditor(nextType)
      );
    }

    if (header) {
      header.style.opacity = nextType === "matching" ? "0.3" : "1";
    }

    root.innerHTML = "";
    AdminReading.loadQuestionUI(nextType, root);
    recalculateQuestionNumbers();
  });
};

window.addPassage = function () {
  const wrap = document.getElementById("passages-wrap");
  if (!wrap) return;

  const nextIndex = wrap.querySelectorAll(".passage-block").length + 1;
  const qNum = getNextQuestionNumber();

  const block = document.createElement("div");
  block.className = "passage-block";
  block.dataset.index = nextIndex;
  block.style.textAlign = "left";
  block.style.marginTop = "16px";

  block.innerHTML = `
    <h4>Passage ${nextIndex}</h4>

    <label>Passage title</label>
    <input class="passage-title" placeholder="Optional title" />

    <label style="margin-top:8px; display:block;">Passage text</label>
    <textarea class="passage-text" rows="6" style="width:100%; padding:10px; border-radius:8px;"></textarea>
    <hr style="margin:10px 0; border:0; border-top:1px solid #eee;" />

    <div class="questions-wrap" style="margin-top:12px;">
      <h5>Questions</h5>
      ${renderAdminQuestionBlock(qNum)}
      <button onclick="addQuestion(this)">➕ Add Question</button>
    </div>
  `;

  wrap.appendChild(block);
  wireAdminQuestionBlock(block.querySelector(".question-block"), "matching");
};

window.addQuestion = function (btn) {
  const questionsWrap = btn.closest(".questions-wrap");
  if (!questionsWrap) return;

  const qNum = getNextQuestionNumber();
  const holder = document.createElement("div");
  holder.innerHTML = renderAdminQuestionBlock(qNum);
  const block = holder.firstElementChild;
  questionsWrap.insertBefore(block, btn);
  wireAdminQuestionBlock(block, "matching");
  recalculateQuestionNumbers();
};

document.addEventListener("click", function (event) {
  const btn = event.target.closest(".delete-question-btn");
  if (!btn) return;

  const block = btn.closest(".question-block");
  if (!block) return;
  block.remove();

  recalculateQuestionNumbers();
});
