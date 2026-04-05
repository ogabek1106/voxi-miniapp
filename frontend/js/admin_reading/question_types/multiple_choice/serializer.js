// frontend/js/admin_reading/question_types/multiple_choice/serializer.js

window.AdminReading = window.AdminReading || {};
AdminReading.MCQ = AdminReading.MCQ || {};

AdminReading.serializeMCQ = function(block) {

  const text = block.querySelector(".mcq-question")?.value?.trim();
  const max = parseInt(block.querySelector(".mcq-max")?.value);

  if (!text) return null;

  const optionEls = [...block.querySelectorAll(".mcq-option")];

  const options = [];
  const correct_answers = [];

  optionEls.forEach((el, index) => {
    const key = String.fromCharCode(65 + index);
    const value = el.querySelector(".mcq-option-text")?.value?.trim();
    const isChecked = el.querySelector(".mcq-correct")?.checked;

    if (!value) return;

    options.push({ key, text: value });

    if (isChecked) {
      correct_answers.push(key);
    }
  });

  if (!options.length) return null;
  if (!correct_answers.length) return null;

  return {
    type: "MULTIPLE_CHOICE",
    content: {
      text,
      options
    },
    correct_answers,
    meta: {
      max_answers: max || 1
    }
  };
};
