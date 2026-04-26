// frontend/js/mock_start.js
window.MockFlow = window.MockFlow || {
  active: false,
  mockId: null
};

window.MockDebug = window.MockDebug || {};
MockDebug.enabled = true;
MockDebug.seq = 0;
MockDebug.log = function (tag, payload) {
  if (!MockDebug.enabled) return;
  MockDebug.seq += 1;
  const ts = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[MockDebug#${MockDebug.seq}] ${ts} ${tag}`);
    return;
  }
  console.log(`[MockDebug#${MockDebug.seq}] ${ts} ${tag}`, payload);
};

MockFlow.activate = function (mockId) {
  MockFlow.active = true;
  MockFlow.mockId = Number(mockId || 0) || null;
  MockDebug.log("MockFlow.activate", { mockId: MockFlow.mockId });
};

MockFlow.deactivate = function () {
  MockDebug.log("MockFlow.deactivate", { mockId: MockFlow.mockId });
  MockFlow.active = false;
  MockFlow.mockId = null;
  if (window.MockTransitionPage?.cleanup) {
    MockDebug.log("MockFlow.deactivate.cleanupTransition");
    window.MockTransitionPage.cleanup();
  }
};

MockFlow.isActive = function (mockId) {
  const safeMockId = Number(mockId || 0) || null;
  return !!MockFlow.active && !!MockFlow.mockId && MockFlow.mockId === safeMockId;
};

MockFlow.goToNextPart = function (currentPart, mockId, container) {
  MockDebug.log("MockFlow.goToNextPart.enter", { currentPart, mockId, active: MockFlow.active, flowMockId: MockFlow.mockId });
  if (!MockFlow.isActive(mockId) || !window.MockTransitionPage?.show) {
    MockDebug.log("MockFlow.goToNextPart.skip", {
      isActive: MockFlow.isActive(mockId),
      hasTransition: !!window.MockTransitionPage?.show
    });
    return false;
  }

  const current = String(currentPart || "").toLowerCase();
  const map = {
    listening: "reading",
    reading: "writing",
    writing: "speaking"
  };
  const next = map[current];
  if (!next) return false;

  const partLabel = current.charAt(0).toUpperCase() + current.slice(1);
  const nextLabel = next.charAt(0).toUpperCase() + next.slice(1);

  window.MockTransitionPage.show({
    container,
    currentPart: partLabel,
    nextPart: nextLabel,
    durationSeconds: 60,
    onReady: async function () {
      MockDebug.log("MockFlow.goToNextPart.onReady", { next, mockId: MockFlow.mockId });
      if (next === "reading") {
        await window.startMock(MockFlow.mockId, { fromFlow: true });
        return;
      }
      if (next === "writing") {
        await window.startWritingMock(MockFlow.mockId, { fromFlow: true });
        return;
      }
      if (next === "speaking") {
        await window.startSpeakingMock(MockFlow.mockId, { fromFlow: true });
        return;
      }
      MockDebug.log("MockFlow.goToNextPart.onReady.unknownNext", { next });
    }
  });

  MockDebug.log("MockFlow.goToNextPart.transitionShown", { from: current, to: next, mockId });
  return true;
};

MockFlow.showFinalTransition = function (mockId, container, onDone) {
  if (!MockFlow.isActive(mockId) || !window.MockTransitionPage?.show) {
    return false;
  }

  window.MockTransitionPage.show({
    container,
    isFinal: true,
    durationSeconds: 4,
    onReady: function () {
      MockFlow.deactivate();
      if (typeof onDone === "function") onDone();
    }
  });

  return true;
};

