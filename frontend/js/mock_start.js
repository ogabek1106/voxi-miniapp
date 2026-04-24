// frontend/js/mock_start.js
window.openMockWarning = function (packId, title) {

  if (!screenMocks) return;

  screenMocks.innerHTML = `
    <h3>${title}</h3>

    <h4>IELTS Mock Test Warning</h4>

    <p style="text-align:left; line-height:1.5;">
      - The timer will start immediately<br>
      - Do not refresh the page<br>
      - Complete all sections in order
    </p>

    <button onclick="startMock(${packId})">
      Start Test
    </button>

    <button onclick="showMockList()" style="margin-top:10px;">
      Back
    </button>
  `;
};

window.startMock = async function (mockId) {

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

  } catch (e) {
    console.error(e);

    UserReading.renderError(screenReading, e);

  }

};

window.startWritingMock = async function (mockId) {
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
    screenWriting.innerHTML = "<p>Writing module is not loaded.</p>";
    return;
  }

  await window.UserWritingLoader.start(mockId, screenWriting);
};

window.startListeningMock = async function (mockId) {
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
    const dataRaw = await apiGet(`/admin/listening/mock-packs/${mockId}`);
    const data = normalizeListeningStartPayload(dataRaw, mockId);

    if (!data || !Array.isArray(data.sections)) {
      UserListening.renderError(screenReading, `Invalid API response\n${JSON.stringify(dataRaw, null, 2)}`);
      return;
    }

    UserListening.renderTest(screenReading, data);
  } catch (e) {
    console.error(e);
    UserListening.renderError(screenReading, e);
  }
};
