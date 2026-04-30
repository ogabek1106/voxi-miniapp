// frontend/js/listening/admin_listening/question_types/visual_labeling.js
window.AdminListeningTypeVisualLabeling = window.AdminListeningTypeVisualLabeling || {};

(function () {
  function hydrate(block) {
    if (!block.meta) block.meta = {};
    if (!block.meta.answer_mode) block.meta.answer_mode = "text";
    AdminListeningUtils.ensureQuestionCount(block, Math.max(1, block.questions?.length || 1));
  }

  function labelForType(type) {
    if (type === "diagram_label" || type === "diagram_labeling") return "diagram";
    if (type === "plan_label") return "plan";
    return "map";
  }

  AdminListeningTypeVisualLabeling.hydrate = hydrate;

  AdminListeningTypeVisualLabeling.render = function (ctx) {
    const block = ctx.block;
    hydrate(block);
    const wrap = document.createElement("div");
    wrap.className = "listening-type-panel";

    const helper = document.createElement("div");
    helper.className = "listening-help-text";
    helper.textContent = `Upload a ${labelForType(block.type)} image in the static visual field, then add labels and answers here.`;
    wrap.appendChild(helper);

    const mode = document.createElement("select");
    mode.className = "listening-editor-input";
    ["text", "dropdown"].forEach((value) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value === "text" ? "Text answer mode" : "Dropdown option mode";
      if (value === block.meta.answer_mode) opt.selected = true;
      mode.appendChild(opt);
    });
    mode.onchange = () => {
      block.meta.answer_mode = mode.value;
      ctx.onChange();
    };
    wrap.appendChild(mode);

    const list = document.createElement("div");
    list.className = "listening-dynamic-list";
    (block.questions || []).forEach((q, qIndex) => {
      const row = document.createElement("div");
      row.className = "listening-dynamic-row";
      row.innerHTML = `<div class="listening-row-title">Label ${qIndex + 1}</div>`;

      const marker = document.createElement("input");
      marker.className = "listening-editor-input";
      marker.type = "text";
      marker.placeholder = "Label marker, e.g. Q1 or A";
      marker.value = q.content || "";
      marker.oninput = () => {
        AdminListeningState.updateQuestion(ctx.sectionIndex, ctx.blockIndex, qIndex, { content: marker.value });
        ctx.onChange();
      };
      row.appendChild(marker);

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

    const add = document.createElement("button");
    add.type = "button";
    add.className = "listening-secondary-btn";
    add.textContent = "Add label";
    add.onclick = () => {
      AdminListeningState.addQuestion(ctx.sectionIndex, ctx.blockIndex);
      ctx.onRebuild();
    };
    wrap.appendChild(add);
    return wrap;
  };

  AdminListeningTypeVisualLabeling.serialize = function (block) {
    hydrate(block);
    return (block.questions || []).map((q, index) => ({
      order_index: index + 1,
      question_number: Number(q.number || 0),
      type: block.type,
      content: { text: q.content || "" },
      correct_answer: { text: q.correct_answer || "" },
      meta: { ...(q.meta || {}), answer_mode: block.meta.answer_mode || "text" }
    }));
  };

  AdminListeningTypeVisualLabeling.validate = function (block) {
    hydrate(block);
    const errors = [];
    if (!block.image?.file && !block.image?.url && !block.image?.preview_url) {
      errors.push(block.type === "diagram_label" || block.type === "diagram_labeling"
        ? "Upload an image for diagram labelling."
        : "Upload an image for map labelling.");
    }
    (block.questions || []).forEach((q, index) => {
      if (!String(q.content || "").trim()) errors.push(`Add label marker ${index + 1}.`);
      if (!String(q.correct_answer || "").trim()) errors.push(`Add the correct answer for label ${index + 1}.`);
    });
    return errors;
  };
})();
