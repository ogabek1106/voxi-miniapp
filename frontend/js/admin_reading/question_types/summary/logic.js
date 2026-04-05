// frontend/js/admin_reading/question_types/summary/logic.js

window.AdminReading = window.AdminReading || {};
AdminReading.Summary = AdminReading.Summary || {};

AdminReading.Summary.checkAnswer = function(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) return false;

  return userAnswer.trim().toLowerCase() ===
         correctAnswer.trim().toLowerCase();
};
