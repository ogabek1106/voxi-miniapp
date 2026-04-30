// frontend/js/listening/admin_listening/question_types/matching.js
window.AdminListeningTypeMatching = window.AdminListeningTypeMatching || {};

(function () {
  function hydrate(block) {
    if (!block.meta) block.meta = {};
    if (!Array.isArray(block.meta.options) || !block.meta.options.length) {
      block.meta.options = ["", "", "", "", ""];
    }
    if (!block.meta.group_id) block.meta.group_id = AdminListeningUtils.makeId("matching_group");
    AdminListeningUtils.ensureQuestionCount(block, Math.max(1, block.questions?.length || 1));
  }

  AdminListeningTypeMatching.hydrate = hydrate;

  AdminListeningTypeMatching.render = function (ctx) {
    const block = ctx.block;
    hydrate(block);
    const wrap = document.createElement("div");
    wrap.className = "listening-type-panel";

    const optionsTitle = document.createElement("div");
    optionsTitle.className = "listening-row-title";
    optionsTitle.textContent = "Options";
    wrap.appendChild(optionsTitle);

    const optionsList = document.createElement("div");
    optionsList.className = "listening-dynamic-list";
    block.meta.options.forEach((optionText, optionIndex) => {
      const letter = AdminListeningUtils.letters(block.meta.options.length)[optionIndex];
      const row = document.createElement("div");
      row.className = "listening-choice-row";
      const label = document.createElement("div");
      label.className = "listening-option-letter";
      label.textContent = letter;
      row.appendChild(label);
      const input = document.createElement("input");
      input.className = "listening-editor-input";
      input.type = "text";
      input.placeholder = `Option ${letter}`;
      input.value = optionText;
      input.oninput = () => {
        block.meta.options[optionIndex] = input.value;
        ctx.onChange();
      };
      row.appendChild(input);
      optionsList.appendChild(row);
    });
    wrap.appendChild(optionsList);

    const optionControls = document.createElement("div");
    optionControls.className = "listening-question-controls";
    const addOption = document.createElement("button");
    addOption.type = "button";
    addOption.className = "listening-secondary-btn";
    addOption.textContent = "Add option";
    addOption.onclick = () => {
      block.meta.options.push("");
      ctx.onRebuild();
    };
    optionControls.appendChild(addOption);

    const removeOption = document.createElement("button");
    removeOption.type = "button";
    removeOption.className = "listening-secondary-btn";
    removeOption.textContent = "Remove";
    removeOption.disabled = block.meta.options.length <= 2;
    removeOption.onclick = () => {
      if (block.meta.options.length <= 2) return;
      const removedLetter = AdminListeningUtils.letters(block.meta.options.length).at(-1);
      block.meta.options.pop();
      (block.questions || []).forEach((question) => {
        if (question.correct_answer === removedLetter) question.correct_answer = "";
      });
      ctx.onRebuild();
    };
    optionControls.appendChild(removeOption);
    wrap.appendChild(optionControls);

    const rowsTitle = document.createElement("div");
    rowsTitle.className = "listening-row-title";
    rowsTitle.textContent = "Answer key";
    wrap.appendChild(rowsTitle);

    const rows = document.createElement("div");
    rows.className = "listening-dynamic-list";
    (block.questions || []).forEach((q, qIndex) => {
      const row = document.createElement("div");
      row.className = "listening-dynamic-row";
      row.innerHTML = `<div class="listening-row-title">Item ${qIndex + 1}</div>`;
      const prompt = document.createElement("input");
      prompt.className = "listening-editor-input";
      prompt.type = "text";
      prompt.placeholder = "Item students will match";
      prompt.value = q.content || "";
      prompt.oninput = () => {
        AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { content: prompt.value });
        ctx.onChange();
      };
      row.appendChild(prompt);
      const answer = document.createElement("select");
      answer.className = "listening-editor-input";
      answer.innerHTML = `<option value="">Correct option</option>`;
      AdminListeningUtils.letters(block.meta.options.length).forEach((letter) => {
        const opt = document.createElement("option");
        opt.value = letter;
        opt.textContent = letter;
        if (q.correct_answer === letter) opt.selected = true;
        answer.appendChild(opt);
      });
      answer.onchange = () => {
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
      rows.appendChild(row);
    });
    wrap.appendChild(rows);

    const addRow = document.createElement("button");
    addRow.type = "button";
    addRow.className = "listening-secondary-btn";
    addRow.textContent = "Add question";
    addRow.onclick = () => {
      AdminListeningState.addQuestion(ctx.sectionIndex, ctx.blockIndex);
      ctx.onRebuild();
    };
    wrap.appendChild(addRow);
    return wrap;
  };

  AdminListeningTypeMatching.serialize = function (block) {
    hydrate(block);
    return (block.questions || []).map((q, index) => ({
      order_index: index + 1,
      question_number: Number(q.number || 0),
      type: block.type,
      content: { text: q.content || "" },
      correct_answer: { text: q.correct_answer || "" },
      meta: {
        ...(q.meta || {}),
        group_id: block.meta.group_id,
        options: block.meta.options || []
      }
    }));
  };

  AdminListeningTypeMatching.validate = function (block) {
    hydrate(block);
    const errors = [];
    if ((block.meta.options || []).filter((opt) => String(opt || "").trim()).length < 2) {
      errors.push("Add at least two matching options.");
    }
    (block.questions || []).forEach((q, index) => {
      if (!String(q.content || "").trim()) errors.push(`Add matching item ${index + 1}.`);
      if (!q.correct_answer) errors.push(`Choose the correct option for item ${index + 1}.`);
    });
    return errors;
  };
})();
