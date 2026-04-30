// frontend/js/listening/admin_listening/question_types/text_completion.js
window.AdminListeningTypeCompletion = window.AdminListeningTypeCompletion || {};

(function () {
  function defaultTemplate(type) {
    if (type === "flowchart_completion") return "Step 1: [[1]]\n↓\nStep 2: [[2]]";
    if (type === "summary_completion") return "Summary text with [[1]] and [[2]].";
    return "";
  }

  function syncGaps(block) {
    if (!block.meta) block.meta = {};
    if (!block.meta.template_text) block.meta.template_text = defaultTemplate(block.type);
    if (!block.meta.word_limit) block.meta.word_limit = "ONE WORD ONLY";

    const gaps = AdminListeningUtils.extractGapNumbers(block.meta.template_text);
    AdminListeningUtils.ensureQuestionCount(block, gaps.length);
    gaps.forEach((gap, index) => {
      const question = block.questions[index];
      question.content = `[[${gap}]]`;
      question.meta = { ...(question.meta || {}), gap, word_limit: block.meta.word_limit };
    });
  }

  function answerCard(ctx, question, qIndex) {
    const card = document.createElement("div");
    card.className = "listening-dynamic-row";

    const title = document.createElement("div");
    title.className = "listening-row-title";
    title.textContent = `Gap [[${question.meta?.gap || qIndex + 1}]]`;
    card.appendChild(title);

    const answer = document.createElement("input");
    answer.className = "listening-editor-input";
    answer.type = "text";
    answer.placeholder = "Correct answer";
    answer.value = question.correct_answer || "";
    answer.oninput = () => {
      AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { correct_answer: answer.value });
      ctx.onChange();
    };
    card.appendChild(answer);

    const variants = document.createElement("input");
    variants.className = "listening-editor-input";
    variants.type = "text";
    variants.placeholder = "Accepted answers, separated by commas";
    variants.value = (question.meta?.variants || []).join(", ");
    variants.oninput = () => {
      const meta = { ...(question.meta || {}) };
      meta.variants = variants.value.split(",").map((v) => v.trim()).filter(Boolean);
      AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { meta });
      ctx.onChange();
    };
    card.appendChild(variants);
    return card;
  }

  AdminListeningTypeCompletion.hydrate = function (block) {
    syncGaps(block);
  };

  AdminListeningTypeCompletion.render = function (ctx) {
    const block = ctx.block;
    syncGaps(block);

    const wrap = document.createElement("div");
    wrap.className = "listening-type-panel";

    const label = document.createElement("label");
    label.className = "listening-field-label";
    label.textContent = "Student text with gaps";
    wrap.appendChild(label);

    const helper = document.createElement("div");
    helper.className = "listening-help-text";
    helper.textContent = "Write the text students will see. Use [[1]], [[2]] for gaps.";
    wrap.appendChild(helper);

    const template = document.createElement("textarea");
    template.className = "listening-editor-input";
    template.rows = block.type === "flowchart_completion" ? 6 : 5;
    template.value = block.meta.template_text || "";
    template.oninput = () => {
      block.meta.template_text = template.value;
      syncGaps(block);
      ctx.onRebuild();
    };
    wrap.appendChild(template);

    const wordLimit = document.createElement("select");
    wordLimit.className = "listening-editor-input";
    (window.AdminListeningConstants?.WORD_LIMITS || []).forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      if (value === block.meta.word_limit) option.selected = true;
      wordLimit.appendChild(option);
    });
    wordLimit.onchange = () => {
      block.meta.word_limit = wordLimit.value;
      syncGaps(block);
      ctx.onChange();
    };
    wrap.appendChild(wordLimit);

    const answers = document.createElement("div");
    answers.className = "listening-dynamic-list";
    (block.questions || []).forEach((q, qIndex) => answers.appendChild(answerCard(ctx, q, qIndex)));
    wrap.appendChild(answers);
    return wrap;
  };

  AdminListeningTypeCompletion.serialize = function (block) {
    syncGaps(block);
    return (block.questions || []).map((q, index) => ({
      order_index: index + 1,
      question_number: Number(q.number || 0),
      type: block.type,
      content: { text: q.content || `[[${index + 1}]]` },
      correct_answer: { text: q.correct_answer || "" },
      meta: {
        ...(q.meta || {}),
        template_text: block.meta?.template_text || "",
        word_limit: block.meta?.word_limit || ""
      }
    }));
  };

  AdminListeningTypeCompletion.validate = function (block) {
    syncGaps(block);
    const errors = [];
    if (!AdminListeningUtils.extractGapNumbers(block.meta?.template_text).length) {
      errors.push("Add at least one [[1]] gap in the template.");
    }
    (block.questions || []).forEach((q) => {
      if (!String(q.correct_answer || "").trim()) {
        errors.push(`Add the correct answer for gap [[${q.meta?.gap || "?"}]].`);
      }
    });
    return errors;
  };
})();
