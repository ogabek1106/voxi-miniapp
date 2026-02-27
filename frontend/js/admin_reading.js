// frontend/js/admin_reading.js
window.__currentPackId = null;
window.__globalQuestionCounter = 1;
window.__currentEditingTestId = null;
window.showCreateReading = function (reset = true) {
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

        <div class="questions-wrap" style="margin-top:12px;">
          <h5>Questions</h5>

          <div class="question-block" data-global-q="1" style="padding:8px; border:1px solid #e5e5ea; border-radius:8px; margin-bottom:8px;">
            <div style="font-weight:700; margin-bottom:6px;">Q1</div>
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

    <button id="btn-save-draft" onclick="saveReadingDraft()">💾 Save Draft</button>
    <button style="margin-top:8px;" onclick="openMockPack(window.__currentPackId)">⬅ Back</button>
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

    <div class="questions-wrap" style="margin-top:12px;">
      <h5>Questions</h5>

      <div class="question-block" data-global-q="${qNum}" style="padding:8px; border:1px solid #e5e5ea; border-radius:8px; margin-bottom:8px;">
        <div style="font-weight:700; margin-bottom:6px;">Q${qNum}</div>

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
  block.style.padding = "8px";
  block.style.border = "1px solid #e5e5ea";
  block.style.borderRadius = "8px";
  block.style.marginBottom = "8px";

  block.innerHTML = `
    <div style="font-weight:700; margin-bottom:6px;">Q${qNum}</div>

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
  `;

  questionsWrap.insertBefore(block, btn);
};

window.collectReadingFormData = function () {
  const title = document.getElementById("reading-title")?.value?.trim();
  const time = parseInt(document.getElementById("reading-time")?.value || "60", 10);

  const passages = [];
  document.querySelectorAll(".passage-block").forEach((p, pi) => {
    const passageTitle = p.querySelector(".passage-title")?.value || null;
    const passageText = p.querySelector(".passage-text")?.value || "";

    const questions = [];
    p.querySelectorAll(".question-block").forEach((q, qi) => {
      questions.push({
        type: q.querySelector(".q-type")?.value,
        text: q.querySelector(".q-text")?.value,
        correct_answer: q.querySelector(".q-answer")?.value,
        order_index: qi + 1,
      });
    });

    passages.push({
      title: passageTitle,
      text: passageText,
      order_index: pi + 1,
      questions,
    });
  });

  return { title, time_limit_minutes: time, passages };
};

