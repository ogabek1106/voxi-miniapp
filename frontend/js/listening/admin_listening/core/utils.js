// frontend/js/listening/admin_listening/core/utils.js
window.AdminListeningUtils = window.AdminListeningUtils || {};

AdminListeningUtils.makeId = function (prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

AdminListeningUtils.getTypeInfo = function (type) {
  const list = window.AdminListeningConstants?.BLOCK_TYPES || [];
  return list.find((it) => it.value === type) || null;
};

AdminListeningUtils.getTypeLabel = function (type) {
  const info = AdminListeningUtils.getTypeInfo(type);
  return info ? info.label : type;
};

AdminListeningUtils.recalculateGlobalQuestionNumbers = function (state) {
  let nextNumber = 1;
  (state.sections || []).forEach((section, sectionIndex) => {
    section.order_index = sectionIndex + 1;
    (section.blocks || []).forEach((block, blockIndex) => {
      block.order_index = blockIndex + 1;
      (block.questions || []).forEach((question, questionIndex) => {
        question.order_index = questionIndex + 1;
        question.number = nextNumber;
        nextNumber += 1;
      });
    });
  });
  state.question_count = nextNumber - 1;
  return state;
};

AdminListeningUtils.safeString = function (value) {
  return value == null ? "" : String(value);
};

