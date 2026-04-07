// frontend/js/admin_reading/question_types/paragraph_matching/logic.js
window.AdminReading = window.AdminReading || {};

AdminReading.registerQuestionType("paragraph_matching", function(container, data = null) {

  if (!AdminReading.renderParagraphMatchingMeta) {
    console.error("renderParagraphMatchingMeta not found");
    return;
  }

  AdminReading.renderParagraphMatchingMeta(container);

  const block = container.closest(".question-block");
  const header = block?.querySelector(".q-header");
  if (header) header.style.display = "none";

  const typeSelect = block?.querySelector(".q-type-select");
  if (typeSelect) {
    typeSelect.addEventListener("change", () => {
      if (typeSelect.value !== "paragraph_matching" && header) {
        header.style.display = "block";
      }
    }, { once: true });
  }

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
    AdminReading.refreshParagraphMatchingLabels(wrap);
  });

});