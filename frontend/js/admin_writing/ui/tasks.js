window.AdminWritingUI = window.AdminWritingUI || {};

AdminWritingUI.ADD_OPTION_VALUE = "__ADD_WRITING_INSTRUCTION__";
AdminWritingUI.STORAGE_KEY = "admin_writing_custom_instructions_v1";

AdminWritingUI.escapeHtml = function (value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

AdminWritingUI.readCustomInstructions = function () {
  try {
    const raw = localStorage.getItem(AdminWritingUI.STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
};

AdminWritingUI.writeCustomInstructions = function (data) {
  try {
    localStorage.setItem(AdminWritingUI.STORAGE_KEY, JSON.stringify(data || {}));
  } catch (_) {}
};

AdminWritingUI.getTaskInstructionKey = function (taskNumber) {
  return `TASK_${Number(taskNumber || 0) || 1}`;
};

AdminWritingUI.getCustomInstructionList = function (taskNumber) {
  const storage = AdminWritingUI.readCustomInstructions();
  const key = AdminWritingUI.getTaskInstructionKey(taskNumber);
  const list = Array.isArray(storage[key]) ? storage[key] : [];
  const unique = [];
  const seen = new Set();
  list.forEach((item) => {
    const value = String(item || "").trim();
    if (!value) return;
    const token = value.toLowerCase();
    if (seen.has(token)) return;
    seen.add(token);
    unique.push(value);
  });
  return unique;
};

AdminWritingUI.addCustomInstruction = function (taskNumber, text) {
  const value = String(text || "").trim();
  if (!value) return false;

  const storage = AdminWritingUI.readCustomInstructions();
  const key = AdminWritingUI.getTaskInstructionKey(taskNumber);
  const current = Array.isArray(storage[key]) ? storage[key] : [];

  const token = value.toLowerCase();
  if (current.some((item) => String(item || "").trim().toLowerCase() === token)) {
    return true;
  }

  storage[key] = [...current, value];
  AdminWritingUI.writeCustomInstructions(storage);
  return true;
};

AdminWritingUI.renderInstructionOptions = function (taskNumber, selected = "") {
  const normalizedSelected = String(selected || "").trim();
  if (normalizedSelected) {
    AdminWritingUI.addCustomInstruction(taskNumber, normalizedSelected);
  }

  const list = AdminWritingUI.getCustomInstructionList(taskNumber);
  const selectedExists = normalizedSelected && list.some((item) => item === normalizedSelected);

  return [
    `<option value="">Select instruction</option>`,
    ...list.map((item) => {
      const safe = AdminWritingUI.escapeHtml(item);
      const chosen = item === normalizedSelected ? "selected" : "";
      return `<option value="${safe}" ${chosen}>${safe}</option>`;
    }),
    ...(normalizedSelected && !selectedExists ? [
      `<option value="${AdminWritingUI.escapeHtml(normalizedSelected)}" selected>${AdminWritingUI.escapeHtml(normalizedSelected)}</option>`
    ] : []),
    `<option value="${AdminWritingUI.ADD_OPTION_VALUE}">Add instruction...</option>`
  ].join("");
};

AdminWritingUI.renderTaskCard = function (taskNumber, taskData = {}) {
  const instruction = String(taskData.instruction_template || "").trim();
  const question = String(taskData.question_text || "").trim();
  const imageUrl = String(taskData.image_url || "").trim();
  const preview = imageUrl ? `${window.API}${imageUrl}` : "";

  return `
    <div class="writing-task-card" data-task-number="${taskNumber}" style="text-align:left;">
      <div class="writing-task-header">
        <div class="writing-task-number">Task ${taskNumber}</div>
      </div>

      <label>Instruction template</label>
      <select class="writing-instruction-select" style="width:100%; height:36px;">
        ${AdminWritingUI.renderInstructionOptions(taskNumber, instruction)}
      </select>
      <input
        type="text"
        class="writing-instruction-custom"
        placeholder="Type new instruction and press Enter"
        style="width:100%; height:36px; margin-top:6px; display:none;"
      />

      <label style="margin-top:8px; display:block;">Question</label>
      <textarea class="writing-question-text" rows="5" style="width:100%; max-width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #e5e5ea;">${AdminWritingUI.escapeHtml(question)}</textarea>

      <div class="writing-image-wrap" data-image-url="${AdminWritingUI.escapeHtml(imageUrl)}" style="margin-top:10px;">
        <button type="button" class="writing-upload-btn">Upload image</button>
        <input type="file" class="writing-upload-input" accept="image/*" style="display:none;" />
        <div class="writing-image-preview" style="margin-top:8px; ${preview ? "" : "display:none;"}">
          <img src="${AdminWritingUI.escapeHtml(preview)}" alt="Task image" style="width:100%; border-radius:10px;" />
        </div>
      </div>
    </div>
  `;
};

AdminWritingUI.bindInstructionPicker = function (taskCard) {
  if (!taskCard) return;

  const taskNumber = Number(taskCard.dataset.taskNumber || 0) || 1;
  const select = taskCard.querySelector(".writing-instruction-select");
  const customInput = taskCard.querySelector(".writing-instruction-custom");
  if (!select || !customInput) return;

  function hideCustomInput() {
    customInput.style.display = "none";
    customInput.value = "";
  }

  function showCustomInput() {
    customInput.style.display = "block";
    customInput.focus();
  }

  function rebuildOptions(selectedValue = "") {
    select.innerHTML = AdminWritingUI.renderInstructionOptions(taskNumber, selectedValue);
  }

  function commitCustomInstruction() {
    const value = String(customInput.value || "").trim();
    if (!value) return;
    AdminWritingUI.addCustomInstruction(taskNumber, value);
    rebuildOptions(value);
    hideCustomInput();
  }

  select.onchange = function () {
    if (select.value === AdminWritingUI.ADD_OPTION_VALUE) {
      showCustomInput();
      return;
    }
    hideCustomInput();
  };

  customInput.onkeydown = function (event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitCustomInstruction();
  };

  customInput.onblur = function () {
    commitCustomInstruction();
  };
};

AdminWritingUI.bindTaskUpload = function (taskCard) {
  if (!taskCard) return;

  const uploadBtn = taskCard.querySelector(".writing-upload-btn");
  const uploadInput = taskCard.querySelector(".writing-upload-input");
  const wrap = taskCard.querySelector(".writing-image-wrap");
  const preview = taskCard.querySelector(".writing-image-preview");

  if (!uploadBtn || !uploadInput || !wrap || !preview) return;

  uploadBtn.onclick = () => uploadInput.click();
  uploadInput.onchange = async () => {
    const file = uploadInput.files?.[0];
    if (!file) return;

    uploadBtn.disabled = true;
    const original = uploadBtn.textContent;
    uploadBtn.textContent = "Uploading...";

    try {
      const uploaded = await AdminWritingApi.uploadImageFile(file);
      wrap.dataset.imageUrl = uploaded.relativeUrl;
      preview.style.display = "block";
      preview.innerHTML = `<img src="${uploaded.fullUrl}" alt="Task image" style="width:100%; border-radius:10px;" />`;
    } catch (error) {
      console.error("Writing image upload error:", error);
      alert("Failed to upload image");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = original;
      uploadInput.value = "";
    }
  };
};

AdminWritingUI.readTaskData = function (taskCard, taskNumber) {
  const select = taskCard.querySelector(".writing-instruction-select");
  const customInput = taskCard.querySelector(".writing-instruction-custom");
  let instruction = String(select?.value || "").trim();

  if (instruction === AdminWritingUI.ADD_OPTION_VALUE) {
    instruction = String(customInput?.value || "").trim();
  }
  if (instruction) {
    AdminWritingUI.addCustomInstruction(taskNumber, instruction);
  }

  const question = String(taskCard.querySelector(".writing-question-text")?.value || "").trim();
  const imageUrl = String(taskCard.querySelector(".writing-image-wrap")?.dataset?.imageUrl || "").trim();

  return {
    task_number: taskNumber,
    order_index: taskNumber,
    instruction_template: instruction || null,
    question_text: question || null,
    image_url: imageUrl || null
  };
};
