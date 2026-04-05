// frontend/js/admin_reading/question_types/summary/serializer.js

window.AdminReading = window.AdminReading || {};
AdminReading.Summary = AdminReading.Summary || {};

AdminReading.serializeSummary = function(block) {

  const text = block.querySelector(".summary-text")?.value?.trim();
  const wordLimit = parseInt(block.querySelector(".summary-word-limit")?.value || "0", 10);

  const wordBankRaw = block.querySelector(".summary-word-bank")?.value || "";
  const wordBank = wordBankRaw
    .split(",")
    .map(w => w.trim())
    .filter(Boolean);

  const answers = [...block.querySelectorAll(".summary-answer-input")]
    .map(i => i.value.trim())
    .filter(Boolean);

  if (!text) return [];

  const groupId = Math.floor(Math.random() * 1000000000); // temp group id

  return answers.map((ans, index) => ({
    type: "TEXT_INPUT",
    order_index: index + 1,
    question_group_id: groupId,
    instruction: null,
    content: { text },
    correct_answer: { value: ans },
    meta: {
      mode: "summary",
      word_limit: wordLimit || null,
      word_bank: wordBank
    },
    points: 1
  }));

};
