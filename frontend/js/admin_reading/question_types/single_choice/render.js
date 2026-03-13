// frontend/js/admin_reading/question_types/single_choice/render.js
window.AdminReading = window.AdminReading || {};

AdminReading.renderSingleChoice = function(container, data = null) {

  if (!AdminReading.renderSingleChoiceUI) {
    console.error("renderSingleChoiceUI not found");
    return;
  }

  AdminReading.renderSingleChoiceUI(container, data);

};
