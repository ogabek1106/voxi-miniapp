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

AdminListeningUtils.parseTimeToSeconds = function (raw) {
  const text = AdminListeningUtils.safeString(raw).trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(text);

  const parts = text.split(":").map((p) => p.trim());
  if (parts.length === 2) {
    const mm = Number(parts[0]);
    const ss = Number(parts[1]);
    if (Number.isFinite(mm) && Number.isFinite(ss)) return mm * 60 + ss;
  }
  if (parts.length === 3) {
    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    const ss = Number(parts[2]);
    if (Number.isFinite(hh) && Number.isFinite(mm) && Number.isFinite(ss)) {
      return hh * 3600 + mm * 60 + ss;
    }
  }
  return null;
};

AdminListeningUtils.formatSecondsToTime = function (value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "";
  const sec = Math.floor(n % 60).toString().padStart(2, "0");
  const minTotal = Math.floor(n / 60);
  const min = Math.floor(minTotal % 60).toString().padStart(2, "0");
  const hrs = Math.floor(minTotal / 60);
  if (hrs > 0) return `${hrs}:${min}:${sec}`;
  return `${min}:${sec}`;
};
