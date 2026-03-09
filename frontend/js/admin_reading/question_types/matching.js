// frontend/js/admin_reading/question_types/matching.js
window.AdminReading = window.AdminReading || {};
window.generateMatching = function(input) {
  console.log("generateMatching called", input);
  if (!input) return;

  const meta = input.closest(".q-meta-wrap");
  if (!meta) {
    console.error("q-meta-wrap not found");
    return;
  }

  const wrap = meta.querySelector(".matching-editor");
  if (!wrap) {
    console.error("matching-editor not found");
    return;
  }

  const qCount = parseInt(meta.querySelector(".match-q-count")?.value || 0);
  let oCount = parseInt(meta.querySelector(".match-opt-count")?.value || 0);
  if (oCount < 2) oCount = 2;

  const block = meta.closest(".question-block");
  if (oCount < 2) oCount = 2;
  if (!wrap) return;

  let html = "";

  // OPTIONS
  html += `<div style="margin-bottom:10px;"><strong>Options</strong></div>`;

  for (let i = 0; i < oCount; i++) {
    const letter = String.fromCharCode(65 + i);

    html += `
      <div style="display:flex; gap:8px; margin-bottom:6px;">
        <div style="
          width:34px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:700;
          background:#f8f8f8;
          border:1px solid #ddd;
          border-radius:6px;
        ">
          ${letter}
        </div>

        <input class="match-option"
               data-letter="${letter}"
               placeholder="Option ${letter}"
               style="flex:1; padding:6px; border-radius:6px; border:1px solid #ddd;" />
      </div>
    `;
  }

  html += `<div style="margin-top:12px;"><strong>Questions</strong></div>`;

  for (let i = 0; i < qCount; i++) {

    const qNum = (parseInt(block.dataset.globalQ) || 0) + i;

    html += `
      <div style="display:flex; gap:8px; margin-bottom:6px;">

        <div style="
          width:40px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:700;
        ">
          Q${qNum}
        </div>

        <input class="match-question"
               placeholder="Question text"
               style="flex:1; padding:6px; border-radius:6px; border:1px solid #ddd;" />

        <select class="match-answer"
                style="width:60px; border-radius:6px;">
          ${Array.from({length:oCount},(_,k)=>`<option value="${String.fromCharCode(65+k)}">${String.fromCharCode(65+k)}</option>`).join("")}
        </select>

      </div>
    `;
  }

  wrap.innerHTML = html;

  // ensure answers stay valid
  wrap.querySelectorAll(".match-answer").forEach(sel => {
    const max = oCount - 1;
    if (sel.selectedIndex > max) {
      sel.selectedIndex = 0;
    }
  });
};

window.handleQuestionTypeChange = function(selectEl) {
  console.log("handleQuestionTypeChange()", selectEl.value);
  const block = selectEl.closest(".question-block");
  const wrap = block.querySelector(".q-meta-wrap");
  if (!wrap) return;
  const textWrap = block.querySelector(".q-text")?.parentElement;
  const answerWrap = block.querySelector(".q-answer")?.parentElement;

  if (selectEl.value === "matching") {
    if (textWrap) textWrap.style.display = "none";
    if (answerWrap) answerWrap.style.display = "none";
  } else {
    if (textWrap) textWrap.style.display = "";
    if (answerWrap) answerWrap.style.display = "";
  }
  console.log("Clearing meta wrap");
  wrap.replaceChildren();

  // TEXT INPUT SETTINGS
  if (selectEl.value === "gap") {
    wrap.innerHTML = `
      <label>Max words</label>
      <input class="q-max-words" type="number" min="1" />

      <label style="display:block; margin-top:4px;">
        <input type="checkbox" class="q-allow-numbers" />
        Allow numbers
      </label>
    `;
  }

  // SINGLE / MULTI CHOICE OPTIONS
  if (selectEl.value === "mcq" || selectEl.value === "multi") {
    wrap.innerHTML = `
      <div class="q-options-wrap">

        <div class="q-options-list"></div>

        <button
          type="button"
          onclick="addOption(this)"
          style="margin-top:6px;"
        >
          + Add option
        </button>

      </div>
    `;
    addOption(wrap.querySelector("button"));
  }
  // MATCHING
if (selectEl.value === "matching") {

  wrap.innerHTML = `

<label>How many questions</label>
<input class="match-q-count" type="number" min="1" value="3" />

<label style="margin-top:6px; display:block;">How many options</label>
<input class="match-opt-count" type="number" min="1" value="5" />

<div class="matching-editor" style="margin-top:10px;"></div>

`;
  console.log("MATCH UI CREATED", wrap);

  const qInput = wrap.querySelector(".match-q-count");
  const oInput = wrap.querySelector(".match-opt-count");

  qInput.addEventListener("input", () => AdminReading.generateMatching(qInput));
  oInput.addEventListener("input", () => AdminReading.generateMatching(qInput));

  requestAnimationFrame(() => AdminReading.generateMatching(qInput));
}
}
