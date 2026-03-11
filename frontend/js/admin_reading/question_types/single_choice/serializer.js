// frontend/js/admin_reading/question_types/single_choice/serializer.js
window.AdminReading = window.AdminReading || {};

AdminReading.serializeSingleChoice = function(block) {

  const options = [];
  let correct = null;

  block.querySelectorAll(".sc-option").forEach((opt, i) => {

    const text = opt.querySelector(".sc-text")?.value || "";
    const checked = opt.querySelector(".sc-correct")?.checked;

    options.push(text);

    if (checked) correct = String.fromCharCode(65 + i);

  });

  return {
    type: "SINGLE_CHOICE",
    meta: { options },
    questions: [{
      content: { text: block.querySelector(".sc-question")?.value || "" },
      correct_answer: { value: correct || "A" },
      order_index: 0
    }]
  };
};
