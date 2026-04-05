// frontend/js/admin_reading/question_types/multiple_choice/logic.js

window.AdminReading = window.AdminReading || {};
window.AdminReading.MCQ = window.AdminReading.MCQ || {};

window.AdminReading.MCQ.normalizeAnswers = function (vals) {
  if (!Array.isArray(vals)) return [];

  return vals
    .map(v => v?.toString().trim().toUpperCase())
    .filter(v => v);
};
