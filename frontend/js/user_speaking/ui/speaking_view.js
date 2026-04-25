window.UserSpeakingUI = window.UserSpeakingUI || {};

UserSpeakingUI.escapeHtml = function (value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

UserSpeakingUI.renderShell = function (container) {
  if (!container) return;
  container.innerHTML = `
    <div class="speaking-user-shell" style="
      display:flex;
      flex-direction:column;
      height:100%;
    ">
      ${UserSpeakingUI.renderHeader()}
      <div id="speaking-user-content" style="
        flex:1;
        overflow-y:auto;
        padding:0 12px 70px 12px;
        box-sizing:border-box;
      "></div>
    </div>
  `;
};

UserSpeakingUI.renderLoading = function (container) {
  UserSpeakingUI.renderShell(container);
  const content = document.getElementById("speaking-user-content");
  if (content) {
    content.innerHTML = `<h3 style="margin-top:6px;">Loading Speaking...</h3>`;
  }
};

UserSpeakingUI.renderError = function (container, error) {
  UserSpeakingUI.renderShell(container);
  const content = document.getElementById("speaking-user-content");
  if (content) {
    content.innerHTML = `
      <h3>Speaking load failed</h3>
      <pre style="text-align:left; white-space:pre-wrap; font-size:12px;">${UserSpeakingUI.escapeHtml(error?.message || error || "Unknown error")}</pre>
    `;
  }
};

UserSpeakingUI.renderPart = function (part, stage, elapsedText) {
  const content = document.getElementById("speaking-user-content");
  if (!content) return;

  const partNo = Number(part?.part_number || 1);
  const instruction = String(part?.instruction || "").trim();
  const question = String(part?.question || "").trim();

  const stageHtml = stage === "recording"
    ? `
      <div class="speaking-recording-zone">
        <button type="button" id="speaking-submit-btn" class="speaking-submit-btn">Submit</button>
        <div id="speaking-recording-timer" class="speaking-recording-timer">${UserSpeakingUI.escapeHtml(elapsedText || "00:00")}</div>
      </div>
    `
    : `
      <div class="speaking-prep-zone">
        <button type="button" id="speaking-mic-btn" class="speaking-mic-btn" aria-label="Start recording">
          <span class="speaking-mic-ring"></span>
          <span class="speaking-mic-core">🎤</span>
        </button>
      </div>
    `;

  content.innerHTML = `
    <div class="question-block speaking-part-card">
      <div class="question-header">
        <div class="question-number">Part ${partNo}</div>
      </div>
      <div class="speaking-part-instruction">${UserSpeakingUI.escapeHtml(instruction)}</div>
      <div class="speaking-part-question">${UserSpeakingUI.escapeHtml(question)}</div>
      ${stageHtml}
      <div id="speaking-stage-message" class="speaking-stage-message"></div>
    </div>
  `;
};

UserSpeakingUI.setRecordingPhase = function (phase) {
  const timerEl = document.getElementById("speaking-recording-timer");
  const submitBtn = document.getElementById("speaking-submit-btn");
  if (!timerEl || !submitBtn) return;

  timerEl.classList.remove("phase-1", "phase-2", "phase-3");
  submitBtn.classList.remove("phase-1", "phase-2", "phase-3");
  timerEl.classList.add(`phase-${phase}`);
  submitBtn.classList.add(`phase-${phase}`);
};

UserSpeakingUI.updateRecordingTimer = function (value) {
  const timerEl = document.getElementById("speaking-recording-timer");
  if (!timerEl) return;
  timerEl.textContent = value;
};

UserSpeakingUI.setPulseLevel = function (active) {
  const submitBtn = document.getElementById("speaking-submit-btn");
  if (!submitBtn) return;
  submitBtn.classList.toggle("speaking-audio-active", !!active);
};

UserSpeakingUI.setStageMessage = function (text) {
  const box = document.getElementById("speaking-stage-message");
  if (!box) return;
  box.textContent = text || "";
};

UserSpeakingUI.bindBack = function (onBack) {
  const backBtn = document.getElementById("speaking-back-btn");
  if (backBtn) backBtn.onclick = onBack;
};
