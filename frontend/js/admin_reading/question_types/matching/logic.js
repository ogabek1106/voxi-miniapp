// frontend/js/admin_reading/question_types/matching/logic.js
window.AdminReading = window.AdminReading || {};

AdminReading.registerQuestionType("matching", function(container, data = null) {

  console.log("STEP 1: matching loader triggered", container);

  if (!AdminReading.renderMatchingMeta) {
    console.error("renderMatchingMeta not found");
    return;
  }

  AdminReading.renderMatchingMeta(container);

});
