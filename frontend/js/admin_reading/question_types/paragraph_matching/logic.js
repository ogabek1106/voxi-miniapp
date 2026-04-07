// frontend/js/admin_reading/question_types/paragraph_matching/logic.js
window.AdminReading = window.AdminReading || {};

AdminReading.registerQuestionType("paragraph_matching", function(container, data = null) {

  if (!AdminReading.renderParagraphMatchingMeta) {
    console.error("renderParagraphMatchingMeta not found");
    return;
  }

  AdminReading.renderParagraphMatchingMeta(container);

  const wrap = container.querySelector(".paragraph-matching-editor");
  const addBtn = container.querySelector(".paragraph-match-add");
  const removeBtn = container.querySelector(".paragraph-match-remove");

  AdminReading.renderParagraphMatching(wrap, data || null);

  addBtn.addEventListener("click", () => {
    AdminReading.addParagraphMatchingRow(wrap);
  });

  removeBtn.addEventListener("click", () => {
    const rows = wrap.querySelectorAll(".paragraph-match-row");
    if (rows.length <= 1) return;
    rows[rows.length - 1].remove();
  });

});