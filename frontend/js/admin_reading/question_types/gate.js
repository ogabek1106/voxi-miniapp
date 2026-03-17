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

  // 🔒 NORMALIZE CONTAINER (CRITICAL)
  let root = container;

  // case 1: container is q-meta-wrap → get inner root
  if (root.classList.contains("q-meta-wrap")) {
    root = root.querySelector(".q-type-root");
  }

  // case 2: container already correct
  if (root && root.classList.contains("q-type-root")) {
    // ok
  } else {
    console.error("❌ Invalid container passed to loadQuestionUI:", container);
    return;
  }

  console.log("✅ Using root:", root);

  // clear ONLY dynamic UI
  root.innerHTML = "";

  // run module
  module(root, data);
};
