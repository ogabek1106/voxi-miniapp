// frontend/js/admin_reading/question_types/matching.js
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
