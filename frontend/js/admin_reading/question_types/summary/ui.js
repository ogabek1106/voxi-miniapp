// frontend/js/admin_reading/question_types/summary/ui.js

window.AdminReading = window.AdminReading || {};

AdminReading.registerQuestionType("summary", function(container, data = null) {

  container.innerHTML = `
    <div class="summary-editor">

      <label>Summary text</label>
      <textarea class="summary-text"
        rows="4"
        placeholder="The capital of Uzbekistan is ______ and it is located in ______."
        style="
          width:100%;
          box-sizing:border-box;
          padding:10px;
          border-radius:8px;
          border:1px solid #e5e5ea;
        "
      ></textarea>

      <label style="margin-top:10px;">Word limit</label>
      <input type="number" class="summary-word-limit"
        placeholder="e.g. 2"
        style="
          width:100%;
          padding:10px;
          border-radius:8px;
          border:1px solid #e5e5ea;
        "
      />

      <label style="margin-top:10px;">Word bank (optional)</label>
      <textarea class="summary-word-bank"
  rows="1"
  placeholder="Comma separated: Tashkent, Samarkand, Bukhara"
  style="
    width:100%;
    padding:10px;
    border-radius:8px;
    border:1px solid #e5e5ea;
    resize: vertical;
    min-height: 42px;
    max-height: 80px;
    overflow-y: auto;
    box-sizing: border-box;
  "
></textarea>

      <div class="summary-answers-wrap" style="margin-top:12px;">
        <strong>Answers</strong>
      </div>

      <div style="margin-top:12px;">
        <button type="button" class="summary-add-blank">➕ Add Blank</button>
        <button type="button" class="summary-remove-blank">➖ Remove Last Blank</button>
      </div>

    </div>
  `;

  const answersWrap = container.querySelector(".summary-answers-wrap");
  const addBtn = container.querySelector(".summary-add-blank");
  const removeBtn = container.querySelector(".summary-remove-blank");

  function refreshBlankCount() {
    const blocks = answersWrap.querySelectorAll(".summary-answer-block");
    const questionBlock = container.closest(".question-block");
    const count = Math.max(blocks.length, 1);
    const baseQ = parseInt(questionBlock?.dataset?.globalQ || "1", 10);

    blocks.forEach((block, i) => {
      const label = block.querySelector(".summary-blank-label");
      if (label) label.textContent = `Blank #${i + 1}`;
    });

    if (questionBlock) {
      questionBlock.dataset.generatedQuestions = count;

      const next = baseQ + count - 1;
      if (next > window.__globalQuestionCounter) {
        window.__globalQuestionCounter = next;
      }
    }
  }

  function createBlock() {
    const index = answersWrap.querySelectorAll(".summary-answer-block").length + 1;

    const block = document.createElement("div");
    block.className = "summary-answer-block";
    block.style.marginTop = "10px";

    block.innerHTML = `
      <div class="summary-blank-label" style="font-weight:600; margin-bottom:6px;">
        Blank #${index}
      </div>

      <input
        class="summary-answer-input"
        placeholder="Correct answer"
        style="
          width:100%;
          padding:10px;
          border-radius:8px;
          border:1px solid #e5e5ea;
        "
      />
    `;

    answersWrap.appendChild(block);
    refreshBlankCount();
  }

  addBtn.onclick = () => createBlock();

  removeBtn.onclick = () => {
    const blocks = answersWrap.querySelectorAll(".summary-answer-block");
    if (blocks.length <= 1) return;
    blocks[blocks.length - 1].remove();
    refreshBlankCount();
  };

  // default
  createBlock();

  // restore
  if (data && Array.isArray(data) && data.length > 0) {
    const first = data[0];

    container.querySelector(".summary-text").value = first.content?.text || "";
    container.querySelector(".summary-word-limit").value = first.meta?.word_limit || "";

    if (first.meta?.word_bank) {
      container.querySelector(".summary-word-bank").value =
        first.meta.word_bank.join(", ");
    }

    answersWrap.innerHTML = "<strong>Answers</strong>";

    data.forEach(q => {
      createBlock();
      const inputs = answersWrap.querySelectorAll(".summary-answer-input");
      inputs[inputs.length - 1].value = q.correct_answer?.value || "";
    });

    refreshBlankCount();
  }

});
