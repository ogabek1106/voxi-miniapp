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
    const audioLabel = document.createElement("label");
    audioLabel.className = "listening-field-label";
    audioLabel.innerHTML = `Upload audio for Part ${sectionIndex + 1} <span>(mandatory)</span>`;
    audioField.appendChild(audioLabel);
    const audioInput = document.createElement("input");
    audioInput.type = "file";
    audioInput.accept = "audio/*";
    audioInput.hidden = true;
    audioInput.id = `listening-part-audio-${section.id || sectionIndex}`;
    audioInput.onchange = () => {
      const file = audioInput.files?.[0] || null;
      AdminListeningState.updateSectionAudio(sectionIndex, file);
      onChange();
      onRebuild();
    };
    audioField.appendChild(audioInput);
    if (section.audio?.name) {
      const audioRemove = document.createElement("button");
      audioRemove.type = "button";
      audioRemove.className = "listening-secondary-btn listening-danger-btn";
      audioRemove.textContent = "Remove audio";
      audioRemove.onclick = () => {
        AdminListeningState.updateSectionAudio(sectionIndex, null);
        onChange();
        onRebuild();
      };
      audioField.appendChild(audioRemove);
    } else {
      const audioChoose = document.createElement("label");
      audioChoose.className = "listening-secondary-btn";
      audioChoose.setAttribute("for", audioInput.id);
      audioChoose.textContent = "Choose audio";
      audioField.appendChild(audioChoose);
    }
    const audioMeta = document.createElement("div");
    audioMeta.className = "listening-help-text";
    audioMeta.textContent = section.audio?.name
      ? `Selected audio: ${section.audio.name}`
      : "No part audio selected yet.";
    audioField.appendChild(audioMeta);
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

    const globalInstructionAfter = document.createElement("textarea");
    globalInstructionAfter.rows = 2;
    globalInstructionAfter.className = "listening-editor-input listening-global-between";
    globalInstructionAfter.placeholder = `Global Instruction ${sectionIndex + 2}: Example: You now have some time to look at the next questions.`;
    globalInstructionAfter.value = section.global_instruction_after || section.global_instruction_2 || "";
    globalInstructionAfter.oninput = () => {
      AdminListeningState.updateSectionGlobalInstructionAfter(sectionIndex, globalInstructionAfter.value);
      onChange();
    };
    const globalInstructionHelp = document.createElement("div");
    globalInstructionHelp.className = "listening-help-text";
    globalInstructionHelp.textContent = `This instruction stays after Part ${sectionIndex + 1}. Write text, upload audio, or use both.`;

    const globalAudioField = document.createElement("div");
    globalAudioField.className = "listening-upload-field";
    const globalAudioLabel = document.createElement("label");
    globalAudioLabel.className = "listening-field-label";
    globalAudioLabel.textContent = `Global Instruction ${sectionIndex + 2} audio`;
    globalAudioField.appendChild(globalAudioLabel);

    const globalAudioInput = document.createElement("input");
    globalAudioInput.type = "file";
    globalAudioInput.accept = "audio/*";
    globalAudioInput.hidden = true;
    globalAudioInput.id = `listening-global-after-audio-${section.id || sectionIndex}`;
    globalAudioInput.onchange = () => {
      const file = globalAudioInput.files?.[0] || null;
      AdminListeningState.updateSectionGlobalInstructionAfterAudio(sectionIndex, file);
      onChange();
      onRebuild();
    };
    globalAudioField.appendChild(globalAudioInput);

    if (section.global_instruction_after_audio?.name) {
      const globalAudioRemove = document.createElement("button");
      globalAudioRemove.type = "button";
      globalAudioRemove.className = "listening-secondary-btn listening-danger-btn";
      globalAudioRemove.textContent = "Remove audio";
      globalAudioRemove.onclick = () => {
        AdminListeningState.updateSectionGlobalInstructionAfterAudio(sectionIndex, null);
        onChange();
        onRebuild();
      };
      globalAudioField.appendChild(globalAudioRemove);
    } else {
      const globalAudioChoose = document.createElement("label");
      globalAudioChoose.className = "listening-secondary-btn";
      globalAudioChoose.setAttribute("for", globalAudioInput.id);
      globalAudioChoose.textContent = "Choose audio";
      globalAudioField.appendChild(globalAudioChoose);
    }

    const globalAudioMeta = document.createElement("div");
    globalAudioMeta.className = "listening-help-text";
    globalAudioMeta.textContent = section.global_instruction_after_audio?.name
      ? `Selected audio: ${section.global_instruction_after_audio.name}`
      : "No instruction audio selected yet.";
    globalAudioField.appendChild(globalAudioMeta);

    card.appendChild(globalInstructionAfter);
    card.appendChild(globalAudioField);
    card.appendChild(globalInstructionHelp);

    root.appendChild(card);
  });
};