window.openMockWarning = function (packId, title) {

  if (!screenMocks) return;

  screenMocks.innerHTML = `
    <div style="
      width:100%;
      box-sizing:border-box;
      text-align:left;
      background: var(--card-bg, #f4f4f6);
      border-radius:16px;
      padding:16px 14px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
    ">
      <div style="
        font-size:20px;
        font-weight:800;
        color:#111827;
        margin-bottom:4px;
      ">${title}</div>

      <div style="
        font-size:14px;
        font-weight:700;
        color:#111827;
        margin-bottom:10px;
      ">Full IELTS Mock Test Warning</div>

      <div style="
        font-size:13px;
        line-height:1.55;
        color:#374151;
      ">
        This full mock simulates real exam pressure. Please read before you start:
      </div>

      <ul style="
        margin:10px 0 0 18px;
        padding:0;
        color:#374151;
        font-size:13px;
        line-height:1.6;
      ">
        <li>The test starts from Listening and continues in fixed order: Reading, Writing, Speaking.</li>
        <li>After each part, you get a short transition timer to prepare for the next part.</li>
        <li>Do not refresh or close the app during the test.</li>
        <li>If you leave, your timer does not pause and exam pressure is preserved.</li>
        <li>You should not exit the test until all parts are completed.</li>
      </ul>

      <button onclick="startFullMock(${packId})" style="margin-top:14px;">
        Start Full Mock
      </button>

      <button onclick="showMockList()" style="margin-top:8px; background:#e5e7eb; color:#111827;">
        Back
      </button>
    </div>
  `;
};

window.startFullMock = async function (mockId) {
  MockDebug.log("startFullMock.enter", { mockId });
  MockFlow.activate(mockId);
  await window.startListeningMock(mockId, { fromFlow: true });
};

window.startMock = async function (mockId, options = {}) {
  MockDebug.log("startMock.enter", { mockId, options });
  if (!options.fromFlow) {
    MockFlow.deactivate();
  }

  hideAllScreens();
  hideAnnouncement();
  if (typeof setBottomNavVisible === "function") {
    setBottomNavVisible(false);
  }

  const content = document.getElementById("content");
  if (content) content.style.padding = "2px 2px";

  if (!screenReading) return;

  screenReading.style.display = "block";
  UserReading.renderLoading(screenReading);

  try {

    const telegramId = window.getTelegramId();
    MockDebug.log("startMock.api.startReading", { mockId, telegramId });
    const data = await apiGet(`/mock-tests/${mockId}/reading/start?telegram_id=${telegramId}`);

    if (data?.already_submitted) {
      UserReading.showResultScreen({
        band: data?.result?.band ?? 0,
        correct: data?.result?.score ?? 0,
        total: data?.result?.total ?? 40
      });
      return;
    }

    if (!data || !data.passages) {
      UserReading.renderError(screenReading, `Invalid API response\n${JSON.stringify(data, null, 2)}`);
      return;
    }

    UserReading.renderTest(screenReading, data);
    MockDebug.log("startMock.renderedReading", { mockId });

  } catch (e) {
    console.error(e);
    MockDebug.log("startMock.error", { message: e?.message || String(e) });

    UserReading.renderError(screenReading, e);

  }

};

window.startWritingMock = async function (mockId, options = {}) {
  MockDebug.log("startWritingMock.enter", { mockId, options });
  if (!options.fromFlow) {
    MockFlow.deactivate();
  }

  hideAllScreens();
  hideAnnouncement();
  if (typeof setBottomNavVisible === "function") {
    setBottomNavVisible(false);
  }

  const content = document.getElementById("content");
  if (content) content.style.padding = "2px 2px";

  if (!screenWriting) return;
  screenWriting.style.display = "block";

  if (!window.UserWritingLoader?.start) {
    MockDebug.log("startWritingMock.loaderMissing");
    screenWriting.innerHTML = "<p>Writing module is not loaded.</p>";
    return;
  }

  await window.UserWritingLoader.start(mockId, screenWriting);
  MockDebug.log("startWritingMock.loaderDone", { mockId });
};

