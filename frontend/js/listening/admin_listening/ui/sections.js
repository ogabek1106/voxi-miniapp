// frontend/js/listening/admin_listening/ui/sections.js
window.AdminListeningSections = window.AdminListeningSections || {};

AdminListeningSections.render = function (root, onChange) {
  if (!root) return;
  root.innerHTML = "";

  const state = AdminListeningState.get();
  (state.sections || []).forEach((section, sectionIndex) => {
    const card = document.createElement("div");
    card.style.border = "1px solid var(--border-color)";
    card.style.borderRadius = "12px";
    card.style.padding = "10px";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "8px";

    const title = document.createElement("div");
    title.style.fontWeight = "700";
    title.textContent = `Section ${section.order_index || sectionIndex + 1}`;
    card.appendChild(title);

    const instructions = document.createElement("textarea");
    instructions.rows = 2;
    instructions.placeholder = "Section instructions (optional)";
    instructions.value = section.instructions || "";
    instructions.oninput = () => {
      AdminListeningState.updateSectionInstructions(sectionIndex, instructions.value);
      onChange();
    };
    card.appendChild(instructions);

    const sectionControls = document.createElement("div");
    sectionControls.style.display = "flex";
    sectionControls.style.gap = "6px";

    const addBlock = document.createElement("button");
    addBlock.type = "button";
    addBlock.textContent = "Add block";
    addBlock.onclick = () => {
      AdminListeningState.addBlock(sectionIndex);
      onChange();
    };
    sectionControls.appendChild(addBlock);

    const removeBlock = document.createElement("button");
    removeBlock.type = "button";
    removeBlock.textContent = "Remove last block";
    removeBlock.onclick = () => {
      AdminListeningState.removeLastBlock(sectionIndex);
      onChange();
    };
    sectionControls.appendChild(removeBlock);
    card.appendChild(sectionControls);

    const blocksWrap = document.createElement("div");
    blocksWrap.style.display = "flex";
    blocksWrap.style.flexDirection = "column";
    blocksWrap.style.gap = "8px";

    (section.blocks || []).forEach((block, blockIndex) => {
      const blockEl = AdminListeningBlocks.renderBlock({
        sectionIndex,
        blockIndex,
        block,
        onChange
      });
      blocksWrap.appendChild(blockEl);
    });

    card.appendChild(blocksWrap);
    root.appendChild(card);
  });
};

