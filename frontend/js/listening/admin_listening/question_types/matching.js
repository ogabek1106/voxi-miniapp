// frontend/js/listening/admin_listening/question_types/matching.js
window.AdminListeningTypeMatching = window.AdminListeningTypeMatching || {};

AdminListeningTypeMatching.render = function (ctx) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "8px";

  const block = ctx.block;
  const sectionIndex = ctx.sectionIndex;
  const blockIndex = ctx.blockIndex;
  if (!block.meta) block.meta = {};
  if (!block.meta.option_bank) block.meta.option_bank = "";

  const bankLabel = document.createElement("label");
  bankLabel.textContent = "Shared option bank (one option per line)";
  bankLabel.style.fontSize = "12px";
  bankLabel.style.opacity = "0.8";
  wrap.appendChild(bankLabel);

  const bank = document.createElement("textarea");
  bank.rows = 4;
  bank.value = block.meta.option_bank || "";
  bank.oninput = () => {
    block.meta.option_bank = bank.value;
    ctx.onChange();
  };
  wrap.appendChild(bank);

  (block.questions || []).forEach((q, qIndex) => {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "80px 1fr 180px";
    row.style.gap = "6px";
    row.style.alignItems = "center";

    const qLabel = document.createElement("div");
    qLabel.textContent = `Q${q.number || "?"}`;
    qLabel.style.fontWeight = "600";
    row.appendChild(qLabel);

    const prompt = document.createElement("input");
    prompt.type = "text";
    prompt.placeholder = "Prompt";
    prompt.value = q.content || "";
    prompt.oninput = () => {
      AdminListeningState.updateQuestion(sectionIndex, blockIndex, qIndex, { content: prompt.value });
      ctx.onChange();
    };
    row.appendChild(prompt);

    const answer = document.createElement("input");
    answer.type = "text";
    answer.placeholder = "Mapped option key";
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

