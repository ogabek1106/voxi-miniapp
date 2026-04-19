// frontend/js/listening/admin_listening/question_types/structured_completion.js
window.AdminListeningTypeStructuredCompletion = window.AdminListeningTypeStructuredCompletion || {};

AdminListeningTypeStructuredCompletion.render = function (ctx) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "8px";

  const block = ctx.block;
  const sectionIndex = ctx.sectionIndex;
  const blockIndex = ctx.blockIndex;

  if (!block.meta) block.meta = {};
  if (!block.meta.structure_text) block.meta.structure_text = "";

  const heading = document.createElement("label");
  heading.textContent = "Structure template (table/flowchart draft)";
  heading.style.fontSize = "12px";
  heading.style.opacity = "0.8";
  wrap.appendChild(heading);

  const structure = document.createElement("textarea");
  structure.value = block.meta.structure_text || "";
  structure.rows = 4;
  structure.style.width = "100%";
  structure.style.boxSizing = "border-box";
  structure.style.padding = "8px";
  structure.oninput = () => {
    block.meta.structure_text = structure.value;
    ctx.onChange();
  };
  wrap.appendChild(structure);

  (block.questions || []).forEach((q, qIndex) => {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "90px 1fr 1fr";
    row.style.gap = "6px";
    row.style.alignItems = "center";

    const label = document.createElement("div");
    label.textContent = `Q${q.number || "?"}`;
    label.style.fontWeight = "600";
    row.appendChild(label);

    const prompt = document.createElement("input");
    prompt.type = "text";
    prompt.placeholder = "Cell/node prompt";
    prompt.value = q.content || "";
    prompt.oninput = () => {
      AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, { content: prompt.value });
      ctx.onChange();
    };
    row.appendChild(prompt);

    const answer = document.createElement("input");
    answer.type = "text";
    answer.placeholder = "Correct answer";
    answer.value = q.correct_answer || "";
    answer.oninput = () => {
      AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, { correct_answer: answer.value });
      ctx.onChange();
    };
    row.appendChild(answer);

    wrap.appendChild(row);
  });

  return wrap;
};

