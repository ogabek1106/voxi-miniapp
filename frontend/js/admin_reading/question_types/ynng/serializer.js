// frontend/js/admin_reading/question_types/ynng/serializer.js
window.AdminReading = window.AdminReading || {};
AdminReading.YNNG = AdminReading.YNNG || {};

AdminReading.serializeYNNG = function(block) {

  const text = block.querySelector(".ynng-question")?.value?.trim();
  const correct = block.querySelector(".ynng-correct")?.value;

  if (!text) return null;

  return {
    type: "YES_NO_NG",
    content: { text },
    correct_answer: { value: correct },
    meta: { subtype: "YN" }
  };
};
