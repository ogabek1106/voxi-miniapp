// frontend/js/admin_reading/question_types/gap/ui.js

window.AdminReading = window.AdminReading || {};

// GAP UI loader
AdminReading.registerQuestionType("gap", function(container, data = null) {

  const block = container.closest(".question-block");
  const qNum = block?.dataset.globalQ || "?";

  container.innerHTML = `
    <div class="gap-editor">

      <label>Sentence with blanks</label>
      <textarea class="gap-text" rows="3"
        placeholder="Example: Cap of Uz _____ and it's _____ years old."
        style="width:100%; padding:8px; border-radius:6px;"></textarea>

      <div class="gap-answers-wrap" style="margin-top:10px;">
        <h5>Answers</h5>
      </div>

      <div style="margin-top:8px;">
        <button type="button" class="gap-add-blank">➕ Add Blank</button>
        <button type="button" class="gap-remove-blank">➖ Remove Last Blank</button>
      </div>

    </div>
  `;

  const answersWrap = container.querySelector(".gap-answers-wrap");
  const addBtn = container.querySelector(".gap-add-blank");
  const removeBtn = container.querySelector(".gap-remove-blank");

  // default blank
  createGapAnswerBlock(answersWrap);

  addBtn.addEventListener("click", () => {
    createGapAnswerBlock(answersWrap);
  });

  removeBtn.addEventListener("click", () => {

    const blocks = answersWrap.querySelectorAll(".gap-answer-block");
    if (blocks.length <= 1) return;

    blocks[blocks.length - 1].remove();
    updateGapLabels(answersWrap);

  });

});


// create answer block
function createGapAnswerBlock(wrap) {

  const index = wrap.querySelectorAll(".gap-answer-block").length + 1;

  const block = document.createElement("div");
  block.className = "gap-answer-block";
  block.style.marginBottom = "8px";

  block.innerHTML = `
    <div class="gap-label" style="font-weight:600;">Blank #${index}</div>

    <div class="gap-options"></div>

    <button type="button" class="gap-add-option">➕ Add variant</button>
  `;

  const optionsWrap = block.querySelector(".gap-options");
  const addOptBtn = block.querySelector(".gap-add-option");

  addGapOption(optionsWrap);

  addOptBtn.addEventListener("click", () => {
    addGapOption(optionsWrap);
  });

  wrap.appendChild(block);

}


// add answer option
function addGapOption(wrap) {

  const row = document.createElement("div");
  row.className = "gap-option";
  row.style.display = "flex";
  row.style.gap = "6px";
  row.style.marginTop = "4px";

  row.innerHTML = `
    <input class="gap-answer-input" placeholder="Correct answer" style="flex:1;" />
    <button type="button" class="gap-remove-option">✖</button>
  `;

  row.querySelector(".gap-remove-option").addEventListener("click", () => {
    row.remove();
  });

  wrap.appendChild(row);

}


// update labels when removing
function updateGapLabels(wrap) {

  wrap.querySelectorAll(".gap-answer-block").forEach((b, i) => {
    const label = b.querySelector(".gap-label");
    if (label) label.textContent = "Blank #" + (i + 1);
  });

}
