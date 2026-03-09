// frontend/js/admin_reading/ui/passages.js
window.AdminReading = window.AdminReading || {};
window.addPassage = function () {
  const wrap = document.getElementById("passages-wrap");
  if (!wrap) return;

  const count = wrap.querySelectorAll(".passage-block").length;
  const nextIndex = count + 1;

  // 🔢 Global question number
  const qNum = ++window.__globalQuestionCounter;

  const block = document.createElement("div");
  block.className = "passage-block";
  block.dataset.index = nextIndex;
  block.style.textAlign = "left";
  block.style.marginTop = "16px";

  block.innerHTML = `
    <h4>Passage ${nextIndex}</h4>

    <label>Passage title</label>
    <input class="passage-title" placeholder="Optional title" />

    <label style="margin-top:8px; display:block;">Passage text</label>
    <textarea class="passage-text" rows="6" style="width:100%; padding:10px; border-radius:8px;"></textarea>
    <hr style="margin:10px 0; border:0; border-top:1px solid #eee;" />

    <div class="image-attach-wrap" style="text-align:right;">
      <button type="button" class="attach-image-btn" onclick="attachImage(this)">
        🖼 Add Image
      </button>
      <input type="file" accept="image/*" class="hidden-image-input" style="display:none;" />
      <div class="image-preview" style="margin-top:8px;"></div>
    </div>
    <div class="questions-wrap" style="margin-top:12px;">
      <h5>Questions</h5>

      <div class="question-block" data-global-q="${qNum}" data-question-id="temp_${qNum}" style="padding:8px; border:1px solid #e5e5ea; border-radius:8px; margin-bottom:8px;">
        <div style="font-weight:700; margin-bottom:6px;">Q${qNum}</div>

        <label>Question type</label>
        <select class="q-type"
                onchange="handleQuestionTypeChange(this)"
                style="width:100%; padding:8px; border-radius:6px;">
              <option value="mcq">Single Choice</option>
              <option value="multi">Multi Choice</option>
              <option value="gap">Text Input</option>
              <option value="tfng">True / False / Not Given</option>
              <option value="yesno">Yes / No / Not Given</option>
              <option value="matching">Matching</option>
            </select>
        <div class="q-meta-wrap" style="margin-top:6px;"></div>
        <label style="margin-top:6px; display:block;">Question text</label>
        <input class="q-text" placeholder="Enter question text" />

        <label style="margin-top:6px; display:block;">Correct answer</label>
        <input class="q-answer" placeholder="Correct answer (index or text)" />
        <hr style="margin:10px 0; border:0; border-top:1px solid #eee;" />

        <div class="image-attach-wrap" style="text-align:right;">
          <button type="button" class="attach-image-btn" onclick="attachImage(this)">
            🖼 Add Image
          </button>
          <input type="file" accept="image/*" class="hidden-image-input" style="display:none;" />
          <div class="image-preview" style="margin-top:8px;"></div>
        </div>
      </div>

      <button onclick="addQuestion(this)">➕ Add Question</button>
    </div>
  `;

  wrap.appendChild(block);
};

window.addQuestion = function (btn) {
  const questionsWrap = btn.closest(".questions-wrap");
  if (!questionsWrap) return;

  const qNum = ++window.__globalQuestionCounter;

  const block = document.createElement("div");
  block.className = "question-block";
  block.dataset.globalQ = qNum;
  block.dataset.questionId = "temp_" + qNum;
  block.style.padding = "8px";
  block.style.border = "1px solid #e5e5ea";
  block.style.borderRadius = "8px";
  block.style.marginBottom = "8px";

  block.innerHTML = `
    <div style="font-weight:700; margin-bottom:6px;">Q${qNum}</div>

    <label>Question type</label>
    <select class="q-type"
            onchange="handleQuestionTypeChange(this)"
            style="width:100%; padding:8px; border-radius:6px;">
      <option value="mcq">Single Choice</option>
      <option value="multi">Multi Choice</option>
      <option value="gap">Text Input</option>
      <option value="tfng">True / False / Not Given</option>
      <option value="yesno">Yes / No / Not Given</option>
      <option value="matching">Matching</option>
    </select>
    <div class="q-meta-wrap" style="margin-top:6px;"></div>
    <label style="margin-top:6px; display:block;">Question text</label>
    <input class="q-text" placeholder="Enter question text" />

    <label style="margin-top:6px; display:block;">Correct answer</label>
    <input class="q-answer" placeholder="Correct answer (index or text)" />
    <hr style="margin:10px 0; border:0; border-top:1px solid #eee;" />

    <div class="image-attach-wrap" style="text-align:right;">
      <button type="button" class="attach-image-btn" onclick="attachImage(this)">
        🖼 Add Image
      </button>
      <input type="file" accept="image/*" class="hidden-image-input" style="display:none;" />
      <div class="image-preview" style="margin-top:8px;"></div>
    </div>
  `;

  questionsWrap.insertBefore(block, btn);
};
