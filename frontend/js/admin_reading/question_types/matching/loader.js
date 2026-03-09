// frontend/js/admin_reading/question_types/matching/loader.js
window.AdminReading = window.AdminReading || {};

// loader for matching question type
AdminReading.registerQuestionType("matching", function(container, data = null) {

  if (!AdminReadingMatchingRender) {
    console.error("Matching renderer not loaded");
    return;
  }

  AdminReadingMatchingRender(container, data);

});
