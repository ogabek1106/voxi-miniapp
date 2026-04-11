// frontend/js/admin_reading/question_types/summary/serializer.js

window.AdminReading = window.AdminReading || {};
AdminReading.Summary = AdminReading.Summary || {};

AdminReading.serializeSummary = function(block, groupId = null, startOrderIndex = 1) {

  const text = block.querySelector(".summary-text")?.value?.trim();
  const instruction = block.querySelector(".q-instruction-select")?.value?.trim() || null;
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

  const resolvedGroupId = groupId || Math.floor(Math.random() * 1000000000);

  return answers.map((ans, index) => ({
    type: "TEXT_INPUT",
    order_index: startOrderIndex + index,
    question_group_id: resolvedGroupId,
    instruction: instruction,
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
