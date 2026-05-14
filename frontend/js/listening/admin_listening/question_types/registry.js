// frontend/js/listening/admin_listening/question_types/registry.js
window.AdminListeningTypeRegistry = window.AdminListeningTypeRegistry || {};

(function () {
  const modules = {};

  AdminListeningTypeRegistry.register = function (family, module) {
    if (!family || !module) return;
    modules[family] = module;
  };

  AdminListeningTypeRegistry.getModule = function (type) {
    const info = window.AdminListeningUtils?.getTypeInfo(type);
    const fallback = {
      completion: window.AdminListeningTypeCompletion,
      sentence_completion: window.AdminListeningTypeSentenceCompletion,
      short_answer: window.AdminListeningTypeShortAnswer,
      choice: window.AdminListeningTypeChoice,
      matching: window.AdminListeningTypeMatching,
      visual_labeling: window.AdminListeningTypeVisualLabeling
    };
    return modules[info?.family] || fallback[info?.family] || null;
  };

  AdminListeningTypeRegistry.hydrateBlock = function (block) {
    const mod = AdminListeningTypeRegistry.getModule(block?.type);
    if (mod?.hydrate) mod.hydrate(block);
  };

  AdminListeningTypeRegistry.serializeBlock = function (block, blockIndex) {
    const mod = AdminListeningTypeRegistry.getModule(block?.type);
    if (mod?.serialize) return mod.serialize(block, blockIndex);

    return (block?.questions || []).map((question, questionIndex) => ({
      order_index: questionIndex + 1,
      question_number: Number(question.number || 0),
      type: block?.type || null,
      content: { text: question.content || "" },
      correct_answer: { text: question.correct_answer || "" },
      meta: question.meta || {}
    }));
  };

  AdminListeningTypeRegistry.validateBlock = function (block) {
    const staticErrors = [];
    if (!block?.type) staticErrors.push("Choose a question type.");

    const mod = AdminListeningTypeRegistry.getModule(block?.type);
    const dynamicErrors = mod?.validate ? mod.validate(block) : [];
    return [...staticErrors, ...dynamicErrors];
  };

  AdminListeningTypeRegistry.syncBlockFromDom = function (block, root) {
    const mod = AdminListeningTypeRegistry.getModule(block?.type);
    if (mod?.syncFromDom) mod.syncFromDom(block, root);
  };

  AdminListeningTypeRegistry.syncAllFromDom = function (state) {
    (state?.sections || []).forEach((section) => {
      (section?.blocks || []).forEach((block) => {
        AdminListeningTypeRegistry.syncBlockFromDom(block);
      });
    });
  };

  AdminListeningTypeRegistry.renderTypeEditor = function (ctx) {
    const type = ctx?.block?.type;
    const mod = AdminListeningTypeRegistry.getModule(type);
    AdminListeningTypeRegistry.hydrateBlock(ctx.block);

    const wrap = document.createElement("div");
    wrap.className = "listening-dynamic-area";

    const explanation = document.createElement("div");
    explanation.className = "listening-type-explanation";
    explanation.textContent = window.AdminListeningUtils?.getTypeExplanation(type) || "";
    wrap.appendChild(explanation);

    if (Array.isArray(ctx.block?.validation_errors) && ctx.block.validation_errors.length) {
      const errorBox = document.createElement("div");
      errorBox.className = "listening-validation-box";
      errorBox.innerHTML = ctx.block.validation_errors.map((msg) => `<div>${msg}</div>`).join("");
      wrap.appendChild(errorBox);
    }

    const body = document.createElement("div");
    body.className = "listening-dynamic-body";
    if (mod?.render) {
      body.appendChild(mod.render(ctx));
    } else {
      const fallback = document.createElement("div");
      fallback.className = "listening-help-text";
      fallback.textContent = `Unsupported question type: ${type}`;
      body.appendChild(fallback);
    }
    wrap.appendChild(body);
    return wrap;
  };
})();
