// frontend/js/admin_reading/question_types/gap/serializer.js

window.AdminReading = window.AdminReading || {};
AdminReading.Gap = AdminReading.Gap || {};

AdminReading.serializeGap = function (block, groupId, startOrder) {

  const instruction = block.querySelector(".q-instruction-select")?.value?.trim() || null;

  const text = block.querySelector(".gap-text")?.value?.trim() || "";

  const blanks = AdminReading.Gap.detectBlanks(text);

  const answerBlocks = block.querySelectorAll(".gap-answer-block");

  const answers = Array.from(answerBlocks).map(block => {
    return Array.from(block.querySelectorAll(".gap-answer-input"))
      .map(i => i.value.trim())
      .filter(Boolean);
  });

  const payload = [];

  let order = startOrder;

  for (let i = 0; i < blanks.length; i++) {

    const variants = answers[i];
    if (!variants || !variants.length) continue;

    payload.push({
      type: "TEXT_INPUT",
      order_index: order++,
      question_group_id: groupId,
      instruction: instruction, // ✅ HERE
      content: { text: text },
      correct_answer: { value: variants[0] },
      meta: { variants: variants },
      points: 1
    });
  }

  return payload;
};
