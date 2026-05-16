// frontend/js/mock_start.js
window.MockFlow = window.MockFlow || {
  active: false,
  mockId: null,
  retakePaymentReferenceId: null
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

MockFlow.activate = function (mockId, options = {}) {
  MockFlow.active = true;
  MockFlow.mockId = Number(mockId || 0) || null;
  MockFlow.retakePaymentReferenceId = options.retakePaymentReferenceId || null;
  MockDebug.log("MockFlow.activate", { mockId: MockFlow.mockId });
};

MockFlow.deactivate = function () {
  MockDebug.log("MockFlow.deactivate", { mockId: MockFlow.mockId });
  MockFlow.active = false;
  MockFlow.mockId = null;
  MockFlow.retakePaymentReferenceId = null;
  if (window.MockTransitionPage?.cleanup) {
    MockDebug.log("MockFlow.deactivate.cleanupTransition");
    window.MockTransitionPage.cleanup();
  }
};

MockFlow.isActive = function (mockId) {
  const safeMockId = Number(mockId || 0) || null;
  return !!MockFlow.active && !!MockFlow.mockId && MockFlow.mockId === safeMockId;
};

function applyTestContentSpacing() {
  const content = document.getElementById("content");
  if (!content) return;

  if (window.AppViewMode?.isWebsite?.()) {
    content.style.removeProperty("padding");
    return;
  }

  content.style.padding = "2px 2px";
}

async function requirePaidAccess(payload) {
  if (!window.VCoinUI?.ensureAccess) {
    alert("V-Coin balance checker is not loaded. Please try again.");
    return false;
  }

  return window.VCoinUI.ensureAccess(payload);
}

async function confirmPaidRetake({ mode, section, mockId, serviceName }) {
  const contentType = mode === "full_mock" ? "full_mock" : "separate_block";
  const referenceId = window.TestReentry?.retakeReference?.({ mode, section, mockId }) || `${mode}:${section}:${mockId}:retake:${Date.now()}`;
  const allowed = await requirePaidAccess({
    contentType,
    referenceId,
    serviceName
  });
  return allowed ? referenceId : null;
}

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
      const nextOptions = {
        fromFlow: true,
        retakePaymentReferenceId: MockFlow.retakePaymentReferenceId || null
      };
      if (next === "reading") {
        await window.startMock(MockFlow.mockId, nextOptions);
        return;
      }
      if (next === "writing") {
        await window.startWritingMock(MockFlow.mockId, nextOptions);
        return;
      }
      if (next === "speaking") {
        await window.startSpeakingMock(MockFlow.mockId, nextOptions);
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
        <li>Starting this Full Mock will cost you 10 V-Coins.</li>
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

async function showCompletedFullMock(mockId, existingResult) {
  const container = screenMocks || document.getElementById("screen-mocks") || document.getElementById("content");
  window.TestReentry?.showCompleted?.({
    container,
    onSeeResult: () => {
      if (window.UserReading?.renderResultPage) {
        container.innerHTML = "";
        window.UserReading.renderResultPage(container, {
          sectionType: "full_mock",
          overallLabel: "Full IELTS Mock Result",
          band: Number(existingResult?.overall_band || 0),
          correct: 0,
          total: 0,
          hideScore: true,
          breakdown: {
            listening: existingResult?.listening_band,
            reading: existingResult?.reading_band,
            writing: existingResult?.writing_band,
            speaking: existingResult?.speaking_band,
          },
          backTarget: "home"
        });
      }
    },
    onRetake: async () => {
      const paidRef = await confirmPaidRetake({
        mode: "full_mock",
        section: "full",
        mockId,
        serviceName: "Full Mock Test"
      });
      if (!paidRef) return;
      MockFlow.activate(mockId, { retakePaymentReferenceId: paidRef });
      await window.startListeningMock(mockId, { fromFlow: true, retakePaymentReferenceId: paidRef });
    }
  });
}

window.startFullMock = async function (mockId) {
  MockDebug.log("startFullMock.enter", { mockId });
  const telegramId = window.getTelegramId?.();
  if (telegramId) {
    try {
      const existing = await apiPost(`/mock-tests/${mockId}/full-result`, { telegram_id: telegramId });
      if (existing?.status === "completed") {
        await showCompletedFullMock(mockId, existing);
        return;
      }
    } catch (_) {
      // If the full-result endpoint is pending or incomplete, keep the normal start flow.
    }
  }
  const allowed = await requirePaidAccess({
    contentType: "full_mock",
    referenceId: mockId,
    serviceName: "Full Mock Test"
  });
  if (!allowed) return;

  MockFlow.activate(mockId);
  await window.startListeningMock(mockId, { fromFlow: true });
};

window.startMock = async function (mockId, options = {}) {
  MockDebug.log("startMock.enter", { mockId, options });
  if (!options.fromFlow) {
    const allowed = await requirePaidAccess({
      contentType: "separate_block",
      referenceId: `reading:${mockId}`,
      serviceName: "Reading section"
    });
    if (!allowed) return;

    MockFlow.deactivate();
  }

  hideAllScreens();
  window.__activeExamPart = "reading";
  hideAnnouncement();
  if (typeof setBottomNavVisible === "function") {
    setBottomNavVisible(false);
  }

  applyTestContentSpacing();

  if (!screenReading) return;

  screenReading.style.display = "block";
  UserReading.renderLoading(screenReading);

  try {

    const telegramId = window.getTelegramId();
    UserReading.__sessionMode = options.fromFlow ? "full_mock" : "single_block";
    MockDebug.log("startMock.api.startReading", { mockId, telegramId });
    const sessionMode = options.fromFlow ? "full_mock" : "single_block";
    const retakeParam = options.retakePaymentReferenceId
      ? `&retake=1&retake_payment_reference_id=${encodeURIComponent(options.retakePaymentReferenceId)}`
      : "";
    const data = await apiGet(`/mock-tests/${mockId}/reading/start?telegram_id=${telegramId}&session_mode=${sessionMode}${retakeParam}`);

    if (data?.already_submitted) {
      const resultPayload = {
        band: data?.result?.band ?? 0,
        correct: data?.result?.score ?? 0,
        total: data?.result?.total ?? 40
      };
      window.TestReentry?.showCompleted?.({
        container: screenReading,
        onSeeResult: () => UserReading.showResultScreen(resultPayload),
        onRetake: async () => {
          const paidRef = await confirmPaidRetake({
            mode: sessionMode,
            section: "reading",
            mockId,
            serviceName: sessionMode === "full_mock" ? "Full Mock Test" : "Reading section"
          });
          if (paidRef) await window.startMock(mockId, { ...options, retakePaymentReferenceId: paidRef });
        }
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
    const allowed = await requirePaidAccess({
      contentType: "separate_block",
      referenceId: `writing:${mockId}`,
      serviceName: "Writing section"
    });
    if (!allowed) return;

    MockFlow.deactivate();
  }

  hideAllScreens();
  window.__activeExamPart = "writing";
  hideAnnouncement();
  if (typeof setBottomNavVisible === "function") {
    setBottomNavVisible(false);
  }

  applyTestContentSpacing();

  if (!screenWriting) return;
  screenWriting.style.display = "block";

  if (!window.UserWritingLoader?.start) {
    MockDebug.log("startWritingMock.loaderMissing");
    screenWriting.innerHTML = "<p>Writing module is not loaded.</p>";
    return;
  }

  await window.UserWritingLoader.start(mockId, screenWriting, {
    sessionMode: options.fromFlow ? "full_mock" : "single_block",
    retakePaymentReferenceId: options.retakePaymentReferenceId || null,
    onRetake: async () => {
      const sessionMode = options.fromFlow ? "full_mock" : "single_block";
      const paidRef = await confirmPaidRetake({
        mode: sessionMode,
        section: "writing",
        mockId,
        serviceName: sessionMode === "full_mock" ? "Full Mock Test" : "Writing section"
      });
      if (paidRef) await window.startWritingMock(mockId, { ...options, retakePaymentReferenceId: paidRef });
    }
  });
  MockDebug.log("startWritingMock.loaderDone", { mockId });
};

window.startListeningMock = async function (mockId, options = {}) {
  MockDebug.log("startListeningMock.enter", { mockId, options });
  if (!options.fromFlow) {
    const allowed = await requirePaidAccess({
      contentType: "separate_block",
      referenceId: `listening:${mockId}`,
      serviceName: "Listening section"
    });
    if (!allowed) return;

    MockFlow.deactivate();
  }

  hideAllScreens();
  window.__activeExamPart = "listening";
  hideAnnouncement();
  if (typeof setBottomNavVisible === "function") {
    setBottomNavVisible(false);
  }

  applyTestContentSpacing();

  if (!screenReading) return;

  screenReading.style.display = "block";
  UserListening.renderLoading(screenReading);

  function mapBlockTypeToQuestionType(blockType) {
    const normalized = String(blockType || "").toLowerCase();

    if (normalized === "form_completion") return "FORM_COMPLETION";
    if (normalized === "note_completion") return "NOTE_COMPLETION";
    if (normalized === "sentence_completion") return "SENTENCE_COMPLETION";
    if (normalized === "summary_completion") return "SUMMARY_COMPLETION";
    if (normalized === "flowchart_completion") return "FLOWCHART_COMPLETION";
    if (normalized === "table_completion") return "TABLE_COMPLETION";
    if (normalized === "short_answer") return "SHORT_ANSWER";
    if (normalized === "mcq_single") return "SINGLE_CHOICE";
    if (normalized === "mcq_multiple") return "MULTI_CHOICE";
    if (normalized === "matching") return "MATCHING";
    if (normalized === "map_label") return "MAP_LABEL";
    if (normalized === "plan_label") return "PLAN_LABEL";
    if (normalized === "diagram_label") return "DIAGRAM_LABEL";
    if (normalized === "map_labeling") return "MAP_LABELING";
    if (normalized === "diagram_labeling") return "DIAGRAM_LABELING";
    if (normalized === "tfng") return "TFNG";
    if (normalized === "yes_no_ng") return "YES_NO_NG";

    return "TEXT_INPUT";
  }

  function buildSectionText(section) {
    const sectionInstructions = String(section?.instructions || "").trim();
    return sectionInstructions;
  }

  function normalizeListeningStartPayload(raw, fallbackMockId) {
    let syntheticId = 1;
    const rawSections = raw?.sections || raw?.passages || [];
    const sections = rawSections.map((section, sectionIndex) => {
      if (Array.isArray(section?.questions) && !Array.isArray(section?.blocks)) {
        return {
          ...section,
          id: section?.id || (sectionIndex + 1),
          title: section?.title || `Section ${Number(section?.section_number || sectionIndex + 1)}`,
          text: section?.text || buildSectionText(section),
          audio_url: section?.audio_url || null,
          audio_name: section?.audio_name || null,
          global_instruction_after: section?.global_instruction_after || "",
          global_instruction_after_audio_url: section?.global_instruction_after_audio_url || null,
          global_instruction_after_audio_name: section?.global_instruction_after_audio_name || null
        };
      }

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
            meta: { ...(block?.meta || {}), ...(question?.meta || {}) },
            points: 1,
            image_url: block?.image_url || null
          });
        });
      });

      return {
        id: section?.id || (sectionIndex + 1),
        title: `Section ${Number(section?.section_number || sectionIndex + 1)}`,
        text: buildSectionText(section),
        audio_url: section?.audio_url || null,
        audio_name: section?.audio_name || null,
        global_instruction_after: section?.global_instruction_after || "",
        global_instruction_after_audio_url: section?.global_instruction_after_audio_url || null,
        global_instruction_after_audio_name: section?.global_instruction_after_audio_name || null,
        image_url: null,
        questions
      };
    });

    return {
      mock_id: raw?.id || fallbackMockId,
      title: raw?.title || "Listening Test",
      global_instruction_intro: raw?.global_instruction_intro || "",
      global_instruction_intro_audio_url: raw?.global_instruction_intro_audio_url || null,
      global_instruction_intro_audio_name: raw?.global_instruction_intro_audio_name || null,
      time_limit_minutes: Number(raw?.time_limit_minutes || 60),
      timer: raw?.timer || null,
      sections
    };
  }

  try {
    const telegramId = window.getTelegramId();
    MockDebug.log("startListeningMock.api.startListening", { mockId, telegramId });
    const dataRaw = await apiGet(`/mock-tests/${mockId}/listening/start?telegram_id=${telegramId}`);
    const data = normalizeListeningStartPayload(dataRaw, mockId);

    if (!data || !Array.isArray(data.sections)) {
      UserListening.renderError(screenReading, `Invalid API response\n${JSON.stringify(dataRaw, null, 2)}`);
      return;
    }

    UserListening.renderReadiness(screenReading, data);
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
    const allowed = await requirePaidAccess({
      contentType: "separate_block",
      referenceId: `speaking:${mockId}`,
      serviceName: "Speaking section"
    });
    if (!allowed) return;

    MockFlow.deactivate();
  }

  hideAllScreens();
  window.__activeExamPart = "speaking";
  hideAnnouncement();
  if (typeof setBottomNavVisible === "function") {
    setBottomNavVisible(false);
  }

  applyTestContentSpacing();

  if (!screenSpeaking) return;
  screenSpeaking.style.display = "block";

  if (!window.UserSpeakingLoader?.start) {
    MockDebug.log("startSpeakingMock.loaderMissing");
    screenSpeaking.innerHTML = "<p>Speaking module is not loaded.</p>";
    return;
  }

  await window.UserSpeakingLoader.start(mockId, screenSpeaking, {
    sessionMode: options.fromFlow ? "full_mock" : "single_block",
    retakePaymentReferenceId: options.retakePaymentReferenceId || null,
    onRetake: async () => {
      const sessionMode = options.fromFlow ? "full_mock" : "single_block";
      const paidRef = await confirmPaidRetake({
        mode: sessionMode,
        section: "speaking",
        mockId,
        serviceName: sessionMode === "full_mock" ? "Full Mock Test" : "Speaking section"
      });
      if (paidRef) await window.startSpeakingMock(mockId, { ...options, retakePaymentReferenceId: paidRef });
    }
  });
  MockDebug.log("startSpeakingMock.loaderDone", { mockId });
};
