// frontend/js/admin_reading/question_types/ynng/serializer.js

window.AdminReading = window.AdminReading || {};
AdminReading.YNNG = AdminReading.YNNG || {};

AdminReading.serializeYNNG = function (block, orderIndex) {

  const text = block.querySelector(".ynng-question")?.value?.trim();
  const correct = block.querySelector(".ynng-correct")?.value;

  const instruction = block.querySelector(".q-instruction-select")?.value?.trim() || null;

  if (!text) return null;

  return {
    type: "YES_NO_NG",
    order_index: orderIndex,
    instruction: instruction, // ✅ FIX
    content: { text },
    correct_answer: { value: correct },
    meta: { subtype: "YN" },
    points: 1
  };
};
