// frontend/js/admin_reading.js
window.debugTypeChange = function(sel) {

  const value = sel.value;

  // force DOM selected option sync
  Array.from(sel.options).forEach(opt => {
    opt.selected = (opt.value === value);
  });

  console.log("TYPE CHANGE START", value, sel);

  setTimeout(() => {
    console.log("TYPE AFTER 50ms", sel.value, sel);
  }, 50);

  handleQuestionTypeChange(sel);
};

window.__currentPackId = null;
window.__globalQuestionCounter = 1;
window.__currentEditingTestId = null;

window.showAdminReadingList = function () {
  hideAllScreens();
  hideAnnouncement();

  if (!screenMocks) return;

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <h3>📖 Reading Section (Admin)</h3>

    <h4 style="margin-top:12px;">Published tests</h4>
    <div id="admin-reading-published">
      <p style="opacity:0.6;">Loading…</p>
    </div>

    <h4 style="margin-top:16px;">Drafts</h4>
    <div id="admin-reading-drafts">
      <p style="opacity:0.6;">Loading…</p>
    </div>

    <button style="margin-top:16px;" onclick="showCreateReading()">➕ Create New Reading</button>

    <button style="margin-top:12px;" onclick="showAdminMock()">⬅ Back</button>
  `;
  setTimeout(loadAdminReadingList, 0);
};

window.loadAdminReadingList = async function () {
  try {
    const tests = await apiGet("/admin/reading/tests");

    const publishedWrap = document.getElementById("admin-reading-published");
    const draftsWrap = document.getElementById("admin-reading-drafts");

    if (!publishedWrap || !draftsWrap) return;

    const published = tests.filter(t => t.status === "published");
    const drafts = tests.filter(t => t.status === "draft");

    publishedWrap.innerHTML = published.length
      ? published.map(t => `
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
            <button onclick="openAdminReading(${t.id})">
              📖 #${t.id} — ${t.title}
            </button>
            <button
              onclick="deleteReadingTest(${t.id})"
              style="
                background:#fee2e2;
                color:#b91c1c;
                width:36px;            /* slim width */
                height:36px;           /* same height as main buttons */
                min-width:36px;
                border-radius:8px;
                display:flex;
                align-items:center;
                justify-content:center;
                flex:0 0 auto;         /* never stretch */
              "
              title="Delete"
            >
              🗑
            </button>
          </div>
        `).join("")
      : `<p style="opacity:0.6;">No published tests yet</p>`;

    draftsWrap.innerHTML = drafts.length
      ? drafts.map(t => `
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
            <button onclick="openAdminReading(${t.id})">
              ✏️ #${t.id} — ${t.title}
            </button>
            <button
              onclick="deleteReadingTest(${t.id})"
              style="
                background:#fee2e2;
                color:#b91c1c;
                width:36px;            /* slim width */
                height:36px;           /* same height as main buttons */
                min-width:36px;
                border-radius:8px;
                display:flex;
                align-items:center;
                justify-content:center;
                flex:0 0 auto;         /* never stretch */
              "
              title="Delete"
            >
              🗑
            </button>
          </div>
        `).join("")
      : `<p style="opacity:0.6;">No drafts yet</p>`;

  } catch (e) {
    console.error(e);
    alert("Failed to load reading tests");
  }
};

window.openAdminReading = async function (testId) {
  window.__currentEditingTestId = testId;
  hideAllScreens();
  hideAnnouncement();

  if (!screenMocks) return;

  // open editor UI (do NOT reset edit mode)
  // window.showCreateReading(false);
  window.__currentEditingTestId = testId;

  try {
    const data = await apiGet(`/admin/reading/tests/${testId}`);
    showCreateReading(false);
    // fill meta
    document.getElementById("reading-title").value = data.title || "";
    document.getElementById("reading-time").value = data.time_limit_minutes || 60;

    // reset global counter
    window.__globalQuestionCounter = 0;

    const wrap = document.getElementById("passages-wrap");
    wrap.innerHTML = "";

    data.passages.forEach((p, pi) => {
      const passageIndex = pi + 1;

      const passageBlock = document.createElement("div");
      passageBlock.className = "passage-block";
      passageBlock.dataset.index = passageIndex;
      passageBlock.style.textAlign = "left";
      passageBlock.style.marginTop = "16px";

      let questionsHtml = "";

      for (let qi = 0; qi < p.questions.length; qi++) {

        const q = p.questions[qi];

        // prevent duplicate MATCHING blocks
        if (
          q.type === "MATCHING" &&
          qi > 0 &&
          p.questions[qi - 1].type === "MATCHING"
        ) {
          continue;
        }  

        window.__globalQuestionCounter++;

        const uiType =
          q.type === "SINGLE_CHOICE" ? "mcq" :
          q.type === "MULTI_CHOICE" ? "multi" :
          q.type === "TEXT_INPUT" ? "gap" :
          q.type === "TFNG" ? "tfng" :
          q.type === "YES_NO_NG" ? "yesno" :
          q.type === "MATCHING" ? "matching" :
          "gap";

        const textValue = q.content?.text || "";
        console.log("EDITOR LOAD", {
          question_id: q.id,
          raw_content: q.content,
          extracted_text: q.content?.text
        });
        const answerValue = q.correct_answer?.value || "";

        questionsHtml += `
          <div class="question-block" data-global-q="${window.__globalQuestionCounter}" data-question-id="${q.id}" style="padding:8px; border:1px solid #e5e5ea; border-radius:8px; margin-bottom:8px;">
            <div style="font-weight:700; margin-bottom:6px;">Q${window.__globalQuestionCounter}</div>

            <label>Question type</label>
            <select class="q-type"
                    onchange="debugTypeChange(this)"
                    style="width:100%; padding:8px; border-radius:6px;">
              <option value="mcq" ${uiType === "mcq" ? "selected" : ""}>Single Choice</option>
              <option value="multi" ${uiType === "multi" ? "selected" : ""}>Multi Choice</option>
              <option value="gap" ${uiType === "gap" ? "selected" : ""}>Text Input</option>
              <option value="tfng" ${uiType === "tfng" ? "selected" : ""}>True / False / Not Given</option>
              <option value="yesno" ${uiType === "yesno" ? "selected" : ""}>Yes / No / Not Given</option>
              <option value="matching" ${uiType === "matching" ? "selected" : ""}>Matching</option>
            </select>
            <div class="q-meta-wrap" style="margin-top:6px;"></div>
            <label style="margin-top:6px; display:block;">Question text</label>
            <input class="q-text" value="${textValue}" />

            <label style="margin-top:6px; display:block;">Correct answer</label>
            <input class="q-answer" value="${answerValue}" />
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
      }

      passageBlock.innerHTML = `
        <h4>Passage ${passageIndex}</h4>

        <label>Passage title</label>
        <input class="passage-title" value="${(p.title || "").replace(/"/g, "&quot;")}" />

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
          ${questionsHtml}
          <button onclick="addQuestion(this)">➕ Add Question</button>
        </div>
      `;

      wrap.appendChild(passageBlock);
      // Restore passage image
      if (p.image_url) {
        const imageWrap = passageBlock.querySelector(".image-attach-wrap");
        imageWrap.dataset.imageUrl = p.image_url;

        const preview = imageWrap.querySelector(".image-preview");
        preview.innerHTML = `
          <img src="${window.API + p.image_url}" 
               style="
                 width:100%;
                 max-width:100%;
                 height:auto;
                 display:block;
                 margin:8px auto 0 auto;
                 border-radius:12px;
               " />
          <button type="button" onclick="removeImage(this)" style="margin-top:8px;">
            ❌ Remove
          </button>
        `;
      }

      const textarea = passageBlock.querySelector(".passage-text");
      if (textarea) {
        textarea.value = p.text || "";
      }
      // 🔹 Load meta for existing questions
      setTimeout(() => {
      passageBlock.querySelectorAll(".question-block").forEach((block) => {

        if (block.dataset.initialized) return;
        block.dataset.initialized = "1";
        const sel = block.querySelector(".q-type");
        const qid = block.dataset.questionId;

        const questionData = p.questions.find(
          q => String(q.id) === String(qid)
        );

        if (questionData) {
          const dbType = 
            questionData.type === "SINGLE_CHOICE" ? "mcq" :
            questionData.type === "MULTI_CHOICE" ? "multi" :
            questionData.type === "TEXT_INPUT" ? "gap" :
            questionData.type === "TFNG" ? "tfng" :
            questionData.type === "YES_NO_NG" ? "yesno" :
            questionData.type === "MATCHING" ? "matching" :
            "gap";
  
          if (sel.value === dbType) {
            handleQuestionTypeChange(sel);
          }
        } else {
          handleQuestionTypeChange(sel);
        }
          //const qid = block.dataset.questionId;

          //const questionData = p.questions.find(
          //  q => String(q.id) === String(qid)
          //);

          if (!questionData) return;

          // rebuild MATCHING editor from DB
          if (sel.value === "matching") {

            const options = questionData.meta?.options || [];

            const questions = [];
            let start = p.questions.findIndex(x => x.id === questionData.id);

            for (let i = start; i < p.questions.length; i++) {
              const item = p.questions[i];
              if (item.type !== "MATCHING") break;
              questions.push(item);
            }

            questions.sort((a, b) => a.order_index - b.order_index);

            const qCountInput = block.querySelector(".match-q-count");
            const oCountInput = block.querySelector(".match-opt-count");

            if (!qCountInput || !oCountInput) return;

            qCountInput.value = questions.length;
            oCountInput.value = options.length;

            generateMatching(qCountInput);

            const wrap = block.querySelector(".matching-editor");

            if (!wrap) return;

            wrap.querySelectorAll(".match-option").forEach((opt, i) => {
              if (options[i]) opt.value = options[i];
            });

            wrap.querySelectorAll(".match-question").forEach((inp, i) => {
              if (questions[i]) inp.value = questions[i].content?.text || "";
            });

            wrap.querySelectorAll(".match-answer").forEach((sel, i) => {
              if (questions[i]) sel.value = questions[i].correct_answer?.value || "A";
            });

          }
          
          console.log("PATCH DEBUG", {
            block_id: qid,
            questionData: questionData,
            allQuestions: p.questions
          });
          if (!questionData) return;
          block.querySelector(".q-text").value = questionData.content?.text || "";
          block.querySelector(".q-answer").value = questionData.correct_answer?.value || "";
          // Restore question image
          if (questionData.image_url) {
            const imageWrap = block.querySelector(".image-attach-wrap");
            imageWrap.dataset.imageUrl = questionData.image_url;

            const preview = imageWrap.querySelector(".image-preview");
            preview.innerHTML = `
              <img src="${window.API + questionData.image_url}" 
                   style="
                     width:100%;
                     max-width:100%;
                     height:auto;
                     display:block;
                     margin:8px auto 0 auto;
                     border-radius:12px;
                   " />
              <button type="button" onclick="removeImage(this)" style="margin-top:8px;">
                ❌ Remove
              </button>
            `;
          }
          // Restore meta only if exists
          if (questionData.meta && sel.value === "gap") {
            block.querySelector(".q-max-words").value = questionData.meta.max_words || "";
            block.querySelector(".q-allow-numbers").checked = questionData.meta.allow_numbers || false;
          }
        });
      }, 0);
    });

    // sync counter safely
    const nums = Array.from(document.querySelectorAll(".question-block"))
      .map(b => parseInt(b.dataset.globalQ) || 0);

    window.__globalQuestionCounter = nums.length ? Math.max(...nums) : 0;

    // publish/unpublish button
    const publishWrap = document.getElementById("publish-wrap");
    if (publishWrap) {
      if (data.status === "published") {
        publishWrap.innerHTML = `
          <button onclick="unpublishReading(${testId})">↩️ Unpublish</button>
        `;
      } else {
        publishWrap.innerHTML = `
          <button onclick="publishReading()">🚀 Publish</button>
        `;
      }
    }

  } catch (e) {
    console.error(e);
    alert("Failed to load reading test");
  }
};

