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
      global_instruction_2: "",
      blocks: [defaultBlock()]
    };
  }

  function initialState() {
    return {
      id: AdminListeningUtils.makeId("listening_test"),
      title: "",
      global_instruction_1: "",
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

  AdminListeningState.setGlobalInstruction1 = function (value) {
    AdminListeningState.get().global_instruction_1 = AdminListeningUtils.safeString(value);
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
      preview_url: URL.createObjectURL(file),
      file,
      url: null
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

  AdminListeningState.removeSection = function (sectionIndex) {
    const s = AdminListeningState.get();
    if (!Array.isArray(s.sections)) return;
    s.sections.splice(sectionIndex, 1);
    normalize();
  };

  AdminListeningState.updateSectionInstructions = function (sectionIndex, value) {
    const section = AdminListeningState.get().sections[sectionIndex];
    if (!section) return;
    section.instructions = AdminListeningUtils.safeString(value);
  };

  AdminListeningState.updateSectionGlobalInstruction2 = function (sectionIndex, value) {
    const section = AdminListeningState.get().sections[sectionIndex];
    if (!section) return;
    section.global_instruction_2 = AdminListeningUtils.safeString(value);
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
    if (!section || !Array.isArray(section.blocks)) return;
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
    block.questions = [];
    block.dynamic_errors = [];
    block.validation_errors = [];
    if (window.AdminListeningTypeRegistry?.hydrateBlock) {
      window.AdminListeningTypeRegistry.hydrateBlock(block);
    }
    if (!block.questions.length) {
      block.questions = [defaultQuestion()];
    }
    normalize();
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
      preview_url: URL.createObjectURL(file),
      file,
      url: null
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

  AdminListeningState.removeQuestion = function (sectionIndex, blockIndex, questionIndex) {
    const block = AdminListeningState.get().sections?.[sectionIndex]?.blocks?.[blockIndex];
    if (!block || !Array.isArray(block.questions) || block.questions.length <= 1) return;
    block.questions.splice(questionIndex, 1);
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

  AdminListeningState.setState = function (nextState) {
    state = nextState || initialState();
    normalize();
  };

  AdminListeningState.buildFromApi = function (payload) {
    const base = {
      id: AdminListeningUtils.makeId("listening_test"),
      title: AdminListeningUtils.safeString(payload?.title),
      global_instruction_1: "",
      audio: payload?.audio_url
        ? {
            name: String(payload.audio_url).split("/").pop() || "audio",
            size: 0,
            type: "",
            preview_url: payload.audio_url,
            url: payload.audio_url
          }
        : null,
      time_limit_minutes: Number(payload?.time_limit_minutes || 60),
      question_count: 0,
      sections: []
    };

    const sections = Array.isArray(payload?.sections) ? payload.sections : [];
    base.sections = sections.map((section, sIndex) => {
      const blocks = Array.isArray(section?.blocks) ? section.blocks : [];
      return {
        id: AdminListeningUtils.makeId("listening_section"),
        order_index: Number(section?.order_index || sIndex + 1),
        instructions: AdminListeningUtils.safeString(section?.instructions),
        global_instruction_2: "",
        blocks: blocks.map((block, bIndex) => {
          const questions = Array.isArray(block?.questions) ? block.questions : [];
          return {
            id: AdminListeningUtils.makeId("listening_block"),
            order_index: Number(block?.order_index || bIndex + 1),
            type: block?.block_type || "form_completion",
            instructions: AdminListeningUtils.safeString(block?.instruction),
            start_time: AdminListeningUtils.formatSecondsToTime(block?.start_time_seconds),
            end_time: AdminListeningUtils.formatSecondsToTime(block?.end_time_seconds),
            image: block?.image_url
              ? {
                  name: String(block.image_url).split("/").pop() || "image",
                  size: 0,
                  type: "",
                  preview_url: block.image_url,
                  url: block.image_url
                }
              : null,
            questions: questions.map((q, qIndex) => ({
              id: AdminListeningUtils.makeId("listening_q"),
              number: Number(q?.question_number || 0),
              order_index: Number(q?.order_index || qIndex + 1),
              content: (q?.content && typeof q.content === "object" && "text" in q.content)
                ? q.content.text
                : (q?.content ?? ""),
              correct_answer: (q?.correct_answer && typeof q.correct_answer === "object")
                ? ("values" in q.correct_answer
                    ? q.correct_answer.values
                    : ("text" in q.correct_answer ? q.correct_answer.text : q.correct_answer))
                : (q?.correct_answer ?? ""),
              meta: q?.meta || {}
            })),
            meta: block?.meta || {}
          };
        })
      };
    });

    if (!base.sections.length) {
      base.sections = [defaultSection()];
    }

    base.sections.forEach((section) => {
      (section.blocks || []).forEach((block) => {
        if (window.AdminListeningTypeRegistry?.hydrateBlock) {
          window.AdminListeningTypeRegistry.hydrateBlock(block);
        }
      });
    });

    return base;
  };
})();
