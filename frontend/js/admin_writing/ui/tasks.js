window.AdminWritingUI = window.AdminWritingUI || {};

AdminWritingUI.TASK_TEMPLATES = {
  1: [
    "The graph below shows information about...",
    "The chart below shows information about...",
    "The table below gives information about...",
    "The diagram below shows how...",
    "The maps below show changes in..."
  ],
  2: [
    "To what extent do you agree or disagree?",
    "Discuss both views and give your own opinion.",
    "What are the advantages and disadvantages?",
    "What are the causes of this problem and what solutions can you suggest?",
    "Some people believe... Others think... Discuss both views and give your opinion."
  ]
};

AdminWritingUI.escapeHtml = function (value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

AdminWritingUI.renderInstructionOptions = function (taskNumber, selected = "") {
  const list = AdminWritingUI.TASK_TEMPLATES[taskNumber] || [];
  return [
    `<option value="">Select instruction</option>`,
    ...list.map((item) => {
      const safe = AdminWritingUI.escapeHtml(item);
      const chosen = item === selected ? "selected" : "";
      return `<option value="${safe}" ${chosen}>${safe}</option>`;
    })
  ].join("");
};

AdminWritingUI.renderTaskCard = function (taskNumber, taskData = {}) {
  const instruction = String(taskData.instruction_template || "").trim();
  const question = String(taskData.question_text || "").trim();
  const imageUrl = String(taskData.image_url || "").trim();
  const preview = imageUrl ? `${window.API}${imageUrl}` : "";

  return `
    <div class="question-block writing-task-card" data-task-number="${taskNumber}" style="text-align:left;">
      <div class="question-header">
        <div class="question-number">Task ${taskNumber}</div>
      </div>

      <label>Instruction template</label>
      <select class="writing-instruction-select" style="width:100%; height:36px;">
        ${AdminWritingUI.renderInstructionOptions(taskNumber, instruction)}
      </select>

      <label style="margin-top:8px; display:block;">Question</label>
      <textarea class="writing-question-text" rows="5" style="width:100%; padding:10px; border-radius:8px; border:1px solid #e5e5ea;">${AdminWritingUI.escapeHtml(question)}</textarea>

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
  const instruction = String(taskCard.querySelector(".writing-instruction-select")?.value || "").trim();
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
