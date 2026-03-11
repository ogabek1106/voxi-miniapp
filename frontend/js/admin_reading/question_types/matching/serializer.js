// frontend/js/admin_reading/question_types/matching/serializer.js
window.AdminReading = window.AdminReading || {};

AdminReading.serializeMatching = function(block) {

  const wrap = block.querySelector(".matching-editor");
  if (!wrap) return [];

  const options = [];
  wrap.querySelectorAll(".match-option").forEach(opt => {
    options.push(opt.value || "");
  });

  const questions = [];

  wrap.querySelectorAll(".match-question").forEach((qInput, i) => {

    const answerSelect = wrap.querySelectorAll(".match-answer")[i];

    questions.push({
      content: { text: qInput.value || "" },
      correct_answer: { value: answerSelect ? answerSelect.value : "A" },
      order_index: i
    });

  });

  return {
    type: "MATCHING",
    meta: { options },
    questions
  };
};
