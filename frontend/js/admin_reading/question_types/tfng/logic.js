// frontend/js/admin_reading/question_types/tfng/logic.js
window.AdminReading = window.AdminReading || {};
window.AdminReading.TFNG = window.AdminReading.TFNG || {};

window.AdminReading.TFNG.normalizeAnswer = function (val) {
  if (!val) return null;

  const v = val.toString().trim().toUpperCase();

  if (["TRUE", "T"].includes(v)) return "TRUE";
  if (["FALSE", "F"].includes(v)) return "FALSE";
  if (["NOT_GIVEN", "NG", "NOT GIVEN"].includes(v)) return "NOT_GIVEN";

  return null;
};