window.startListeningMock = async function (mockId, options = {}) {
  MockDebug.log("startListeningMock.enter", { mockId, options });
  if (!options.fromFlow) {
    MockFlow.deactivate();
  }

  hideAllScreens();
  hideAnnouncement();
  if (typeof setBottomNavVisible === "function") {
    setBottomNavVisible(false);
  }

  const content = document.getElementById("content");
  if (content) content.style.padding = "2px 2px";

  if (!screenReading) return;

  screenReading.style.display = "block";
  UserListening.renderLoading(screenReading);

  function mapBlockTypeToQuestionType(blockType) {
    const normalized = String(blockType || "").toLowerCase();

    if (normalized === "mcq_single") return "SINGLE_CHOICE";
    if (normalized === "mcq_multiple") return "MULTI_CHOICE";
    if (normalized === "matching") return "MATCHING";
    if (normalized === "tfng") return "TFNG";
    if (normalized === "yes_no_ng") return "YES_NO_NG";

    return "TEXT_INPUT";
  }

  function buildSectionText(section) {
    const sectionInstructions = String(section?.instructions || "").trim();
    return sectionInstructions;
  }

  function normalizeListeningStartPayload(raw, fallbackMockId) {
    if (Array.isArray(raw?.passages) || Array.isArray(raw?.sections)) {
      return {
        mock_id: raw?.mock_id || raw?.id || fallbackMockId,
        title: raw?.title || "Listening Test",
        time_limit_minutes: Number(raw?.time_limit_minutes || 60),
        timer: raw?.timer || null,
        sections: raw?.sections || raw?.passages || []
      };
    }

    let syntheticId = 1;
    const sections = (raw?.sections || []).map((section, sectionIndex) => {
      const questions = [];

      (section?.blocks || []).forEach((block, blockIndex) => {
        const questionType = mapBlockTypeToQuestionType(block?.block_type);
        const groupId = block?.id || `${sectionIndex + 1}-${blockIndex + 1}`;

        (block?.questions || []).forEach((question, questionIndex) => {
          let content = question?.content;
          if (typeof content === "string") {
            content = { text: content };
          } else if (!content || typeof content !== "object") {
            content = {};
          }

          if (questionType === "SINGLE_CHOICE") {
            const options = Array.isArray(content?.options)
              ? content.options
              : (Array.isArray(block?.meta?.options) ? block.meta.options : []);
            content.options = options;
          }

          if (questionType === "MULTI_CHOICE") {
            const options = Array.isArray(content?.options)
              ? content.options
              : (Array.isArray(block?.meta?.options) ? block.meta.options : []);
            content.options = options;
          }

          questions.push({
            id: Number(question?.id || syntheticId++),
            order_index: Number(question?.order_index || (questionIndex + 1)),
            question_group_id: groupId,
            type: String(question?.type || questionType).toUpperCase(),
            instruction: question?.instruction || block?.instruction || "",
            content,
            meta: question?.meta || block?.meta || {},
            points: 1,
            image_url: block?.image_url || null
          });
        });
      });

      return {
        id: section?.id || (sectionIndex + 1),
        title: `Section ${Number(section?.section_number || sectionIndex + 1)}`,
        text: buildSectionText(section),
        image_url: null,
        questions
      };
    });

    return {
      mock_id: raw?.id || fallbackMockId,
      title: raw?.title || "Listening Test",
      time_limit_minutes: Number(raw?.time_limit_minutes || 60),
      timer: null,
      sections
    };
  }

  try {
    MockDebug.log("startListeningMock.api.loadAdminListening", { mockId });
    const dataRaw = await apiGet(`/admin/listening/mock-packs/${mockId}`);
    const data = normalizeListeningStartPayload(dataRaw, mockId);

    if (!data || !Array.isArray(data.sections)) {
      UserListening.renderError(screenReading, `Invalid API response\n${JSON.stringify(dataRaw, null, 2)}`);
      return;
    }

    UserListening.renderTest(screenReading, data);
    MockDebug.log("startListeningMock.renderedListening", { mockId, sections: Array.isArray(data.sections) ? data.sections.length : 0 });
  } catch (e) {
    console.error(e);
    MockDebug.log("startListeningMock.error", { message: e?.message || String(e) });
    UserListening.renderError(screenReading, e);
  }
};

window.startSpeakingMock = async function (mockId, options = {}) {
  MockDebug.log("startSpeakingMock.enter", { mockId, options });
  if (!options.fromFlow) {
    MockFlow.deactivate();
  }

  hideAllScreens();
  hideAnnouncement();
  if (typeof setBottomNavVisible === "function") {
    setBottomNavVisible(false);
  }

  const content = document.getElementById("content");
  if (content) content.style.padding = "2px 2px";

  if (!screenSpeaking) return;
  screenSpeaking.style.display = "block";

  if (!window.UserSpeakingLoader?.start) {
    MockDebug.log("startSpeakingMock.loaderMissing");
    screenSpeaking.innerHTML = "<p>Speaking module is not loaded.</p>";
    return;
  }

  await window.UserSpeakingLoader.start(mockId, screenSpeaking);
  MockDebug.log("startSpeakingMock.loaderDone", { mockId });
};
