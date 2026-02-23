// frontend/js/admin_reading.js
window.showCreateReading = function () {
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

        <div class="questions-wrap" style="margin-top:12px;">
          <h5>Questions</h5>

          <div class="question-block" data-q="1" style="padding:8px; border:1px solid #e5e5ea; border-radius:8px; margin-bottom:8px;">
            <label>Question type</label>
            <select class="q-type" style="width:100%; padding:8px; border-radius:6px;">
              <option value="mcq">MCQ</option>
              <option value="gap">Gap-fill</option>
              <option value="tfng">TF / NG</option>
            </select>

            <label style="margin-top:6px; display:block;">Question text</label>
            <input class="q-text" placeholder="Enter question text" />

            <label style="margin-top:6px; display:block;">Correct answer</label>
            <input class="q-answer" placeholder="Correct answer (index or text)" />
          </div>

          <button onclick="addQuestion(this)">➕ Add Question</button>
        </div>
      </div>
    </div>

    <button style="margin-top:16px;" onclick="addPassage()">➕ Add Passage</button>

    <hr style="margin:16px 0;" />

    <button onclick="saveReadingDraft()">💾 Save Draft</button>
    <button style="margin-top:8px;" onclick="publishReading()">🚀 Publish</button>
    <button style="margin-top:8px;" onclick="showAdminPanel()">⬅ Back</button>
  `;
};

// TEMP: placeholder until we build Passage UI
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
