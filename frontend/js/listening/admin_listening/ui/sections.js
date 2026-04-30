// frontend/js/listening/admin_listening/ui/sections.js
window.AdminListeningSections = window.AdminListeningSections || {};

AdminListeningSections.render = function (root, handlers) {
  const onChange = handlers?.onChange || function () {};
  const onRebuild = handlers?.onRebuild || function () {};
  if (!root) return;
  root.innerHTML = "";

  const state = AdminListeningState.get();
  const sections = state.sections || [];

  if (!sections.length) {
    const empty = document.createElement("div");
    empty.className = "listening-admin-card listening-empty-state";
    empty.textContent = "No blocks yet. Add Block to create Part 1.";
    root.appendChild(empty);
    return;
  }

  sections.forEach((section, sectionIndex) => {
    const card = document.createElement("div");
    card.className = "listening-admin-card listening-part-card";

    const head = document.createElement("div");
    head.className = "listening-part-head";

    const titleWrap = document.createElement("div");
    const eyebrow = document.createElement("div");
    eyebrow.className = "listening-part-eyebrow";
    eyebrow.textContent = `Block ${sectionIndex + 1}`;
    const title = document.createElement("div");
    title.className = "listening-part-title";
    title.textContent = `Part ${section.order_index || sectionIndex + 1}`;
    titleWrap.appendChild(eyebrow);
    titleWrap.appendChild(title);
    head.appendChild(titleWrap);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "listening-delete-btn";
    deleteBtn.setAttribute("aria-label", `Delete Part ${sectionIndex + 1}`);
    deleteBtn.textContent = "×";
    deleteBtn.onclick = () => {
      AdminListeningState.removeSection(sectionIndex);
      onRebuild();
    };
    head.appendChild(deleteBtn);
    card.appendChild(head);

    const instructions = document.createElement("textarea");
    instructions.rows = 2;
    instructions.className = "listening-editor-input";
    instructions.placeholder = `Instruction for Part ${sectionIndex + 1} (optional)`;
    instructions.value = section.instructions || "";
    instructions.oninput = () => {
      AdminListeningState.updateSectionInstructions(sectionIndex, instructions.value);
      onChange();
    };
    card.appendChild(instructions);

    const audioField = document.createElement("div");
    audioField.className = "listening-upload-field";
    audioField.innerHTML = `
      <label class="listening-field-label">Audio uploader for Part ${sectionIndex + 1} <span>(mandatory)</span></label>
      <input type="file" accept="audio/*" />
      <div class="listening-help-text">Visual placeholder. Per-part audio logic will be connected later.</div>
    `;
    card.appendChild(audioField);

    const imageField = document.createElement("div");
    imageField.className = "listening-upload-field";
    imageField.innerHTML = `
      <label class="listening-field-label">Image uploader <span>(optional)</span></label>
      <input type="file" accept="image/*" />
      <div class="listening-help-text">Optional visual for this part.</div>
    `;
    card.appendChild(imageField);

    const questionBlockWrap = document.createElement("div");
    questionBlockWrap.className = "listening-question-blocks";

    (section.blocks || []).forEach((block, blockIndex) => {
      const blockEl = AdminListeningBlocks.renderBlock({
        sectionIndex,
        blockIndex,
        block,
        onChange,
        onRebuild
      });
      questionBlockWrap.appendChild(blockEl);
    });

    card.appendChild(questionBlockWrap);

    const addQuestionBlock = document.createElement("button");
    addQuestionBlock.type = "button";
    addQuestionBlock.className = "listening-secondary-btn";
    addQuestionBlock.textContent = "Add question block";
    addQuestionBlock.onclick = () => {
      AdminListeningState.addBlock(sectionIndex);
      onRebuild();
    };
    card.appendChild(addQuestionBlock);

    const globalInstruction2 = document.createElement("textarea");
    globalInstruction2.rows = 2;
    globalInstruction2.className = "listening-editor-input listening-global-between";
    globalInstruction2.placeholder = "Add Global Instruction 2 (optional)";
    globalInstruction2.value = section.global_instruction_2 || "";
    globalInstruction2.oninput = () => {
      AdminListeningState.updateSectionGlobalInstruction2(sectionIndex, globalInstruction2.value);
      onChange();
    };
    card.appendChild(globalInstruction2);

    root.appendChild(card);
  });
};