window.saveReadingDraft = async function () {
  const btn = document.getElementById("btn-save-draft");
  if (btn) {
    if (btn.disabled) return;         // prevent double click
    btn.disabled = true;
    btn.innerText = "⏳ Saving...";
  }
  const title = document.getElementById("reading-title")?.value?.trim();
  const time = parseInt(document.getElementById("reading-time")?.value || "60", 10);

  if (!title) {
    alert("Reading name is required");
    if (btn) {
      btn.disabled = false;
      btn.innerText = "💾 Save Draft";
    }
    return;
  }
  try {
   
    let testId;
    console.log("🧪 Save draft started");
    if (window.__currentEditingTestId) {
      await apiPut(`/admin/reading/tests/${window.__currentEditingTestId}`, {
        title,
        time_limit_minutes: time
      });

      const old = await apiGet(`/admin/reading/tests/${window.__currentEditingTestId}`);

      for (const p of old.passages || []) {
        try {
          await apiDelete(`/admin/reading/passages/${p.id}`);
        } catch (e) {
          console.warn("Skip delete passage", p.id, e);
        }
      }

      testId = window.__currentEditingTestId;
    } else {
      const test = await apiPost("/admin/reading/tests", {
        title,
        time_limit_minutes: time,
        mock_pack_id: window.__currentPackId
      });
      testId = test.id;
    }

    // 2) Create passages
    const passageBlocks = document.querySelectorAll(".passage-block");

    for (let pi = 0; pi < passageBlocks.length; pi++) {
      const p = passageBlocks[pi];

      const passageTitle = p.querySelector(".passage-title")?.value || null;
      const passageText = p.querySelector(".passage-text")?.value || "";

      if (!passageText.trim()) {
        alert(`Passage ${pi + 1} text is empty`);
        if (btn) {
          btn.disabled = false;
          btn.innerText = "💾 Save Draft";
        }
        return;
      }
      console.log("🧪 Creating passage", pi + 1);
      const passage = await apiPost(`/admin/reading/tests/${testId}/passages`, {
        title: passageTitle,
        text: passageText,
        order_index: pi + 1
      });

      const passageId = passage.id;

      // 3) Create questions for this passage
      const questions = p.querySelectorAll(".question-block");

      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];

        const type = q.querySelector(".q-type")?.value;
        const text = q.querySelector(".q-text")?.value;
        const correctAnswer = q.querySelector(".q-answer")?.value;

        if (!text?.trim()) {
          alert(`Question ${qi + 1} in Passage ${pi + 1} is empty`);
          if (btn) {
            btn.disabled = false;
            btn.innerText = "💾 Save Draft";
          }  
          return;
        }
        console.log("🧪 Creating question", qi + 1, "for passage", pi + 1);
        await apiPost(`/admin/reading/passages/${passageId}/questions`, {
          text: text,
          type: type,
          options: null,
          correct_answer: correctAnswer,
          word_limit: null,
          order_index: qi + 1
        });
      }
    }

    alert("✅ Reading saved for this Mock Pack");
    openMockPack(window.__currentPackId);
    if (btn) {
      btn.disabled = false;
      btn.innerText = "💾 Save Draft";
    }

  } catch (e) {
    console.error("❌ SAVE DRAFT ERROR FULL:", e);

    if (e?.response) {
      console.error("Status:", e.response.status);
      console.error("Data:", e.response.data);

      alert(
        "❌ Failed to save reading test\n" +
        "Status: " + e.response.status + "\n" +
        JSON.stringify(e.response.data, null, 2)
      );
    } else {
      alert("❌ Failed to save reading test\n" + e.message);
    }
    if (btn) {
      btn.disabled = false;
      btn.innerText = "💾 Save Draft";
    }
  }
};

window.publishReading = async function () {
  const title = document.getElementById("reading-title")?.value?.trim();
  const time = parseInt(document.getElementById("reading-time")?.value || "60", 10);

  if (!title) {
    alert("Reading name is required");
    return;
  }

  try {
    let testId;
    console.log("🧪 Save draft started");

    if (window.__currentEditingTestId) {

      await apiPut(`/admin/reading/tests/${window.__currentEditingTestId}`, {
        title,
        time_limit_minutes: time
      });

      const old = await apiGet(`/admin/reading/tests/${window.__currentEditingTestId}`);

      for (const p of old.passages || []) {
        try {
          await apiDelete(`/admin/reading/passages/${p.id}`);
        } catch (e) {
          console.warn("Skip delete passage", p.id, e);
        }
      }

      testId = window.__currentEditingTestId;
    } else {
      const test = await apiPost("/admin/reading/tests", {
        title,
        time_limit_minutes: time,
        mock_pack_id: window.__currentPackId
      });

      testId = test.id;
      window.__currentEditingTestId = testId; // 🔒 ensure id is set after first publish
    }

    const passageBlocks = document.querySelectorAll(".passage-block");

    for (let pi = 0; pi < passageBlocks.length; pi++) {
      const p = passageBlocks[pi];

      const passageTitle = p.querySelector(".passage-title")?.value || null;
      const passageText = p.querySelector(".passage-text")?.value || "";

      const passage = await apiPost(`/admin/reading/tests/${testId}/passages`, {
        title: passageTitle,
        text: passageText,
        order_index: pi + 1
      });

      const passageId = passage.id;

      const questions = p.querySelectorAll(".question-block");
      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];

        await apiPost(`/admin/reading/passages/${passageId}/questions`, {
          text: q.querySelector(".q-text")?.value,
          type: q.querySelector(".q-type")?.value,
          options: null,
          correct_answer: q.querySelector(".q-answer")?.value,
          word_limit: null,
          order_index: qi + 1
        });
      }
    }

    // 🚀 Publish
    await apiPost(`/admin/reading/tests/${testId}/publish`);

    alert("🚀 Reading test published");
    showAdminReadingList();
  } catch (e) {
    console.error(e);
    alert("❌ Failed to publish reading test");
  }
};

