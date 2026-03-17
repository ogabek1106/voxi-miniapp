// frontend/js/admin_reading/ui/passages.js
window.AdminReading = window.AdminReading || {};
window.getNextQuestionNumber = function () {

  const blockNums = [...document.querySelectorAll(".question-block")]
    .map(b => parseInt(b.dataset.globalQ) || 0);

  const rowNums = [...document.querySelectorAll(".match-q-label")]
    .map(el => parseInt(el.textContent.replace("Q","")) || 0);

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

      <div class="question-block" data-type="" data-global-q="${qNum}" data-question-id="temp_${qNum}" style="padding:8px; border:1px solid #e5e5ea; border-radius:8px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">

  <div class="q-header" style="font-weight:700;">Q${qNum}</div>

  <button
    type="button"
    onclick="removeQuestionBlock(this)"
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
    <option value="" selected disabled>Select type</option>
    <option value="matching">Matching</option>
    <option value="single_choice">Single Choice</option>
    <option value="gap">Gap Filling</option>
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
  if (select.value) {
    AdminReading.loadQuestionUI(select.value, meta);
  }
  const header = block.querySelector(".q-header");
  if (select.value === "matching" && header) {
    header.style.display = "none";
  }
  // react when user changes type
  select.addEventListener("change", () => {

    meta.innerHTML = "";
    block.dataset.type = select.value;

    const header = block.querySelector(".q-header");

    if (select.value === "matching") {
      if (header) header.style.display = "none";
    } else {
      if (header) header.style.display = "block";
    }

    if (!select.value) return;

    AdminReading.loadQuestionUI(select.value, meta);

  });
};

window.addQuestion = function (btn) {
  const questionsWrap = btn.closest(".questions-wrap");
  if (!questionsWrap) return;

  const qNum = getNextQuestionNumber();

  const block = document.createElement("div");
  block.className = "question-block";
  block.dataset.type = "";
  block.dataset.globalQ = qNum;
  block.dataset.questionId = "temp_" + qNum;
  block.style.padding = "8px";
  block.style.border = "1px solid #e5e5ea";
  block.style.borderRadius = "8px";
  block.style.marginBottom = "8px";

  block.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">

  <div class="q-header" style="font-weight:700;">Q${qNum}</div>

  <button
    type="button"
    onclick="removeQuestionBlock(this)"
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
    <option value="" selected disabled>Select type</option>
    <option value="matching">Matching</option>
    <option value="single_choice">Single Choice</option>
    <option value="gap">Gap Filling</option>
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
  if (select.value) {
    AdminReading.loadQuestionUI(select.value, meta);
  }
  const header = block.querySelector(".q-header");
  if (select.value === "matching" && header) {
    header.style.display = "none";
  }
  // react when type changes
  select.addEventListener("change", () => {

    meta.innerHTML = "";
    block.dataset.type = select.value;

    const header = block.querySelector(".q-header");

    if (select.value === "matching") {
      if (header) header.style.display = "none";
    } else {
      if (header) header.style.display = "block";
    }

    if (!select.value) return;

    AdminReading.loadQuestionUI(select.value, meta);

  });
};

window.removeQuestionBlock = function(btn) {

  const block = btn.closest(".question-block");
  if (!block) return;

  block.remove();

  // 🔥 re-number correctly
  const blocks = document.querySelectorAll(".question-block");

  let currentMax = 0;

  blocks.forEach((b) => {

    // get next available number
    const num = currentMax + 1;

    b.dataset.globalQ = num;

    const header = b.querySelector(".q-header");
    if (header) header.textContent = "Q" + num;

    currentMax = num;

  });

};
