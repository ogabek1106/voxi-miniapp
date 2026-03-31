// frontend/js/admin_reading/question_types/tfng/serializer.js
window.AdminReading = window.AdminReading || {};
AdminReading.TFNG = AdminReading.TFNG || {};

AdminReading.serializeTFNG = function(block) {

  const text = block.querySelector(".tfng-question")?.value?.trim();
  const correct = block.querySelector(".tfng-correct")?.value;

  if (!text) return null;

  return {
    type: "TFNG",
    content: { text },
    correct_answer: { value: correct },
    meta: { subtype: "TF" }
  };
};
