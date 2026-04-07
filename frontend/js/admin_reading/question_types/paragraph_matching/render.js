// frontend/js/admin_reading/question_types/paragraph_matching/render.js
window.AdminReading = window.AdminReading || {};

AdminReading.addParagraphMatchingRow = function(wrap, data = null) {

  if (!wrap) return;

  const row = document.createElement("div");
  row.className = "paragraph-match-row";
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.marginBottom = "6px";

  row.innerHTML = `
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

};

AdminReading.renderParagraphMatching = function(wrap, groupData = null) {

  if (!wrap) return;

  wrap.innerHTML = "";

  if (groupData && groupData.length) {
    groupData.forEach(item => {
      AdminReading.addParagraphMatchingRow(wrap, item);
    });
    return;
  }

  AdminReading.addParagraphMatchingRow(wrap, null);

};