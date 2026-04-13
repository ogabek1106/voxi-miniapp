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
    <div id="admin-reading-published"><p style="opacity:0.6;">Loading...</p></div>

    <h4 style="margin-top:16px;">Drafts</h4>
    <div id="admin-reading-drafts"><p style="opacity:0.6;">Loading...</p></div>

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

    const renderRow = function (test, prefix) {
      return `
        <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
          <button onclick="openAdminReading(${test.id})">${prefix} #${test.id} — ${test.title}</button>
          <button
            onclick="deleteReadingTest(${test.id})"
            style="
              background:#fee2e2;
              color:#b91c1c;
              width:36px;
              height:36px;
              min-width:36px;
              border-radius:8px;
              display:flex;
              align-items:center;
              justify-content:center;
              flex:0 0 auto;
            "
            title="Delete"
          >
            🗑
          </button>
        </div>
      `;
    };

    const published = tests.filter((t) => t.status === "published");
    const drafts = tests.filter((t) => t.status === "draft");

    publishedWrap.innerHTML = published.length
      ? published.map((t) => renderRow(t, "📖")).join("")
      : `<p style="opacity:0.6;">No published tests yet</p>`;

    draftsWrap.innerHTML = drafts.length
      ? drafts.map((t) => renderRow(t, "✏️")).join("")
      : `<p style="opacity:0.6;">No drafts yet</p>`;
  } catch (error) {
    console.error(error);
    alert("Failed to load reading tests");
  }
};

window.mapLoadedQuestionToUiType = function (question) {
  const rawType = String(question?.type || "").toUpperCase();
  if (rawType === "MULTI_CHOICE") return "multiple_choice";
  if (rawType === "SINGLE_CHOICE") return "single_choice";
  if (rawType === "YES_NO_NG") return "yes_no_ng";
  if (rawType === "TFNG") return "tf_ng";
  if (rawType === "MATCHING") return "matching";
  if (rawType === "PARAGRAPH_MATCHING") return "paragraph_matching";
  if (rawType === "TEXT_INPUT") {
    if (question?.meta?.mode === "summary") return "summary";
    if (question?.meta?.mode === "image_questions") return "image_questions";
    return "gap";
  }
  return "gap";
};

window.isGroupedUiType = function (uiType) {
  return uiType === "matching"
    || uiType === "paragraph_matching"
    || uiType === "summary"
    || uiType === "gap"
    || uiType === "image_questions";
};

window.openAdminReading = async function (testId) {
  window.__currentEditingTestId = testId;
  hideAllScreens();
  hideAnnouncement();
  if (!screenMocks) return;

  try {
    const data = await apiGet(`/admin/reading/tests/${testId}`);
    showCreateReading(false);

    const titleInput = document.getElementById("reading-title");
    const timeInput = document.getElementById("reading-time");
    if (titleInput) titleInput.value = data.title || "";
    if (timeInput) timeInput.value = data.time_limit_minutes || 60;

    const wrap = document.getElementById("passages-wrap");
    if (!wrap) return;
    wrap.innerHTML = "";

    let nextNumber = 1;
    const passages = [...(data.passages || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    passages.forEach((passage, passageIndex) => {
      const passageBlock = document.createElement("div");
      passageBlock.className = "passage-block";
      passageBlock.dataset.index = String(passageIndex + 1);
      passageBlock.style.textAlign = "left";
      passageBlock.style.marginTop = "16px";

      passageBlock.innerHTML = `
        <h4>Passage ${passageIndex + 1}</h4>
        <label>Passage title</label>
        <input class="passage-title" value="${String(passage.title || "").replace(/"/g, "&quot;")}" />
        <label style="margin-top:8px; display:block;">Passage text</label>
        <textarea class="passage-text" rows="6" style="width:100%; padding:10px; border-radius:8px;"></textarea>
        <hr style="margin:10px 0; border:0; border-top:1px solid #eee;" />
        <div class="questions-wrap" style="margin-top:12px;">
          <h5>Questions</h5>
          <div class="questions-container"></div>
          <button onclick="addQuestion(this)">➕ Add Question</button>
        </div>
      `;

      const textarea = passageBlock.querySelector(".passage-text");
      if (textarea) textarea.value = passage.text || "";

      const questionsContainer = passageBlock.querySelector(".questions-container");
      const questions = [...(passage.questions || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      const renderedGroupKeys = new Set();

      questions.forEach((question) => {
        const uiType = mapLoadedQuestionToUiType(question);
        const grouped = isGroupedUiType(uiType) && !!question.question_group_id;
        const groupKey = grouped ? `${uiType}_${question.question_group_id}` : `single_${question.id}`;
        if (renderedGroupKeys.has(groupKey)) return;
        renderedGroupKeys.add(groupKey);

        const groupedQuestions = grouped
          ? questions
              .filter((q) => String(q.question_group_id) === String(question.question_group_id) && mapLoadedQuestionToUiType(q) === uiType)
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          : [question];

        const displayStart = nextNumber;
        const count = Math.max(groupedQuestions.length, 1);
        nextNumber += count;

        const holder = document.createElement("div");
        holder.innerHTML = renderAdminQuestionBlock(displayStart);
        const questionBlock = holder.firstElementChild;
        questionBlock.dataset.questionId = grouped ? String(question.question_group_id) : String(question.id);
        questionBlock.dataset.questionType = uiType;
        questionBlock.dataset.generatedQuestions = String(count);

        questionsContainer.appendChild(questionBlock);
        wireAdminQuestionBlock(questionBlock, uiType);

        const instructionSelect = questionBlock.querySelector(".q-instruction-select");
        if (instructionSelect && window.ReadingInstructions?.fillSelect) {
          window.ReadingInstructions.fillSelect(
            instructionSelect,
            getInstructionTypeForEditor(uiType),
            groupedQuestions[0]?.instruction || ""
          );
        }

        const root = questionBlock.querySelector(".q-type-root");
        if (root) {
          root.innerHTML = "";
          AdminReading.loadQuestionUI(uiType, root, grouped ? groupedQuestions : question);
        }
      });

      wrap.appendChild(passageBlock);
    });

    window.__globalQuestionCounter = Math.max(nextNumber - 1, 0);

    const publishWrap = document.getElementById("publish-wrap");
    if (publishWrap) {
      if (data.status === "published") {
        publishWrap.innerHTML = `<button onclick="unpublishReading(${testId})">↩️ Unpublish</button>`;
      } else {
        publishWrap.innerHTML = `<button onclick="publishReading()">🚀 Publish</button>`;
      }
    }
  } catch (error) {
    console.error(error);
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
  } catch (_) {
    // no reading linked yet
  }

  window.__currentEditingTestId = null;
  showCreateReading(true);
};
