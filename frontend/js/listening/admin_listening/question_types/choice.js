// frontend/js/listening/admin_listening/question_types/choice.js
window.AdminListeningTypeChoice = window.AdminListeningTypeChoice || {};

(function () {
  function letters(options) {
    return AdminListeningUtils.letters(options.length);
  }

  function hydrate(block) {
    AdminListeningUtils.ensureQuestionCount(block, Math.max(1, block.questions?.length || 1));

    (block.questions || []).forEach((q) => {
      if (!q.meta) q.meta = {};
      if (!Array.isArray(q.meta.options) || q.meta.options.length < 2) {
        q.meta.options = block.type === "mcq_multiple" ? ["", "", "", "", ""] : ["", "", "", ""];
      }

      if (block.type === "mcq_multiple") {
        if (!Array.isArray(q.correct_answer)) q.correct_answer = [];
        q.meta.required_count = Number(q.meta.required_count || 2);
      } else if (!q.correct_answer) {
        q.correct_answer = "";
      }
    });
  }

  function renderQuestion(ctx, q, qIndex, isMulti) {
    const options = q.meta.options;
    const panel = document.createElement("div");
    panel.className = "listening-dynamic-row";
    panel.innerHTML = `<div class="listening-row-title">Question ${qIndex + 1}</div>`;

    const prompt = document.createElement("textarea");
    prompt.className = "listening-editor-input";
    prompt.rows = 2;
    prompt.placeholder = "Student question";
    prompt.value = q.content || "";
    prompt.oninput = () => {
      AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { content: prompt.value });
      ctx.onChange();
    };
    panel.appendChild(prompt);

    if (isMulti) {
      const required = document.createElement("input");
      required.className = "listening-editor-input";
      required.type = "number";
      required.min = "1";
      required.placeholder = "How many answers are required?";
      required.value = String(q.meta.required_count || 2);
      required.oninput = () => {
        const meta = { ...(q.meta || {}), required_count: Math.max(1, Number(required.value || 1)) };
        AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { meta });
        ctx.onChange();
      };
      panel.appendChild(required);
    }

    const list = document.createElement("div");
    list.className = "listening-dynamic-list";
    options.forEach((optionText, optionIndex) => {
      const letter = letters(options)[optionIndex];
      const row = document.createElement("div");
      row.className = "listening-choice-row";

      const chooser = document.createElement("input");
      chooser.type = isMulti ? "checkbox" : "radio";
      chooser.name = `listen_choice_${ctx.sectionIndex}_${ctx.blockIndex}_${qIndex}`;
      chooser.checked = isMulti
        ? (Array.isArray(q.correct_answer) && q.correct_answer.includes(letter))
        : q.correct_answer === letter;
      chooser.onchange = () => {
        if (isMulti) {
          const set = new Set(Array.isArray(q.correct_answer) ? q.correct_answer : []);
          if (chooser.checked) set.add(letter);
          else set.delete(letter);
          AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, {
            correct_answer: Array.from(set).sort()
          });
        } else {
          AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { correct_answer: letter });
        }
        ctx.onChange();
      };
      row.appendChild(chooser);

      const input = document.createElement("input");
      input.className = "listening-editor-input";
      input.type = "text";
      input.placeholder = `Option ${letter}`;
      input.value = optionText;
      input.oninput = () => {
        const nextOptions = [...options];
        nextOptions[optionIndex] = input.value;
        AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, {
          meta: { ...(q.meta || {}), options: nextOptions }
        });
        ctx.onChange();
      };
      row.appendChild(input);
      list.appendChild(row);
    });
    panel.appendChild(list);

    const controls = document.createElement("div");
    controls.className = "listening-question-controls";

    const addOption = document.createElement("button");
    addOption.type = "button";
    addOption.className = "listening-secondary-btn";
    addOption.textContent = "Add option";
    addOption.onclick = () => {
      const nextOptions = [...(q.meta.options || []), ""];
      AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, {
        meta: { ...(q.meta || {}), options: nextOptions }
      });
      ctx.onRebuild();
    };
    controls.appendChild(addOption);

    const removeOption = document.createElement("button");
    removeOption.type = "button";
    removeOption.className = "listening-secondary-btn";
    removeOption.textContent = "Remove option";
    removeOption.onclick = () => {
      const currentOptions = [...(q.meta.options || [])];
      if (currentOptions.length <= 2) return;
      const removedLetter = letters(currentOptions).at(-1);
      const nextOptions = currentOptions.slice(0, -1);
      const nextAnswer = isMulti
        ? (q.correct_answer || []).filter((v) => v !== removedLetter)
        : (q.correct_answer === removedLetter ? "" : q.correct_answer);
      AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, {
        correct_answer: nextAnswer,
        meta: { ...(q.meta || {}), options: nextOptions }
      });
      ctx.onRebuild();
    };
    controls.appendChild(removeOption);

    panel.appendChild(controls);
    return panel;
  }

  AdminListeningTypeChoice.hydrate = hydrate;

  AdminListeningTypeChoice.render = function (ctx) {
    const block = ctx.block;
    hydrate(block);
    const isMulti = block.type === "mcq_multiple";

    const wrap = document.createElement("div");
    wrap.className = "listening-type-panel";

    (block.questions || []).forEach((q, qIndex) => {
      wrap.appendChild(renderQuestion(ctx, q, qIndex, isMulti));
    });

    return wrap;
  };

  AdminListeningTypeChoice.serialize = function (block) {
    hydrate(block);
    return (block.questions || []).map((q, index) => ({
      order_index: index + 1,
      question_number: Number(q.number || 0),
      type: block.type,
      content: { text: q.content || "" },
      correct_answer: block.type === "mcq_multiple"
        ? { values: Array.isArray(q.correct_answer) ? q.correct_answer : [] }
        : { text: q.correct_answer || "" },
      meta: q.meta || {}
    }));
  };

  AdminListeningTypeChoice.validate = function (block) {
    hydrate(block);
    const errors = [];

    (block.questions || []).forEach((q, index) => {
      const options = q.meta?.options || [];
      if (!String(q.content || "").trim()) errors.push(`Add the student question for item ${index + 1}.`);
      if (options.filter((opt) => String(opt || "").trim()).length < 2) {
        errors.push(`Add at least two options for item ${index + 1}.`);
      }

      if (block.type === "mcq_multiple") {
        const required = Number(q.meta?.required_count || 0);
        const selected = Array.isArray(q.correct_answer) ? q.correct_answer : [];
        if (!required) errors.push(`Choose how many answers are required for item ${index + 1}.`);
        if (selected.length !== required) {
          errors.push(`Choose exactly ${required || "the required number of"} correct answers for item ${index + 1}.`);
        }
      } else if (!q.correct_answer) {
        errors.push(`Choose the correct answer for item ${index + 1}.`);
      }
    });

    return errors;
  };
})();
