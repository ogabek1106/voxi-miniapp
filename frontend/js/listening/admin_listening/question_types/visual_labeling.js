// frontend/js/listening/admin_listening/question_types/visual_labeling.js
window.AdminListeningTypeVisualLabeling = window.AdminListeningTypeVisualLabeling || {};

AdminListeningTypeVisualLabeling.render = function (ctx) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "8px";

  const block = ctx.block;
  const sectionIndex = ctx.sectionIndex;
  const blockIndex = ctx.blockIndex;
  if (!block.meta) block.meta = {};
  if (!block.meta.label_bank) block.meta.label_bank = "";

  const label = document.createElement("label");
  label.textContent = "Shared label bank (optional, one label per line)";
  label.style.fontSize = "12px";
  label.style.opacity = "0.8";
  wrap.appendChild(label);

  const bank = document.createElement("textarea");
  bank.rows = 3;
  bank.value = block.meta.label_bank || "";
  bank.oninput = () => {
    block.meta.label_bank = bank.value;
    ctx.onChange();
  };
  wrap.appendChild(bank);

  (block.questions || []).forEach((q, qIndex) => {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "80px 1fr 1fr";
    row.style.gap = "6px";
    row.style.alignItems = "center";

    const qLabel = document.createElement("div");
    qLabel.textContent = `Q${q.number || "?"}`;
    qLabel.style.fontWeight = "600";
    row.appendChild(qLabel);

    const target = document.createElement("input");
    target.type = "text";
    target.placeholder = "Target marker";
    target.value = q.content || "";
    target.oninput = () => {
      AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, { content: target.value });
      ctx.onChange();
    };
    row.appendChild(target);

    const answer = document.createElement("input");
    answer.type = "text";
    answer.placeholder = "Correct label";
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

