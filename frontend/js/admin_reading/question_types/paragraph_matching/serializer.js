// frontend/js/admin_reading/question_types/paragraph_matching/serializer.js
window.AdminReading = window.AdminReading || {};

AdminReading.serializeParagraphMatching = function(block, groupId, orderIndex = 1) {

  const wrap = block.querySelector(".paragraph-matching-editor");
  if (!wrap) return [];

  const resolvedGroupId = groupId || block.dataset.questionGroupId || Date.now();
  const payload = [];

  wrap.querySelectorAll(".paragraph-match-row").forEach((row) => {

    const questionText = row.querySelector(".paragraph-match-question")?.value?.trim() || "";
    const answer = row.querySelector(".paragraph-match-answer")?.value?.trim() || "";

    if (!questionText && !answer) return;

    payload.push({
      type: "PARAGRAPH_MATCHING",
      question_group_id: resolvedGroupId,
      order_index: orderIndex++,
      instruction: null,
      content: { text: questionText },
      correct_answer: { value: answer },
      meta: {},
      points: 1
    });

  });

  return payload;

};