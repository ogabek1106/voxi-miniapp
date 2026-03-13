// frontend/js/admin_reading/ui/passages.js
window.AdminReading = window.AdminReading || {};
window.getNextQuestionNumber = function () {

  const blockNums = [...document.querySelectorAll(".question-block")]
    .map(b => parseInt(b.dataset.globalQ) || 0);

  const rowNums = [...document.querySelectorAll(".matching-editor div")]
    .map(el => {
      const m = el.textContent.match(/^Q(\d+)/);
      return m ? parseInt(m[1]) : 0;
    });

  const nums = [...blockNums, ...rowNums];

  return nums.length ? Math.max(...nums) + 1 : 1;
};
window.addPassage = function () {
  const wrap = document.getElementById("passages-wrap");
  if (!wrap) return;

  const count = wrap.querySelectorAll(".passage-block").length;
  const nextIndex = count + 1;

  // 🔢 Global question number
  const qNum = getNextQuestionNumber();

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

      <div class="question-block" data-type="matching" data-global-q="${qNum}" data-question-id="temp_${qNum}" style="padding:8px; border:1px solid #e5e5ea; border-radius:8px; margin-bottom:8px;">
        <div style="font-weight:700; margin-bottom:6px;">Q${qNum}</div>

        <div style="margin-bottom:6px;">
  <label>Question type</label>
  <select class="q-type-select">
    <option value="matching">Matching</option>
    <option value="single_choice">Single Choice</option>
  </select>
</div>
        <div class="q-meta-wrap" style="margin-top:6px;"></div>
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

  const meta = block.querySelector(".q-meta-wrap");
  const select = block.querySelector(".q-type-select");

  // initial load
  AdminReading.loadQuestionUI(select.value, meta);

  // react when user changes type
  select.addEventListener("change", () => {
    meta.innerHTML = "";
    block.dataset.type = select.value;
    AdminReading.loadQuestionUI(select.value, meta);
  });
};

window.addQuestion = function (btn) {
  const questionsWrap = btn.closest(".questions-wrap");
  if (!questionsWrap) return;

  const qNum = getNextQuestionNumber();

  const block = document.createElement("div");
  block.className = "question-block";
  block.dataset.type = "matching";
  block.dataset.globalQ = qNum;
  block.dataset.questionId = "temp_" + qNum;
  block.style.padding = "8px";
  block.style.border = "1px solid #e5e5ea";
  block.style.borderRadius = "8px";
  block.style.marginBottom = "8px";

  block.innerHTML = `
    <div style="font-weight:700; margin-bottom:6px;">Q${qNum}</div>

    <div style="margin-bottom:6px;">
  <label>Question type</label>
  <select class="q-type-select">
    <option value="matching">Matching</option>
    <option value="single_choice">Single Choice</option>
  </select>
</div>
    <div class="q-meta-wrap" style="margin-top:6px;"></div>
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
  const meta = block.querySelector(".q-meta-wrap");
  const select = block.querySelector(".q-type-select");

  // initial load
  AdminReading.loadQuestionUI(select.value, meta);

  // react when type changes
  select.addEventListener("change", () => {
    meta.innerHTML = "";
    block.dataset.type = select.value;
    AdminReading.loadQuestionUI(select.value, meta);
  });
};
