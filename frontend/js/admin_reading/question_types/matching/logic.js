// frontend/js/admin_reading/question_types/matching/logic.js
window.AdminReading = window.AdminReading || {};

AdminReading.registerQuestionType("matching", function(container, data = null) {

  console.log("STEP 1: matching loader triggered", container);

  if (!AdminReading.renderMatchingMeta) {
    console.error("renderMatchingMeta not found");
    return;
  }

  // render UI
  AdminReading.renderMatchingMeta(container);

  // find inputs
  const qInput = container.querySelector(".match-q-count");
  const optInput = container.querySelector(".match-opt-count");

  // first render
  AdminReading.renderMatchingEditor(container, qInput.value, optInput.value);

  // realtime updates
  qInput.addEventListener("input", () => {
    AdminReading.renderMatchingEditor(container, qInput.value, optInput.value);
  });

  optInput.addEventListener("input", () => {
    AdminReading.renderMatchingEditor(container, qInput.value, optInput.value);
  });

});
