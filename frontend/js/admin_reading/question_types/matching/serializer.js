// frontend/js/admin_reading/question_types/matching/serializer.js

window.AdminReading = window.AdminReading || {};

AdminReading.serializeMatching = function (block, groupId, startOrder) {

  const wrap = block.querySelector(".matching-editor");
  if (!wrap) return [];

  const instruction = block.querySelector(".q-instruction-select")?.value?.trim() || null;

  const options = [];
  wrap.querySelectorAll(".match-option").forEach(opt => {
    const val = opt.value.trim();
    if (val) options.push(val);
  });

  const payload = [];

  let order = startOrder;

  const questionInputs = wrap.querySelectorAll(".match-question");
  const answerSelects = wrap.querySelectorAll(".match-answer");

  for (let i = 0; i < questionInputs.length; i++) {

    const text = questionInputs[i].value?.trim();
    if (!text) continue;

    const answer = answerSelects[i]?.value || "A";

    payload.push({
      type: "MATCHING",
      order_index: order++,
      question_group_id: groupId,
      instruction: instruction, // ✅ FIX
      content: { text: text },
      correct_answer: { value: answer },
      meta: { options: options },
      points: 1
    });
  }

  return payload;
};
