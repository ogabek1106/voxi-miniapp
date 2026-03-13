// frontend/js/admin_reading/question_types/single_choice/logic.js
window.AdminReading = window.AdminReading || {};

AdminReading.registerQuestionType("single_choice", function(container, data = null) {

  console.log("MCQ loader triggered", container);

  if (!AdminReading.renderSingleChoice) {
    console.error("renderSingleChoice not found");
    return;
  }

  AdminReading.renderSingleChoice(container, data);

});
