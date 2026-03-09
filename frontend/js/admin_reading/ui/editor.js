// frontend/js/admin_reading/ui/editor.js
window.AdminReading = window.AdminReading || {};
window.showCreateReading = function (reset = false) {
  window.__globalQuestionCounter = 1;
  if (reset) window.__currentEditingTestId = null;
  hideAllScreens();
  hideAnnouncement();

  if (!screenMocks) return;

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <h3>➕ Create Reading Test</h3>

    <!-- Reading meta -->
    <div style="margin-top:12px; text-align:left;">
      <label>Reading name</label>
      <input id="reading-title" placeholder="e.g. Cambridge 19 – Test 1" />

      <label style="margin-top:8px; display:block;">Time limit (minutes)</label>
      <input id="reading-time" type="number" value="60" />
    </div>

    <hr style="margin:16px 0;" />

    <!-- Passage 1 -->
    <div id="passages-wrap">
      <div class="passage-block" data-index="1" style="text-align:left;">
        <h4>Passage 1</h4>

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

          <div class="question-block" data-global-q="1" data-question-id="temp_1" style="padding:8px; border:1px solid #e5e5ea; border-radius:8px; margin-bottom:8px;">
            <div style="font-weight:700; margin-bottom:6px;">Q1</div>
            <label>Question type</label>
            <select class="q-type"
                    onchange="debugTypeChange(this)"
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
      </div>
    </div>

    <button style="margin-top:16px;" onclick="addPassage()">➕ Add Passage</button>

    <hr style="margin:16px 0;" />

    <button id="btn-save-draft" onclick="saveReadingDraft()">💾 Save Draft</button>
    <button style="margin-top:8px;" onclick="openMockPack(window.__currentPackId)">⬅ Back</button>
  `;
};

window.showAddPassage = function () {
  hideAllScreens();
  hideAnnouncement();

  if (!screenMocks) return;

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <h3>➕ Add Passage</h3>
    <p>Passage form coming next…</p>
    <button onclick="showCreateReading()">⬅ Back</button>
  `;
};
