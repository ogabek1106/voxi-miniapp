// frontend/js/admin_reading/question_types/gap/ui.js

window.AdminReading = window.AdminReading || {};

AdminReading.registerQuestionType("gap", function(container, data = null) {

  const block = container.closest(".question-block");

  container.innerHTML = `
    <div class="gap-editor">

      <label>Question text</label>
      <textarea class="gap-text"
        rows="3"
        placeholder="Cap of Uz _____ and it's _____ years old."
        style="
          width:100%;
          box-sizing:border-box;
          padding:10px;
          border-radius:8px;
          border:1px solid #e5e5ea;
        "
      ></textarea>

      <div class="gap-answers-wrap" style="margin-top:12px;">
        <strong>Answers</strong>
      </div>

      <div style="margin-top:12px;">
        <button type="button" class="gap-add-blank">➕ Add Blank</button>
        <button type="button" class="gap-remove-blank">➖ Remove Last Blank</button>
      </div>

    </div>
  `;

  const answersWrap = container.querySelector(".gap-answers-wrap");
  const addBtn = container.querySelector(".gap-add-blank");
  const removeBtn = container.querySelector(".gap-remove-blank");

  createGapAnswerBlock(answersWrap);

  addBtn.onclick = () => createGapAnswerBlock(answersWrap);

  removeBtn.onclick = () => {
    const blocks = answersWrap.querySelectorAll(".gap-answer-block");
    if (blocks.length <= 1) return;

    blocks[blocks.length - 1].remove();
    updateGapLabels(answersWrap);
  };

});


// 🔹 Create blank block
function createGapAnswerBlock(wrap) {

  const index = wrap.querySelectorAll(".gap-answer-block").length + 1;

  const block = document.createElement("div");
  block.className = "gap-answer-block";
  block.style.marginTop = "10px";

  block.innerHTML = `
    <div style="font-weight:600; margin-bottom:6px;">
      Blank #${index}
    </div>

    <div class="gap-options"></div>

    <button type="button" class="gap-add-option" style="margin-top:6px;">
      ➕ Add variant
    </button>
  `;

  const optionsWrap = block.querySelector(".gap-options");
  const addOptBtn = block.querySelector(".gap-add-option");

  addGapOption(optionsWrap);

  addOptBtn.onclick = () => addGapOption(optionsWrap);

  wrap.appendChild(block);
}


// 🔹 Add answer input
function addGapOption(wrap) {

  const row = document.createElement("div");
  row.className = "gap-option";
  row.style.display = "flex";
  row.style.gap = "6px";
  row.style.marginTop = "4px";

  row.innerHTML = `
    <input
      class="gap-answer-input"
      placeholder="Correct answer"
      style="
        flex:1;
        padding:8px;
        border-radius:6px;
        border:1px solid #e5e5ea;
      "
    />

    <button type="button" class="gap-remove-option">
      ✖
    </button>
  `;

  row.querySelector(".gap-remove-option").onclick = () => {
    row.remove();
  };

  wrap.appendChild(row);
}


// 🔹 Update numbering after remove
function updateGapLabels(wrap) {
  wrap.querySelectorAll(".gap-answer-block").forEach((b, i) => {
    const label = b.querySelector("div");
    label.textContent = "Blank #" + (i + 1);
  });
}