window.showPackReading = async function (packId) {
  window.__currentPackId = packId;

  try {
    const test = await apiGet(`/admin/mock-packs/${packId}/reading`);

    if (test && test.id) {
      window.__currentEditingTestId = test.id;
      openAdminReading(test.id);
      return;
    }
  } catch (e) {
    // no reading exists yet
  }

  window.__currentEditingTestId = null;
  window.showCreateReading(true);
};

window.attachImage = function(btn) {
  const wrap = btn.closest(".image-attach-wrap");
  const input = wrap.querySelector(".hidden-image-input");

  input.click();

  input.onchange = async function() {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${window.API}/admin/upload-image`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      const fullUrl = window.API + data.url;

      // store relative path in DB
      wrap.dataset.imageUrl = data.url;

      // preview with full URL
      const preview = wrap.querySelector(".image-preview");
      preview.innerHTML = `
        <img src="${fullUrl}" 
             style="
               width:100%;
               max-width:100%;
               height:auto;
               display:block;
               margin:8px auto 0 auto;
               border-radius:12px;
             " />
        <button type="button" onclick="removeImage(this)" style="margin-top:8px;">
          ❌ Remove
        </button>
      `;

    } catch (err) {
      alert("Upload failed");
      console.error(err);
    }
  };
};

window.removeImage = function(btn) {
  const wrap = btn.closest(".image-attach-wrap");
  wrap.dataset.imageUrl = "";
  wrap.querySelector(".image-preview").innerHTML = "";
};
