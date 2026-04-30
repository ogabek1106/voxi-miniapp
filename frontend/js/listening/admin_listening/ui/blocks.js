// frontend/js/listening/admin_listening/ui/blocks.js
window.AdminListeningBlocks = window.AdminListeningBlocks || {};

AdminListeningBlocks.renderBlock = function (ctx) {
  const sectionIndex = ctx.sectionIndex;
  const blockIndex = ctx.blockIndex;
  const block = ctx.block;
  const onChange = ctx.onChange;
  const onRebuild = ctx.onRebuild || onChange;

  const card = document.createElement("div");
  card.className = "listening-question-block";

  const head = document.createElement("div");
  head.className = "listening-question-block-head";
  head.innerHTML = `<strong>Question block ${block.order_index || blockIndex + 1}</strong>`;
  const removeBlockTop = document.createElement("button");
  removeBlockTop.type = "button";
  removeBlockTop.className = "listening-delete-btn";
  removeBlockTop.setAttribute("aria-label", `Delete question block ${blockIndex + 1}`);
  removeBlockTop.textContent = "×";
  removeBlockTop.onclick = () => {
    AdminListeningState.removeBlock(sectionIndex, blockIndex);
    onRebuild();
  };
  head.appendChild(removeBlockTop);
  card.appendChild(head);

  const typeSelect = document.createElement("select");
  typeSelect.className = "listening-editor-input";
  (window.AdminListeningConstants?.BLOCK_TYPES || []).forEach((type) => {
    const opt = document.createElement("option");
    opt.value = type.value;
    opt.textContent = type.label;
    if (type.value === block.type) opt.selected = true;
    typeSelect.appendChild(opt);
  });
  typeSelect.onchange = () => {
    AdminListeningState.setBlockType(sectionIndex, blockIndex, typeSelect.value);
    onRebuild();
  };
  card.appendChild(typeSelect);

  const blockInstructions = document.createElement("textarea");
  blockInstructions.rows = 2;
  blockInstructions.className = "listening-editor-input";
  blockInstructions.placeholder = "Instructions for this block";
  blockInstructions.value = block.instructions || "";
  blockInstructions.oninput = () => {
    AdminListeningState.updateBlock(sectionIndex, blockIndex, { instructions: blockInstructions.value });
    onChange();
  };
  card.appendChild(blockInstructions);

  const timeRow = document.createElement("div");
  timeRow.className = "listening-time-row";

  const startInput = document.createElement("input");
  startInput.type = "text";
  startInput.className = "listening-editor-input";
  startInput.placeholder = "Audio starts at, e.g. 00:35";
  startInput.value = block.start_time || "";
  startInput.oninput = () => {
    AdminListeningState.updateBlock(sectionIndex, blockIndex, { start_time: startInput.value });
    onChange();
  };
  timeRow.appendChild(startInput);

  const endInput = document.createElement("input");
  endInput.type = "text";
  endInput.className = "listening-editor-input";
  endInput.placeholder = "Audio ends at, e.g. 02:10";
  endInput.value = block.end_time || "";
  endInput.oninput = () => {
    AdminListeningState.updateBlock(sectionIndex, blockIndex, { end_time: endInput.value });
    onChange();
  };
  timeRow.appendChild(endInput);
  card.appendChild(timeRow);

  const imageRow = document.createElement("div");
  imageRow.className = "listening-upload-field";
  const imageLabel = document.createElement("label");
  imageLabel.textContent = "Visual for this question block";
  imageLabel.className = "listening-field-label";
  imageRow.appendChild(imageLabel);
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/*";
  imageInput.onchange = () => {
    const file = imageInput.files?.[0] || null;
    AdminListeningState.setBlockImage(sectionIndex, blockIndex, file);
    onRebuild();
  };
  imageRow.appendChild(imageInput);
  const imageHelp = document.createElement("div");
  imageHelp.className = "listening-help-text";
  imageHelp.textContent = "Use this for maps, diagrams, tables, or picture-based questions.";
  imageRow.appendChild(imageHelp);
  if (block.image?.name) {
    const imageMeta = document.createElement("div");
    imageMeta.textContent = `Selected image: ${block.image.name}`;
    imageMeta.className = "listening-help-text";
    imageRow.appendChild(imageMeta);
  }
  card.appendChild(imageRow);

  const typeEditorHost = document.createElement("div");
  typeEditorHost.className = "listening-type-editor-host";
  const typeEditor = window.AdminListeningTypeRegistry?.renderTypeEditor({
    block,
    sectionIndex,
    blockIndex,
    onChange,
    onRebuild
  });
  if (typeEditor) typeEditorHost.appendChild(typeEditor);
  card.appendChild(typeEditorHost);

  const controls = document.createElement("div");
  controls.className = "listening-question-controls";

  const addQ = document.createElement("button");
  addQ.type = "button";
  addQ.className = "listening-secondary-btn";
  addQ.textContent = "Add question";
  addQ.onclick = () => {
    AdminListeningState.addQuestion(sectionIndex, blockIndex);
    onRebuild();
  };
  controls.appendChild(addQ);

  const removeQ = document.createElement("button");
  removeQ.type = "button";
  removeQ.className = "listening-secondary-btn";
  removeQ.textContent = "Remove last question";
  removeQ.onclick = () => {
    AdminListeningState.removeLastQuestion(sectionIndex, blockIndex);
    onRebuild();
  };
  controls.appendChild(removeQ);

  card.appendChild(controls);
  return card;
};
