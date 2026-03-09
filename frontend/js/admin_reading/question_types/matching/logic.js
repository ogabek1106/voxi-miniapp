// frontend/js/admin_reading/question_types/matching/logic.js
window.AdminReading = window.AdminReading || {};

AdminReading.matchingInit = function(meta) {

  const qInput = meta.querySelector(".match-q-count");
  const oInput = meta.querySelector(".match-opt-count");

  if (!qInput || !oInput) {
    console.error("Matching inputs not found");
    return;
  }

  qInput.addEventListener("input", () => {
    AdminReading.generateMatching(qInput);
  });

  oInput.addEventListener("input", () => {
    AdminReading.generateMatching(qInput);
  });

  requestAnimationFrame(() => {
    AdminReading.generateMatching(qInput);
  });

};
