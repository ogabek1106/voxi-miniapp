// frontend/js/admin_reading/question_types/single_choice/serializer.js
window.AdminReading = window.AdminReading || {};

AdminReading.serializeSingleChoice = function(block) {

  const options = [];
  const optionInputs = block.querySelectorAll(".mcq-option-input");

  optionInputs.forEach(input => {
    const text = input.value.trim();
    if (text) options.push(text);
  });

  const questionText =
    block.querySelector(".mcq-question")?.value.trim() || "";

  const correct =
    block.querySelector(".mcq-correct")?.value || "A";

  return {
    type: "SINGLE_CHOICE",
    meta: { options },
    questions: [{
      content: { text: questionText },
      correct_answer: { value: correct },
      order_index: 0
    }]
  };
};
