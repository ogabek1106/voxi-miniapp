// frontend/js/admin_reading/loader/editor_loader.js
window.AdminReading = window.AdminReading || {};
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
      const renderedGroups = new Set();
    
      for (let qi = 0; qi < p.questions.length; qi++) {

        const q = p.questions[qi];
        // 🔥 HANDLE GAP GROUPING (like MATCHING)
        const groupKey = `${q.type}_${q.question_group_id || q.id}`;

        // treat grouped types ALWAYS as grouped
        if (q.type === "MATCHING" || q.type === "TEXT_INPUT") {
          if (renderedGroups.has(groupKey)) {
            continue;
          }
          renderedGroups.add(groupKey);
        }
        

        window.__globalQuestionCounter++;

        const textValue = q.content?.text || "";
        // console.log("EDITOR LOAD", {
        //  question_id: q.id,
        //  raw_content: q.content,
        //  extracted_text: q.content?.text
        // });
        const answerValue = q.correct_answer?.value || "";

        questionsHtml += `
  <div class="question-block" 
     data-global-q="${window.__globalQuestionCounter}" 
     data-question-id="${
       (q.type === "MATCHING" || q.type === "TEXT_INPUT")
         ? q.question_group_id
         : q.id
     }"
     data-question-type="${q.type === "TEXT_INPUT" ? "gap" : q.type}"
     style="
       border:1px solid #e5e5ea;
       border-radius:8px;
       padding:8px;
       margin-bottom:8px;
     ">

  <!-- 🔒 FIXED LAYER -->
  <div class="q-fixed-layer" style="margin-bottom:8px;">

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <div class="q-header" style="font-weight:700;">
        Q${window.__globalQuestionCounter}
      </div>

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
      <label style="font-weight:600;">Question type</label>
      <select class="q-type-select" style="width:100%; margin-top:4px;">
        <option value="matching">Matching</option>
        <option value="single_choice">Single Choice</option>
        <option value="gap">Gap Filling</option>
      </select>
    </div>

  </div>

  <!-- 🔁 DYNAMIC LAYER -->
  <div class="q-dynamic-layer" style="margin-top:10px;">

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
      passageBlock.querySelectorAll(".question-block").forEach((block) => {

        if (block.dataset.initialized) return;
        block.dataset.initialized = "1";
        const qid = block.dataset.questionId;

        let questionData;

        if (
          block.dataset.questionType === "MATCHING" ||
          block.dataset.questionType === "gap"
        ) {
          questionData = p.questions.find(
            q => String(q.question_group_id) === String(qid)
          );
        } else {
          questionData = p.questions.find(
            q => String(q.id) === String(qid)
          );
        }
        if (!questionData) return;
        const metaWrap = block.querySelector(".q-meta-wrap");
        const root = block.querySelector(".q-type-root");
        const typeSelect = block.querySelector(".q-type-select");
        // console.log("BEFORE UI LOAD:", typeSelect?.outerHTML);

        if (typeSelect && questionData?.type) {
          let mappedType = questionData.type.toLowerCase();

          if (mappedType === "text_input") {
            mappedType = "gap";
          }

          typeSelect.value = mappedType;
        }

        const initialType = typeSelect ? typeSelect.value : questionData.type.toLowerCase();

        let payload = questionData;

        // 🔥 GROUP TYPES (MATCHING + GAP)
        if (
          questionData.type === "MATCHING" ||
          questionData.type === "TEXT_INPUT"
        ) {
          payload = p.questions
            .filter(q => q.question_group_id === questionData.question_group_id)
            .sort((a, b) => a.order_index - b.order_index);
        }
        // console.log("BEFORE LOAD:", block.outerHTML);
        AdminReading.loadQuestionUI(
          initialType,
          root,
          payload
        );
        // console.log("AFTER LOAD:", block.outerHTML);
        const checkSelect = block.querySelector(".q-type-select");
        // console.log("AFTER UI LOAD:", checkSelect?.outerHTML);

        // 🔁 Gate switch
        if (typeSelect) {
          typeSelect.addEventListener("change", () => {

            const newType = typeSelect.value;
  
            root.innerHTML = "";
            // console.log("BEFORE LOAD:", block.outerHTML);
            AdminReading.loadQuestionUI(
              newType,
              root,
              null
            );
            // console.log("AFTER LOAD:", block.outerHTML);
          });
        }
         
          // console.log("PATCH DEBUG", {
          //  block_id: qid,
          //  questionData: questionData,
          //  allQuestions: p.questions
          // });
          if (!questionData) return;
      
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
      
            });
        
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
