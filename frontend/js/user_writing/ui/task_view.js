window.UserWritingUI = window.UserWritingUI || {};

UserWritingUI.escapeHtml = function (value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

UserWritingUI.renderShell = function (container) {
  if (!container) return;
  container.innerHTML = `
    <div class="writing-user-shell" style="
      display:flex;
      flex-direction:column;
      height:100%;
    ">
      ${UserWritingUI.renderHeader()}
      <div id="writing-user-content" style="
        flex:1;
        overflow-y:auto;
        padding:0 12px 70px 12px;
        box-sizing:border-box;
      "></div>
    </div>
  `;
};

UserWritingUI.renderLoading = function (container) {
  UserWritingUI.renderShell(container);
  const content = document.getElementById("writing-user-content");
  if (content) {
    content.innerHTML = `<h3 style="margin-top:6px;">Loading Writing...</h3>`;
  }
};

UserWritingUI.renderError = function (container, error) {
  UserWritingUI.renderShell(container);
  const content = document.getElementById("writing-user-content");
  if (content) {
    content.innerHTML = `
      <h3>Writing load failed</h3>
      <pre style="text-align:left; white-space:pre-wrap; font-size:12px;">${UserWritingUI.escapeHtml(error?.message || error || "Unknown error")}</pre>
    `;
  }
};

UserWritingUI.renderChecking = function (container) {
  if (!container) return;
  container.innerHTML = `
    <div style="
      min-height:70vh;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:12px;
      padding:20px;
      box-sizing:border-box;
      text-align:center;
    ">
      <div style="
        width:34px;
        height:34px;
        border:4px solid #d1d5db;
        border-top-color:#111827;
        border-radius:999px;
        animation: writing-check-spin 0.8s linear infinite;
      "></div>
      <div style="font-size:18px; font-weight:700;">Your answers are being checked</div>
      <div style="font-size:13px; color:#666;">Please wait a moment.</div>
    </div>
  `;
};

UserWritingUI.normalizePromptText = function (value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

UserWritingUI.renderTaskCard = function (task, progress = {}) {
  const number = Number(task?.task_number || 0) || 1;
  const instruction = UserWritingUI.normalizePromptText(task?.instruction_template || "");
  const questionText = UserWritingUI.normalizePromptText(task?.question_text || "");
  const prompt = UserWritingUI.normalizePromptText(task?.instruction || "");
  const imageUrl = String(task?.image_url || "").trim();

  const textValue = String(progress[`task${number}_text`] || "");
  const answerImage = String(progress[`task${number}_image_url`] || "").trim();
  const questionImage = imageUrl ? `${window.API}${imageUrl}` : "";
  const answerImageFull = answerImage ? `${window.API}${answerImage}` : "";

  return `
    <div class="question-block writing-user-task" data-task-number="${number}" style="text-align:left;">
      <div class="question-header">
        <div class="question-number">Task ${number}</div>
      </div>

      ${instruction ? `
        <div class="writing-task-instruction">${UserWritingUI.escapeHtml(instruction)}</div>
      ` : ""}

      <div class="writing-task-question" style="white-space:pre-wrap;">
        ${UserWritingUI.escapeHtml(questionText || prompt)}
      </div>

      ${questionImage ? `
        <div class="writing-task-image-wrap">
          <img
            src="${UserWritingUI.escapeHtml(questionImage)}"
            alt="Task ${number} image"
            class="writing-zoomable-image"
            data-full-image-src="${UserWritingUI.escapeHtml(questionImage)}"
            onclick="UserWritingUI.openImageViewer(this.getAttribute('data-full-image-src'))"
          />
        </div>
      ` : ""}

      <div class="writing-answer-box">
        <textarea
          class="writing-answer-text"
          rows="8"
          placeholder="Write your answer here."
        >${UserWritingUI.escapeHtml(textValue)}</textarea>

        <div class="writing-answer-upload" data-image-url="${UserWritingUI.escapeHtml(answerImage)}">
          <div class="writing-answer-upload-hint">or upload a photo of your handwritten response</div>
          <button type="button" class="writing-answer-upload-btn">Upload a photo</button>
          <input type="file" class="writing-answer-upload-input" accept="image/*" style="display:none;" />
        </div>
      </div>

      <div class="writing-answer-preview" style="${answerImageFull ? "" : "display:none;"}">
        <img
          src="${UserWritingUI.escapeHtml(answerImageFull)}"
          alt="Answer upload"
          class="writing-zoomable-image"
          data-full-image-src="${UserWritingUI.escapeHtml(answerImageFull)}"
          onclick="UserWritingUI.openImageViewer(this.getAttribute('data-full-image-src'))"
        />
        </div>
    </div>
  `;
};

UserWritingUI.renderSubmit = function () {
  return `
    <div style="margin-top:12px; padding:0 8px 8px 8px;">
      <button type="button" id="writing-submit-btn" style="
        width:100%;
        height:46px;
        border:0;
        border-radius:12px;
        background:#111827;
        color:#ffffff;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        font-size:14px;
        box-shadow:0 5px 14px rgba(0,0,0,0.16);
        cursor:pointer;
      ">Submit Writing</button>
    </div>
  `;
};

UserWritingUI.readAnswers = function () {
  const out = {
    task1_text: "",
    task1_image_url: null,
    task2_text: "",
    task2_image_url: null
  };

  const cards = Array.from(document.querySelectorAll(".writing-user-task"));
  cards.forEach((card) => {
    const taskNumber = Number(card.dataset.taskNumber || 0);
    if (![1, 2].includes(taskNumber)) return;

    const text = String(card.querySelector(".writing-answer-text")?.value || "");
    const imageUrl = String(card.querySelector(".writing-answer-upload")?.dataset?.imageUrl || "").trim();

    out[`task${taskNumber}_text`] = text;
    out[`task${taskNumber}_image_url`] = imageUrl || null;
  });

  return out;
};

UserWritingUI.setLocked = function (locked) {
  const content = document.getElementById("writing-user-content");
  if (!content) return;
  const controls = content.querySelectorAll("input, textarea, button");
  controls.forEach((el) => {
    if (el.id === "writing-back-btn") return;
    el.disabled = !!locked;
  });
};

UserWritingUI.ensureImageViewer = function () {
  if (document.getElementById("writing-image-viewer")) return;

  const viewer = document.createElement("div");
  viewer.id = "writing-image-viewer";
  viewer.className = "writing-image-viewer";
  viewer.innerHTML = `
    <div class="writing-image-viewer-backdrop" onclick="UserWritingUI.closeImageViewer()"></div>
    <div class="writing-image-viewer-content">
      <button type="button" class="writing-image-viewer-close" onclick="UserWritingUI.closeImageViewer()">✕</button>
      <div class="writing-image-viewer-scroll">
        <img id="writing-image-viewer-img" class="writing-image-viewer-img" alt="Writing image zoom view" />
      </div>
    </div>
  `;

  document.body.appendChild(viewer);

  const img = viewer.querySelector("#writing-image-viewer-img");
  if (img) {
    img.addEventListener("click", () => {
      img.classList.toggle("zoomed");
      const scrollWrap = viewer.querySelector(".writing-image-viewer-scroll");
      if (scrollWrap && img.classList.contains("zoomed")) {
        requestAnimationFrame(() => {
          scrollWrap.scrollLeft = Math.max(0, (scrollWrap.scrollWidth - scrollWrap.clientWidth) / 2);
          scrollWrap.scrollTop = Math.max(0, (scrollWrap.scrollHeight - scrollWrap.clientHeight) / 2);
        });
      }
    });
  }
};

UserWritingUI.openImageViewer = function (src) {
  if (!src) return;
  UserWritingUI.ensureImageViewer();

  const viewer = document.getElementById("writing-image-viewer");
  const img = document.getElementById("writing-image-viewer-img");
  if (!viewer || !img) return;

  img.src = src;
  img.classList.remove("zoomed");
  viewer.classList.add("open");
  document.body.style.overflow = "hidden";

  const scrollWrap = viewer.querySelector(".writing-image-viewer-scroll");
  if (scrollWrap) {
    scrollWrap.scrollLeft = 0;
    scrollWrap.scrollTop = 0;
  }
};

UserWritingUI.closeImageViewer = function () {
  const viewer = document.getElementById("writing-image-viewer");
  const img = document.getElementById("writing-image-viewer-img");
  if (!viewer || !img) return;

  viewer.classList.remove("open");
  img.classList.remove("zoomed");
  document.body.style.overflow = "";
};
