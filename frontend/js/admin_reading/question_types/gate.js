// frontend/js/admin_reading/question_types/gate.js
window.AdminReading = window.AdminReading || {};
AdminReading.QuestionTypes = {};

// register modules
AdminReading.registerQuestionType = function(type, loader) {
  AdminReading.QuestionTypes[type] = loader;
};

// gate
AdminReading.loadQuestionUI = function(type, container, data = null) {

  const module = AdminReading.QuestionTypes[type];

  if (!module) {
    console.error("Question type not registered:", type);
    return;
  }

  module(container, data);
};
