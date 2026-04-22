// frontend/js/admin_reading/question_types/image_questions/serializer.js
window.AdminReading = window.AdminReading || {};

AdminReading.serializeImageQuestions = function (block, groupId, startOrder) {
  const instruction =
    (window.getInstructionValueFromBlock
      ? window.getInstructionValueFromBlock(block)
      : block.querySelector(".q-instruction-select")?.value?.trim()) || null;
  const uploadWrap = block.querySelector(".image-questions-upload-wrap");
  const imageUrl = uploadWrap?.dataset?.imageUrl?.trim() || null;

  const rows = Array.from(block.querySelectorAll(".image-questions-row"));
  const payload = [];
  let order = startOrder;

  rows.forEach((row) => {
    const text = row.querySelector(".image-question-text")?.value?.trim() || "";
    const answer = row.querySelector(".image-question-answer")?.value?.trim() || "";
    if (!text || !answer) return;

    payload.push({
      type: "TEXT_INPUT",
      order_index: order++,
      question_group_id: groupId,
      instruction,
      content: { text },
      correct_answer: { value: answer },
      image_url: imageUrl,
      meta: {
        mode: "image_questions"
      },
      points: 1
    });
  });

  return payload;
};
