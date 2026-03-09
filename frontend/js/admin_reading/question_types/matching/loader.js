// frontend/js/admin_reading/question_types/matching/loader.js
window.AdminReading = window.AdminReading || {};

// register matching question type
AdminReading.registerQuestionType("matching", function(container, data = null) {

  if (!AdminReading.renderMatchingMeta) {
    console.error("Matching UI not loaded");
    return;
  }

  AdminReading.renderMatchingMeta(container);

});
