// frontend/js/admin_reading/question_types/matching/logic.js
window.AdminReading = window.AdminReading || {};

AdminReading.matchingInit = function(meta) {

  console.log("STEP 6: matchingInit called", meta);

  const qInput = meta.querySelector(".match-q-count");
  const oInput = meta.querySelector(".match-opt-count");

  console.log("STEP 7: inputs found", qInput, oInput);

  if (!qInput || !oInput) {
    console.error("Matching inputs not found");
    return;
  }

  qInput.addEventListener("input", () => {
    console.log("STEP 8: qInput change");
    AdminReading.generateMatching(qInput);
  });

  oInput.addEventListener("input", () => {
    console.log("STEP 9: oInput change");
    AdminReading.generateMatching(qInput);
  });

  console.log("STEP 10: initial render trigger");

  requestAnimationFrame(() => {
    AdminReading.generateMatching(qInput);
  });

};
