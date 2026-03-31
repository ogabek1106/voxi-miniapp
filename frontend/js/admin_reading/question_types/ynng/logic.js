// frontend/js/admin_reading/question_types/ynng/logic.js
window.AdminReading = window.AdminReading || {};
window.AdminReading.YNNG = window.AdminReading.YNNG || {};

window.AdminReading.YNNG.normalizeAnswer = function (val) {
  if (!val) return null;

  const v = val.toString().trim().toUpperCase();

  if (["YES", "Y"].includes(v)) return "YES";
  if (["NO", "N"].includes(v)) return "NO";
  if (["NOT_GIVEN", "NG", "NOT GIVEN"].includes(v)) return "NOT_GIVEN";

  return null;
};
