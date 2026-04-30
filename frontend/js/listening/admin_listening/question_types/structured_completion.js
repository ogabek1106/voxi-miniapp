// frontend/js/listening/admin_listening/question_types/structured_completion.js
window.AdminListeningTypeSentenceCompletion = window.AdminListeningTypeSentenceCompletion || {};
window.AdminListeningTypeShortAnswer = window.AdminListeningTypeShortAnswer || {};

(function () {
  function ensureRows(block, count = 1) {
    AdminListeningUtils.ensureQuestionCount(block, Math.max(1, count));
  }

  function addRowButton(ctx, label = "Add question") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "listening-secondary-btn";
    button.textContent = label;
    button.onclick = () => {
      AdminListeningState.addQuestion(ctx.sectionIndex, ctx.blockIndex);
      ctx.onRebuild();
    };
    return button;
  }

  AdminListeningTypeSentenceCompletion.hydrate = function (block) {
    ensureRows(block);
  };

  AdminListeningTypeSentenceCompletion.render = function (ctx) {
    const block = ctx.block;
    ensureRows(block);
    const wrap = document.createElement("div");
    wrap.className = "listening-type-panel";
    const helper = document.createElement("div");
    helper.className = "listening-help-text";
    helper.textContent = "Create separate sentence items. Each sentence should contain one blank.";
    wrap.appendChild(helper);

    const list = document.createElement("div");
    list.className = "listening-dynamic-list";
    (block.questions || []).forEach((q, qIndex) => {
      const row = document.createElement("div");
      row.className = "listening-dynamic-row";
      row.innerHTML = `<div class="listening-row-title">Sentence ${qIndex + 1}</div>`;

      const sentence = document.createElement("textarea");
      sentence.className = "listening-editor-input";
      sentence.rows = 2;
      sentence.placeholder = "Student sentence with a blank";
      sentence.value = q.content || "";
      sentence.oninput = () => {
        AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { content: sentence.value });
        ctx.onChange();
      };
      row.appendChild(sentence);

      const answer = document.createElement("input");
      answer.className = "listening-editor-input";
      answer.type = "text";
      answer.placeholder = "Correct answer";
      answer.value = q.correct_answer || "";
      answer.oninput = () => {
        AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { correct_answer: answer.value });
        ctx.onChange();
      };
      row.appendChild(answer);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "listening-secondary-btn";
      remove.textContent = "Remove";
      remove.disabled = (block.questions || []).length <= 1;
      remove.onclick = () => {
        AdminListeningState.removeQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex);
        ctx.onRebuild();
      };
      row.appendChild(remove);
      list.appendChild(row);
    });
    wrap.appendChild(list);
    wrap.appendChild(addRowButton(ctx, "Add sentence"));
    return wrap;
  };

  AdminListeningTypeSentenceCompletion.serialize = function (block) {
    ensureRows(block);
    return (block.questions || []).map((q, index) => ({
      order_index: index + 1,
      question_number: Number(q.number || 0),
      type: block.type,
      content: { text: q.content || "" },
      correct_answer: { text: q.correct_answer || "" },
      meta: q.meta || {}
    }));
  };

  AdminListeningTypeSentenceCompletion.validate = function (block) {
    ensureRows(block);
    const errors = [];
    (block.questions || []).forEach((q, index) => {
      if (!String(q.content || "").trim()) errors.push(`Add sentence text for item ${index + 1}.`);
      if (!String(q.correct_answer || "").trim()) errors.push(`Add the correct answer for sentence ${index + 1}.`);
    });
    return errors;
  };

  AdminListeningTypeShortAnswer.hydrate = function (block) {
    ensureRows(block);
  };

  AdminListeningTypeShortAnswer.render = function (ctx) {
    const block = ctx.block;
    ensureRows(block);
    const wrap = document.createElement("div");
    wrap.className = "listening-type-panel";
    const helper = document.createElement("div");
    helper.className = "listening-help-text";
    helper.textContent = "Students see a question and type a short answer.";
    wrap.appendChild(helper);

    const list = document.createElement("div");
    list.className = "listening-dynamic-list";
    (block.questions || []).forEach((q, qIndex) => {
      const row = document.createElement("div");
      row.className = "listening-dynamic-row";
      row.innerHTML = `<div class="listening-row-title">Question ${qIndex + 1}</div>`;

      const prompt = document.createElement("textarea");
      prompt.className = "listening-editor-input";
      prompt.rows = 2;
      prompt.placeholder = "Student question";
      prompt.value = q.content || "";
      prompt.oninput = () => {
        AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { content: prompt.value });
        ctx.onChange();
      };
      row.appendChild(prompt);

      const answer = document.createElement("input");
      answer.className = "listening-editor-input";
      answer.type = "text";
      answer.placeholder = "Correct answer";
      answer.value = q.correct_answer || "";
      answer.oninput = () => {
        AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { correct_answer: answer.value });
        ctx.onChange();
      };
      row.appendChild(answer);

      const variants = document.createElement("input");
      variants.className = "listening-editor-input";
      variants.type = "text";
      variants.placeholder = "Accepted answers, separated by commas";
      variants.value = (q.meta?.variants || []).join(", ");
      variants.oninput = () => {
        const meta = { ...(q.meta || {}) };
        meta.variants = variants.value.split(",").map((v) => v.trim()).filter(Boolean);
        AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { meta });
        ctx.onChange();
      };
      row.appendChild(variants);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "listening-secondary-btn";
      remove.textContent = "Remove";
      remove.disabled = (block.questions || []).length <= 1;
      remove.onclick = () => {
        AdminListeningState.removeQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex);
        ctx.onRebuild();
      };
      row.appendChild(remove);
      list.appendChild(row);
    });
    wrap.appendChild(list);
    wrap.appendChild(addRowButton(ctx, "Add question"));
    return wrap;
  };

  AdminListeningTypeShortAnswer.serialize = AdminListeningTypeSentenceCompletion.serialize;
  AdminListeningTypeShortAnswer.validate = function (block) {
    ensureRows(block);
    const errors = [];
    (block.questions || []).forEach((q, index) => {
      if (!String(q.content || "").trim()) errors.push(`Add the student question for item ${index + 1}.`);
      if (!String(q.correct_answer || "").trim()) errors.push(`Add the correct answer for item ${index + 1}.`);
    });
    return errors;
  };
})();
