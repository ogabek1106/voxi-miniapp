// frontend/js/admin_reading/question_types/paragraph_matching/render.js
window.AdminReading = window.AdminReading || {};

AdminReading.refreshParagraphMatchingLabels = function(wrap) {

  if (!wrap) return;

  const block = wrap.closest(".question-block");
  const baseQ = parseInt(block?.dataset?.globalQ || "1", 10);
  const rows = wrap.querySelectorAll(".paragraph-match-row");

  rows.forEach((row, i) => {
    const label = row.querySelector(".paragraph-match-q-label");
    if (label) label.textContent = "Q" + (baseQ + i);
  });

  if (block) {
    block.dataset.generatedQuestions = rows.length;

    const next = baseQ + rows.length - 1;
    if (next > window.__globalQuestionCounter) {
      window.__globalQuestionCounter = next;
    }
  }

};

AdminReading.addParagraphMatchingRow = function(wrap, data = null) {

  if (!wrap) return;

  const row = document.createElement("div");
  row.className = "paragraph-match-row";
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.marginBottom = "6px";

  row.innerHTML = `
    <div class="paragraph-match-q-label" style="
      width:40px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
    "></div>

    <input class="paragraph-match-question"
           placeholder="Question"
           style="flex:1; padding:6px; border-radius:6px; border:1px solid #ddd;" />

    <input class="paragraph-match-answer"
           placeholder="Answer"
           style="width:120px; padding:6px; border-radius:6px; border:1px solid #ddd;" />
  `;

  const questionInput = row.querySelector(".paragraph-match-question");
  const answerInput = row.querySelector(".paragraph-match-answer");

  if (data) {
    questionInput.value = data.content?.text || "";
    answerInput.value = data.correct_answer?.value || "";
  }

  wrap.appendChild(row);
  AdminReading.refreshParagraphMatchingLabels(wrap);

};

AdminReading.renderParagraphMatching = function(wrap, groupData = null) {

  if (!wrap) return;

  wrap.innerHTML = "";

  if (groupData && groupData.length) {
    groupData.forEach(item => {
      AdminReading.addParagraphMatchingRow(wrap, item);
    });
    AdminReading.refreshParagraphMatchingLabels(wrap);
    return;
  }

  AdminReading.addParagraphMatchingRow(wrap, null);

};