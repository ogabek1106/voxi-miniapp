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

          <div class="question-block" 
  data-global-q="1" 
  data-question-id="temp_1"
  data-question-type="matching"
  style="
    border:1px solid #e5e5ea;
    border-radius:8px;
    padding:8px;
    margin-bottom:8px;
  "
>

  <!-- 🔒 FIXED LAYER -->
  <div class="q-fixed-layer"   style="     padding:8px;     border-bottom:1px solid #eee;     margin-bottom:8px;   " >

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <div class="q-header" style="font-weight:700;">
        Q1
      </div>

      <button
        type="button"
        class="delete-question-btn"
        style="
          width:28px;
          height:28px;
          border-radius:50%;
          background:#fee2e2;
          color:#b91c1c;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:14px;
          cursor:pointer;
        "
      >
        ✖
      </button>
    </div>

    <div style="margin-bottom:6px;">
      <label>Question type</label>
      <select class="q-type-select">
        <option value="matching" selected>Matching</option>
        <option value="single_choice">Single Choice</option>
        <option value="gap">Gap Filling</option>
      </select>
    </div>

  </div>

  <!-- 🔁 DYNAMIC LAYER -->
  <div class="q-dynamic-layer">

    <div class="q-meta-wrap">
      <div class="q-type-root"></div>
    </div>

    <hr style="margin:10px 0; border:0; border-top:1px solid #eee;" />

    <div class="image-attach-wrap" style="text-align:right;">
      <button type="button" class="attach-image-btn" onclick="attachImage(this)">
        🖼 Add Image
      </button>
      <input type="file" accept="image/*" class="hidden-image-input" style="display:none;" />
      <div class="image-preview" style="margin-top:8px;"></div>
    </div>

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
  AdminReading.loadQuestionUI(
    "matching",
    document.querySelector(".q-type-root")
  );
  const select = document.querySelector(".q-type-select");

  select.addEventListener("change", () => {
    const root = document.querySelector(".q-type-root");
    root.innerHTML = "";
    AdminReading.loadQuestionUI(select.value, root);
  });
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
