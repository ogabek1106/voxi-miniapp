// frontend/js/listening/admin_listening/question_types/text_completion.js
window.AdminListeningTypeTextCompletion = window.AdminListeningTypeTextCompletion || {};

AdminListeningTypeTextCompletion.render = function (ctx) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "8px";

  const block = ctx.block;
  const sectionIndex = ctx.sectionIndex;
  const blockIndex = ctx.blockIndex;

  if (!block.meta) block.meta = {};
  if (!block.meta.template_text) block.meta.template_text = "";

  const label = document.createElement("label");
  label.textContent = "Template text (use [[1]], [[2]], [[3]] tokens)";
  label.style.fontSize = "12px";
  label.style.opacity = "0.8";
  wrap.appendChild(label);

  const template = document.createElement("textarea");
  template.value = block.meta.template_text || "";
  template.rows = 4;
  template.style.width = "100%";
  template.style.boxSizing = "border-box";
  template.style.padding = "8px";
  template.oninput = () => {
    block.meta.template_text = template.value;
    ctx.onChange();
  };
  wrap.appendChild(template);

  (block.questions || []).forEach((q, qIndex) => {
    const card = document.createElement("div");
    card.style.border = "1px solid var(--border-color)";
    card.style.borderRadius = "8px";
    card.style.padding = "8px";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "6px";

    const title = document.createElement("div");
    title.textContent = `Q${q.number || "?"} Token [[${qIndex + 1}]]`;
    title.style.fontWeight = "600";
    title.style.fontSize = "13px";
    card.appendChild(title);

    const answer = document.createElement("input");
    answer.type = "text";
    answer.placeholder = "Correct answer";
    answer.value = q.correct_answer || "";
    answer.oninput = () => {
      AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, { correct_answer: answer.value });
      ctx.onChange();
    };
    card.appendChild(answer);

    const variants = document.createElement("input");
    variants.type = "text";
    variants.placeholder = "Accepted variants (comma separated)";
    variants.value = (q.meta?.variants || []).join(", ");
    variants.oninput = () => {
      const nextMeta = { ...(q.meta || {}) };
      nextMeta.variants = variants.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, { meta: nextMeta });
      ctx.onChange();
    };
    card.appendChild(variants);

    wrap.appendChild(card);
  });

  return wrap;
};

