// frontend/js/admin_reading/question_types/ynng/serializer.js
window.AdminReading = window.AdminReading || {};
window.AdminReading.YNNG = window.AdminReading.YNNG || {};

window.AdminReading.YNNG.serialize = function (block) {

  const text = block.querySelector(".ynng-question")?.value?.trim();
  const correctRaw = block.querySelector(".ynng-correct")?.value;

  const correct = window.AdminReading.YNNG.normalizeAnswer(correctRaw);

  if (!text) return null;

  return {
    type: "YES_NO_NG",
    content: { text },
    correct_answer: { value: correct },
    meta: { subtype: "YN" }
  };
};
