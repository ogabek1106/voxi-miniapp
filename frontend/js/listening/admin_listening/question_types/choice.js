// frontend/js/listening/admin_listening/question_types/choice.js
window.AdminListeningTypeChoice = window.AdminListeningTypeChoice || {};

AdminListeningTypeChoice.render = function (ctx) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "10px";

  const block = ctx.block;
  const sectionIndex = ctx.sectionIndex;
  const blockIndex = ctx.blockIndex;
  const onRebuild = ctx.onRebuild || ctx.onChange;
  const isMulti = block.type === "mcq_multiple";

  (block.questions || []).forEach((q, qIndex) => {
    const card = document.createElement("div");
    card.style.border = "1px solid var(--border-color)";
    card.style.borderRadius = "8px";
    card.style.padding = "8px";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "6px";

    const title = document.createElement("div");
    title.textContent = `Q${q.number || "?"}`;
    title.style.fontWeight = "600";
    card.appendChild(title);

    const prompt = document.createElement("textarea");
    prompt.rows = 2;
    prompt.placeholder = "Question text";
    prompt.value = q.content || "";
    prompt.oninput = () => {
      AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, { content: prompt.value });
      ctx.onChange();
    };
    card.appendChild(prompt);

    const options = Array.isArray(q.meta?.options) && q.meta.options.length ? q.meta.options : ["", ""];
    const selected = isMulti
      ? (Array.isArray(q.correct_answer) ? q.correct_answer.map((v) => Number(v)) : [])
      : Number.isInteger(q.correct_answer) ? q.correct_answer : 0;

    options.forEach((opt, optIndex) => {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "28px 1fr";
      row.style.gap = "6px";
      row.style.alignItems = "center";

      const chooser = document.createElement("input");
      chooser.type = isMulti ? "checkbox" : "radio";
      chooser.name = `listen_choice_${sectionIndex}_${blockIndex}_${qIndex}`;
      chooser.checked = isMulti ? selected.includes(optIndex) : selected === optIndex;
      chooser.onchange = () => {
        const nextMeta = { ...(q.meta || {}), options: [...options] };
        if (isMulti) {
          const set = new Set(Array.isArray(q.correct_answer) ? q.correct_answer : []);
          if (chooser.checked) set.add(optIndex);
          else set.delete(optIndex);
          AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, {
            correct_answer: Array.from(set).sort((a, b) => a - b),
            meta: nextMeta
          });
        } else {
          AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, {
            correct_answer: optIndex,
            meta: nextMeta
          });
        }
        ctx.onChange();
      };
      row.appendChild(chooser);

      const optInput = document.createElement("input");
      optInput.type = "text";
      optInput.placeholder = `Option ${optIndex + 1}`;
      optInput.value = opt;
      optInput.oninput = () => {
        const nextOptions = [...options];
        nextOptions[optIndex] = optInput.value;
        const nextMeta = { ...(q.meta || {}), options: nextOptions };
        AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, { meta: nextMeta });
        ctx.onChange();
      };
      row.appendChild(optInput);

      card.appendChild(row);
    });

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "6px";

    const addOpt = document.createElement("button");
    addOpt.type = "button";
    addOpt.textContent = "Add option";
    addOpt.onclick = () => {
      const nextOptions = [...options, ""];
      const nextMeta = { ...(q.meta || {}), options: nextOptions };
      AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, { meta: nextMeta });
      onRebuild();
    };
    controls.appendChild(addOpt);

    const removeOpt = document.createElement("button");
    removeOpt.type = "button";
    removeOpt.textContent = "Remove option";
    removeOpt.onclick = () => {
      if (options.length <= 2) return;
      const nextOptions = options.slice(0, -1);
      let nextAnswer = q.correct_answer;
      if (isMulti) {
        nextAnswer = (Array.isArray(q.correct_answer) ? q.correct_answer : [])
          .filter((idx) => idx < nextOptions.length);
      } else if (Number(nextAnswer) >= nextOptions.length) {
        nextAnswer = 0;
      }
      const nextMeta = { ...(q.meta || {}), options: nextOptions };
      AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, {
        meta: nextMeta,
        correct_answer: nextAnswer
      });
      onRebuild();
    };
    controls.appendChild(removeOpt);
    card.appendChild(controls);

    wrap.appendChild(card);
  });

  return wrap;
};
