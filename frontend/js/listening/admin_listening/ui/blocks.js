// frontend/js/listening/admin_listening/ui/blocks.js
window.AdminListeningBlocks = window.AdminListeningBlocks || {};

AdminListeningBlocks.renderBlock = function (ctx) {
  const sectionIndex = ctx.sectionIndex;
  const blockIndex = ctx.blockIndex;
  const block = ctx.block;
  const onChange = ctx.onChange;
  const onRebuild = ctx.onRebuild || onChange;

  const card = document.createElement("div");
  card.style.border = "1px solid var(--border-color)";
  card.style.borderRadius = "10px";
  card.style.padding = "10px";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "8px";
  card.style.background = "var(--card-bg)";

  const head = document.createElement("div");
  head.style.display = "flex";
  head.style.justifyContent = "space-between";
  head.style.alignItems = "center";
  head.innerHTML = `<strong>Block ${block.order_index || blockIndex + 1}</strong>`;
  card.appendChild(head);

  const typeSelect = document.createElement("select");
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
  blockInstructions.placeholder = "Block instructions (optional)";
  blockInstructions.value = block.instructions || "";
  blockInstructions.oninput = () => {
    AdminListeningState.updateBlock(sectionIndex, blockIndex, { instructions: blockInstructions.value });
    onChange();
  };
  card.appendChild(blockInstructions);

  const timeRow = document.createElement("div");
  timeRow.style.display = "grid";
  timeRow.style.gridTemplateColumns = "1fr 1fr";
  timeRow.style.gap = "8px";

  const startInput = document.createElement("input");
  startInput.type = "text";
  startInput.placeholder = "Start time (optional, e.g. 00:35)";
  startInput.value = block.start_time || "";
  startInput.oninput = () => {
    AdminListeningState.updateBlock(sectionIndex, blockIndex, { start_time: startInput.value });
    onChange();
  };
  timeRow.appendChild(startInput);

  const endInput = document.createElement("input");
  endInput.type = "text";
  endInput.placeholder = "End time (optional, e.g. 02:10)";
  endInput.value = block.end_time || "";
  endInput.oninput = () => {
    AdminListeningState.updateBlock(sectionIndex, blockIndex, { end_time: endInput.value });
    onChange();
  };
  timeRow.appendChild(endInput);
  card.appendChild(timeRow);

  const imageRow = document.createElement("div");
  imageRow.style.display = "flex";
  imageRow.style.flexDirection = "column";
  imageRow.style.gap = "6px";
  const imageLabel = document.createElement("label");
  imageLabel.textContent = "Block image (optional)";
  imageLabel.style.fontSize = "12px";
  imageLabel.style.opacity = "0.8";
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
  if (block.image?.name) {
    const imageMeta = document.createElement("div");
    imageMeta.textContent = `Selected image: ${block.image.name}`;
    imageMeta.style.fontSize = "12px";
    imageMeta.style.opacity = "0.7";
    imageRow.appendChild(imageMeta);
  }
  card.appendChild(imageRow);

  const typeEditorHost = document.createElement("div");
  typeEditorHost.style.display = "flex";
  typeEditorHost.style.flexDirection = "column";
  typeEditorHost.style.gap = "8px";
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
  controls.style.display = "flex";
  controls.style.flexWrap = "wrap";
  controls.style.gap = "6px";

  const addQ = document.createElement("button");
  addQ.type = "button";
  addQ.textContent = "Add question";
  addQ.onclick = () => {
    AdminListeningState.addQuestion(sectionIndex, blockIndex);
    onRebuild();
  };
  controls.appendChild(addQ);

  const removeQ = document.createElement("button");
  removeQ.type = "button";
  removeQ.textContent = "Remove last question";
  removeQ.onclick = () => {
    AdminListeningState.removeLastQuestion(sectionIndex, blockIndex);
    onRebuild();
  };
  controls.appendChild(removeQ);

  const removeBlock = document.createElement("button");
  removeBlock.type = "button";
  removeBlock.textContent = "Remove block";
  removeBlock.onclick = () => {
    AdminListeningState.removeBlock(sectionIndex, blockIndex);
    onRebuild();
  };
  controls.appendChild(removeBlock);

  card.appendChild(controls);
  return card;
};