window.unpublishReading = async function (testId) {
  const ok = confirm("Are you sure you want to unpublish this test?\nIt will move back to Drafts.");
  if (!ok) return;

  try {
    await apiPost(`/admin/reading/tests/${testId}/unpublish`);
    alert("↩️ Reading test unpublished");
    showAdminReadingList();
  } catch (e) {
    console.error("❌ UNPUBLISH ERROR:", e);
    alert("❌ Failed to unpublish reading test\n" + (e.message || ""));
  }
};

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
  window.showCreateReading(false);
  window.__currentEditingTestId = testId;

  try {
    const data = await apiGet(`/admin/reading/tests/${testId}`);

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

      p.questions.forEach((q) => {
        window.__globalQuestionCounter++;

        questionsHtml += `
          <div class="question-block" data-global-q="${window.__globalQuestionCounter}" style="padding:8px; border:1px solid #e5e5ea; border-radius:8px; margin-bottom:8px;">
            <div style="font-weight:700; margin-bottom:6px;">Q${window.__globalQuestionCounter}</div>

            <label>Question type</label>
            <select class="q-type" style="width:100%; padding:8px; border-radius:6px;">
              <option value="mcq" ${q.type === "mcq" ? "selected" : ""}>MCQ</option>
              <option value="gap" ${q.type === "gap" ? "selected" : ""}>Gap-fill</option>
              <option value="tfng" ${q.type === "tfng" ? "selected" : ""}>TF / NG</option>
            </select>

            <label style="margin-top:6px; display:block;">Question text</label>
            <input class="q-text" value="${(q.text || "").replace(/"/g, "&quot;")}" />

            <label style="margin-top:6px; display:block;">Correct answer</label>
            <input class="q-answer" value="${(q.correct_answer || "").toString().replace(/"/g, "&quot;")}" />
          </div>
        `;
      });

      passageBlock.innerHTML = `
        <h4>Passage ${passageIndex}</h4>

        <label>Passage title</label>
        <input class="passage-title" value="${(p.title || "").replace(/"/g, "&quot;")}" />

        <label style="margin-top:8px; display:block;">Passage text</label>
        <textarea class="passage-text" rows="6" style="width:100%; padding:10px; border-radius:8px;"></textarea>

        <div class="questions-wrap" style="margin-top:12px;">
          <h5>Questions</h5>
          ${questionsHtml}
          <button onclick="addQuestion(this)">➕ Add Question</button>
        </div>
      `;

      const textarea = passageBlock.querySelector(".passage-text");
      if (textarea) {
        textarea.value = p.text || "";
      }
    });

    // sync counter with rendered questions
    window.__globalQuestionCounter = document.querySelectorAll(".question-block").length;

    // 🔁 Toggle Publish / Unpublish button (ONLY UI logic added)
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

window.deleteReadingTest = async function (testId) {
  const ok = confirm("❌ Are you sure you want to DELETE this reading test?\nThis cannot be undone.");
  if (!ok) return;

  try {
    await apiDelete(`/admin/reading/tests/${testId}`);
    alert("🗑 Reading test deleted");
    loadAdminReadingList();
  } catch (e) {
    console.error("❌ DELETE TEST ERROR:", e);
    alert("❌ Failed to delete reading test\n" + (e.message || ""));
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
