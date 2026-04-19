// frontend/js/listening/admin_listening/core/state.js
window.AdminListeningState = window.AdminListeningState || {};

(function () {
  let state = null;

  function defaultQuestion() {
    return {
      id: AdminListeningUtils.makeId("listening_q"),
      number: null,
      order_index: 1,
      content: "",
      correct_answer: "",
      meta: {}
    };
  }

  function defaultBlock(type = "form_completion") {
    return {
      id: AdminListeningUtils.makeId("listening_block"),
      order_index: 1,
      type,
      instructions: "",
      start_time: "",
      end_time: "",
      image: null,
      questions: [defaultQuestion()],
      meta: {}
    };
  }

  function defaultSection() {
    return {
      id: AdminListeningUtils.makeId("listening_section"),
      order_index: 1,
      instructions: "",
      blocks: [defaultBlock()]
    };
  }

  function initialState() {
    return {
      id: AdminListeningUtils.makeId("listening_test"),
      title: "",
      audio: null,
      time_limit_minutes: window.AdminListeningConstants?.DEFAULT_TIME_LIMIT_MINUTES || 60,
      question_count: 0,
      sections: [defaultSection()]
    };
  }

  function normalize() {
    AdminListeningUtils.recalculateGlobalQuestionNumbers(state);
  }

  AdminListeningState.init = function () {
    state = initialState();
    normalize();
    return state;
  };

  AdminListeningState.get = function () {
    if (!state) AdminListeningState.init();
    return state;
  };

  AdminListeningState.setTitle = function (value) {
    AdminListeningState.get().title = AdminListeningUtils.safeString(value);
  };

  AdminListeningState.setTimeLimit = function (value) {
    const n = Number(value);
    AdminListeningState.get().time_limit_minutes = Number.isFinite(n) && n > 0 ? Math.floor(n) : 60;
  };

  AdminListeningState.setAudioFile = function (file) {
    const s = AdminListeningState.get();
    if (!file) {
      s.audio = null;
      return;
    }
    s.audio = {
      name: file.name || "audio",
      size: file.size || 0,
      type: file.type || "",
      preview_url: URL.createObjectURL(file)
    };
  };

  AdminListeningState.addSection = function () {
    const s = AdminListeningState.get();
    s.sections.push(defaultSection());
    normalize();
  };

  AdminListeningState.removeLastSection = function () {
    const s = AdminListeningState.get();
    if (s.sections.length <= 1) return;
    s.sections.pop();
    normalize();
  };

  AdminListeningState.updateSectionInstructions = function (sectionIndex, value) {
    const section = AdminListeningState.get().sections[sectionIndex];
    if (!section) return;
    section.instructions = AdminListeningUtils.safeString(value);
  };

  AdminListeningState.addBlock = function (sectionIndex) {
    const section = AdminListeningState.get().sections[sectionIndex];
    if (!section) return;
    section.blocks.push(defaultBlock());
    normalize();
  };

  AdminListeningState.removeLastBlock = function (sectionIndex) {
    const section = AdminListeningState.get().sections[sectionIndex];
    if (!section || section.blocks.length <= 1) return;
    section.blocks.pop();
    normalize();
  };

  AdminListeningState.removeBlock = function (sectionIndex, blockIndex) {
    const section = AdminListeningState.get().sections[sectionIndex];
    if (!section || section.blocks.length <= 1) return;
    section.blocks.splice(blockIndex, 1);
    normalize();
  };

  AdminListeningState.updateBlock = function (sectionIndex, blockIndex, patch) {
    const block = AdminListeningState.get().sections?.[sectionIndex]?.blocks?.[blockIndex];
    if (!block) return;
    Object.assign(block, patch || {});
  };

  AdminListeningState.setBlockType = function (sectionIndex, blockIndex, type) {
    const block = AdminListeningState.get().sections?.[sectionIndex]?.blocks?.[blockIndex];
    if (!block) return;
    block.type = type;
    block.meta = {};
  };

  AdminListeningState.setBlockImage = function (sectionIndex, blockIndex, file) {
    const block = AdminListeningState.get().sections?.[sectionIndex]?.blocks?.[blockIndex];
    if (!block) return;
    if (!file) {
      block.image = null;
      return;
    }
    block.image = {
      name: file.name || "image",
      size: file.size || 0,
      type: file.type || "",
      preview_url: URL.createObjectURL(file)
    };
  };

  AdminListeningState.addQuestion = function (sectionIndex, blockIndex) {
    const block = AdminListeningState.get().sections?.[sectionIndex]?.blocks?.[blockIndex];
    if (!block) return;
    block.questions.push(defaultQuestion());
    normalize();
  };

  AdminListeningState.removeLastQuestion = function (sectionIndex, blockIndex) {
    const block = AdminListeningState.get().sections?.[sectionIndex]?.blocks?.[blockIndex];
    if (!block || block.questions.length <= 1) return;
    block.questions.pop();
    normalize();
  };

  AdminListeningState.updateQuestion = function (sectionIndex, blockIndex, questionIndex, patch) {
    const question = AdminListeningState.get().sections?.[sectionIndex]?.blocks?.[blockIndex]?.questions?.[questionIndex];
    if (!question) return;
    Object.assign(question, patch || {});
  };

  AdminListeningState.replaceBlockMeta = function (sectionIndex, blockIndex, meta) {
    const block = AdminListeningState.get().sections?.[sectionIndex]?.blocks?.[blockIndex];
    if (!block) return;
    block.meta = meta || {};
  };

  AdminListeningState.sync = function () {
    normalize();
  };
})();

