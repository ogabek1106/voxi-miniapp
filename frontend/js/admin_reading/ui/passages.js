// frontend/js/admin_reading/ui/passages.js
window.AdminReading = window.AdminReading || {};
window.getNextQuestionNumber = function () {

  const blockNums = [...document.querySelectorAll(".question-block")]
    .map(b => {
      const start = parseInt(b.dataset.globalQ) || 0;
      const generated = parseInt(b.dataset.generatedQuestions) || 1;
      return start + generated - 1;
    });

  const rowNums = [...document.querySelectorAll(".match-q-label")]
    .map(el => parseInt(el.textContent.replace("Q","")) || 0);

  const paragraphRowNums = [...document.querySelectorAll(".paragraph-match-q-label")]
    .map(el => parseInt(el.textContent.replace("Q","")) || 0);

  const summaryRowNums = [...document.querySelectorAll(".summary-blank-label")]
    .map(el => {
      const match = el.textContent.match(/Q(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nums = [...blockNums, ...rowNums, ...paragraphRowNums, ...summaryRowNums];

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

      <div class="question-block" data-type="" data-global-q="${qNum}" data-question-id="temp_${qNum}" style="   border:1px solid #e5e5ea;   border-radius:8px;   padding:8px;   margin-bottom:8px; ">

  <!-- 🔒 FIXED LAYER -->
  <div class="q-fixed-layer" style="margin-bottom:8px;">

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <div class="q-header" style="font-weight:700;">Q${qNum}</div>

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
      <select class="q-type-select" style="width:100%; height:36px;">
        <option value="matching" selected>Matching</option>
        <option value="single_choice">Single Choice</option>
        <option value="multiple_choice">Multiple Choice</option>
        <option value="gap">Gap Filling</option>
        <option value="yes_no_ng">Yes / No / Not Given</option>
        <option value="tf_ng">True / False / Not Given</option>
        <option value="summary">Summary Completion</option>
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
  `;

  wrap.appendChild(block);

  const root = block.querySelector(".q-type-root");
  const select = block.querySelector(".q-type-select");
  const header = block.querySelector(".q-header");

  // initial load
  AdminReading.loadQuestionUI("matching", root);
  block.dataset.type = "matching";
  if (header) header.style.opacity = "0.3";
  // react when user changes type
  select.addEventListener("change", () => {

    
    block.dataset.type = select.value;

    const header = block.querySelector(".q-header");

    if (header) header.style.opacity = select.value === "matching" ? "0.3" : "1";

    const root = block.querySelector(".q-type-root");
    root.innerHTML = ""; // ONLY clear inner dynamic zone
    AdminReading.loadQuestionUI(select.value, root);

  });
};

window.addQuestion = function (btn) {
  const questionsWrap = btn.closest(".questions-wrap");
  if (!questionsWrap) return;

  const qNum = getNextQuestionNumber();

  const block = document.createElement("div");
  block.className = "question-block";
  block.style.border = "1px solid #e5e5ea";
  block.style.borderRadius = "8px";
  block.style.padding = "8px";
  block.style.marginBottom = "8px";
  block.dataset.type = "";
  block.dataset.globalQ = qNum;
  block.dataset.questionId = "temp_" + qNum;  
  block.style.marginBottom = "8px";

  block.innerHTML = `
  <!-- 🔒 FIXED LAYER -->
  <div class="q-fixed-layer" style="margin-bottom:8px;">

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <div class="q-header" style="font-weight:700;">Q${qNum}</div>

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
      <select class="q-type-select" style="width:100%; height:36px;">
        <option value="matching" selected>Matching</option>
        <option value="single_choice">Single Choice</option>
        <option value="multiple_choice">Multiple Choice</option>
        <option value="gap">Gap Filling</option>
        <option value="yes_no_ng">Yes / No / Not Given</option>
        <option value="tf_ng">True / False / Not Given</option>
        <option value="summary">Summary Completion</option>
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
`;

  questionsWrap.insertBefore(block, btn);
  const root = block.querySelector(".q-type-root");
  const select = block.querySelector(".q-type-select");
  const header = block.querySelector(".q-header");

  // initial load
  AdminReading.loadQuestionUI("matching", root);
  block.dataset.type = "matching";
  if (header) header.style.opacity = "0.3";
  // react when type changes
  select.addEventListener("change", () => {

    
    block.dataset.type = select.value;

    const header = block.querySelector(".q-header");

    if (header) header.style.opacity = select.value === "matching" ? "0.3" : "1";

    const root = block.querySelector(".q-type-root");
    root.innerHTML = "";
    AdminReading.loadQuestionUI(select.value, root);

  });
};

document.addEventListener("click", function(e) {

  const btn = e.target.closest(".delete-question-btn");
  if (!btn) return;

  const block = btn.closest(".question-block");
  if (!block) return;

  block.remove();

  // 🔥 RENumber
  const blocks = document.querySelectorAll(".question-block");

  let current = 1;

  blocks.forEach((b) => {

    b.dataset.globalQ = current;

    const header = b.querySelector(".q-header");
    if (header) header.textContent = "Q" + current;

    current++;

  });

});
