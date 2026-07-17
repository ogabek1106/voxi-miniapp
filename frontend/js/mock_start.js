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

function mockFlowDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchReadingStartWithRetry(url, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await apiGet(url);
    } catch (error) {
      lastError = error;
      const retryable = !error?.status || Number(error.status) >= 500;
      MockDebug.log("startMock.api.startReading.retryableError", {
        attempt,
        attempts,
        retryable,
        status: error?.status || null,
        message: error?.message || String(error)
      });
      if (!retryable || attempt >= attempts) break;
      await mockFlowDelay(900 * attempt);
    }
  }
  throw lastError;
}

const FULL_MOCK_VCOIN_COST = 10;

function formatMockUzs(amount) {
  const parsed = Number(amount);
  const normalized = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  return `${normalized.toLocaleString("ru-RU").replace(/\u00a0/g, " ")} UZS`;
}

function fullMockPriceUzs() {
  const converted = window.UzsBalance?.convertVCoinsToUzs?.(FULL_MOCK_VCOIN_COST);
  return Number.isFinite(Number(converted)) ? Number(converted) : 50000;
}

function examTelegramId() {
  if (typeof window.getExamTelegramId === "function") return window.getExamTelegramId();
  return typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
}

window.VWarningGateway = window.VWarningGateway || {};
window.IeltsEntryReturn = window.IeltsEntryReturn || {};

(function () {
  const RETURN_STORAGE_KEY = "ielts_entry_return_to";

  function normalizeReturnTarget(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (["mock", "mocks", "mock-list", "ielts-mock-test", "ielts_mock_test"].includes(raw)) return "mocks";
    if (["profile", "purchase-history", "history"].includes(raw)) return "profile";
    if (raw === "home" || raw === "homepage" || raw === "single-block") return "home";
    return "";
  }

  function inferReturnTarget(feature) {
    const params = new URLSearchParams(window.location.search);
    const origin = normalizeReturnTarget(params.get("origin"));
    if (origin) return origin;
    const returnPage = normalizeReturnTarget(params.get("return") || params.get("return_page"));
    if (returnPage) return returnPage;
    const page = String(params.get("page") || "").trim().toLowerCase();
    if (page === "ielts-mock-test") return "mocks";
    if (["reading", "listening", "writing", "speaking"].includes(page)) return "home";
    if (page === "profile") return "profile";
    return feature === "full_mock" ? "mocks" : "home";
  }

  function rememberReturnTarget(value) {
    const normalized = normalizeReturnTarget(value) || "home";
    window.IeltsEntryReturn.current = normalized;
    try {
      window.sessionStorage?.setItem?.(RETURN_STORAGE_KEY, normalized);
    } catch (_) {}
    return normalized;
  }

  function resolveReturnTarget() {
    const current = normalizeReturnTarget(window.IeltsEntryReturn.current);
    if (current) return current;
    try {
      const stored = normalizeReturnTarget(window.sessionStorage?.getItem?.(RETURN_STORAGE_KEY));
      if (stored) return stored;
    } catch (_) {}
    return "home";
  }

  function clearReturnTarget() {
    window.IeltsEntryReturn.current = "";
    try {
      window.sessionStorage?.removeItem?.(RETURN_STORAGE_KEY);
    } catch (_) {}
  }

  window.IeltsEntryReturn.remember = rememberReturnTarget;
  window.IeltsEntryReturn.resolve = resolveReturnTarget;
  window.IeltsEntryReturn.clear = clearReturnTarget;
  window.IeltsEntryReturn.goBack = function () {
    const target = resolveReturnTarget();
    clearReturnTarget();
    if (target === "mocks") {
      try {
        window.history?.replaceState?.({ page: "ielts-mock-test" }, "", "/?page=ielts-mock-test");
      } catch (_) {}
      if (typeof window.showMocksEntry === "function") {
        window.showMocksEntry();
        return;
      }
      if (typeof window.showMocksScreen === "function") {
        window.showMocksScreen();
        return;
      }
    }
    if (target === "profile" && typeof window.goProfile === "function") {
      window.goProfile();
      return;
    }
    if (typeof window.goHome === "function") {
      window.goHome();
      return;
    }
    if (window.history.length > 1) window.history.back();
  };

  const FEATURE_CONFIG = {
    full_mock: {
      label: "To'liq IELTS Mock testi",
      defaultTitle: "IELTS Mock",
      intro: "Ushbu test haqiqiy IELTS imtihoniga yaqin sharoitda o'tkaziladi. Boshlashdan oldin quyidagi ko'rsatmalarni diqqat bilan o'qing.",
      contentType: "full_mock",
      referenceId: (mockId) => String(mockId),
      duration: "Taxminan 2 soat 45 daqiqa",
      serviceName: "Full Mock Test",
      instructions: [
        "Test Listening bo'limidan boshlanadi va quyidagi qat'iy tartibda davom etadi: Listening, Reading, Writing, Speaking.",
        "Har bir bo'limdan keyin keyingi bo'limga tayyorlanish uchun qisqa o'tish vaqti beriladi.",
        "Test davomida sahifani yangilamang va ilovani yopmang.",
        "Testdan chiqib ketsangiz, vaqt to'xtamaydi.",
        "Barcha bo'limlarni tugatmaguningizcha testni tark etmaslik tavsiya etiladi.",
        "Testni boshlashdan oldin yetarli bo'sh vaqt, barqaror internet, quloqchin va ishlaydigan mikrofon tayyorlang.",
        "To'liq Mock uchun to'lov bir marta amalga oshiriladi. Ichki bo'limlar uchun qayta to'lov olinmaydi."
      ]
    },
    listening: {
      label: "IELTS Listening",
      defaultTitle: "Listening",
      intro: "Listening testi boshlangandan so'ng audio faqat bir marta ijro etiladi.",
      contentType: "separate_block",
      referenceId: (mockId) => `listening:${mockId}`,
      duration: "Taxminan 30 daqiqa",
      serviceName: "Listening section",
      instructions: [
        "Audio faqat bir marta ijro etiladi.",
        "Audioni pauza qilish, orqaga qaytarish yoki qayta eshitish mumkin emas.",
        "Boshlashdan oldin qurilma ovozini tekshiring.",
        "Quloqchin ishlatish tavsiya etiladi.",
        "Tinch joyda o'tiring va internet aloqasi barqaror ekanini tekshiring.",
        "Test davomida sahifani yangilamang va ilovani yopmang.",
        "Testdan chiqib ketsangiz, vaqt va audio jarayoni to'xtamasligi mumkin.",
        "Javoblarni belgilangan vaqt ichida yakunlang."
      ]
    },
    reading: {
      label: "IELTS Reading",
      defaultTitle: "Reading",
      intro: "Reading testi vaqt cheklovi asosida o'tkaziladi. Test boshlanishi bilan vaqt hisoblanadi.",
      contentType: "separate_block",
      referenceId: (mockId) => `reading:${mockId}`,
      duration: "60 daqiqa",
      serviceName: "Reading section",
      instructions: [
        "Test boshlanishi bilan taymer darhol ishga tushadi.",
        "Matn va savollarni diqqat bilan o'qing.",
        "Javoblarni vaqt tugashidan oldin yakunlang.",
        "Nusxa olish yoki ayrim brauzer amallari cheklangan bo'lishi mumkin.",
        "Test davomida sahifani yangilamang va ilovani yopmang.",
        "Testdan chiqib ketsangiz, vaqt to'xtamaydi.",
        "Vaqt tugaganda mavjud javoblar avtomatik tarzda topshirilishi mumkin."
      ]
    },
    writing: {
      label: "IELTS Writing",
      defaultTitle: "Writing",
      intro: "Writing testi Task 1 va Task 2 topshiriqlaridan iborat bo'lib, umumiy vaqt cheklovi asosida o'tkaziladi.",
      contentType: "separate_block",
      referenceId: (mockId) => `writing:${mockId}`,
      duration: "60 daqiqa",
      serviceName: "Writing section",
      instructions: [
        "Umumiy vaqt Task 1 va Task 2 uchun birgalikda beriladi.",
        "Har ikkala topshiriqni bajarishga vaqtni to'g'ri taqsimlang.",
        "Javoblarni vaqt tugashidan oldin yakunlang.",
        "Matn yozish yoki mavjud ruxsat etilgan yuklash usullaridan foydalaning.",
        "Yuklanadigan fayl yoki surat aniq va to'liq bo'lishi kerak.",
        "Test davomida sahifani yangilamang va ilovani yopmang.",
        "Testdan chiqib ketsangiz, vaqt to'xtamaydi.",
        "Vaqt tugaganda tugallanmagan javoblar mavjud holatida topshirilishi mumkin."
      ]
    },
    speaking: {
      label: "IELTS Speaking",
      defaultTitle: "Speaking",
      intro: "Speaking testi davomida javoblaringiz mikrofon orqali yozib olinadi.",
      contentType: "separate_block",
      referenceId: (mockId) => `speaking:${mockId}`,
      duration: "Taxminan 11-14 daqiqa",
      serviceName: "Speaking section",
      instructions: [
        "Testni boshlash uchun mikrofon ruxsati talab qilinadi.",
        "Boshlashdan oldin mikrofon ishlayotganini tekshiring.",
        "Tinch va shovqinsiz joyda o'tiring.",
        "Har bir qismda tayyorgarlik va javob berish vaqti cheklangan.",
        "Yozib olingan javobni qayta yozish yoki takrorlash imkoniyati bo'lmasligi mumkin.",
        "Test davomida sahifani yangilamang va ilovani yopmang.",
        "Ilovadan chiqish yozuv jarayonini buzishi mumkin.",
        "Qurilmani almashtirmang va boshqa ilovalarga o'tmang.",
        "Gapirishni boshlashdan oldin mikrofon ko'rsatkichi ishlayotganini tekshiring."
      ]
    }
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatUzsFromCoins(coins) {
    const amount = window.UzsBalance?.convertVCoinsToUzs?.(Number(coins || 0)) || (Number(coins || 0) * 5000);
    return window.UzsBalance?.formatUzsSpaces?.(amount) || formatMockUzs(amount);
  }

  function ensureStyles() {
    if (document.getElementById("v-warning-gateway-styles")) return;
    const style = document.createElement("style");
    style.id = "v-warning-gateway-styles";
    style.textContent = `
      .ielts-warning-page {
        width: 100%;
        min-height: calc(100vh - 96px);
        padding: clamp(24px, 4vw, 46px) clamp(18px, 4vw, 40px);
        box-sizing: border-box;
        display: grid;
        place-items: start center;
        text-align: left;
      }
      #screen-mocks.container.ielts-warning-host {
        width: 100%;
        max-width: none;
        padding-left: 0;
        padding-right: 0;
      }
      .ielts-warning-card {
        width: min(1080px, 100%);
        border-radius: 22px;
        background: #ffffff;
        border: 1px solid rgba(20,40,60,0.10);
        box-shadow: 0 10px 30px rgba(15,23,42,0.08);
        padding: clamp(28px, 4vw, 44px);
        box-sizing: border-box;
        text-align: left;
      }
      .ielts-warning-kicker {
        margin: 0 0 8px;
        color: #00a7df;
        font-size: 14px;
        font-weight: 900;
      }
      .ielts-warning-title {
        margin: 0;
        color: #111827;
        font-size: clamp(26px, 3vw, 34px);
        line-height: 1.12;
        font-weight: 950;
      }
      .ielts-warning-label {
        margin: 10px 0 0;
        color: #516173;
        font-size: clamp(16px, 1.6vw, 18px);
        font-weight: 850;
      }
      .ielts-warning-intro {
        margin: 20px 0 0;
        color: #334155;
        font-size: clamp(16px, 1.4vw, 18px);
        line-height: 1.6;
        font-weight: 650;
        max-width: 860px;
      }
      .ielts-warning-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.95fr);
        gap: clamp(26px, 3.5vw, 42px);
        margin-top: 28px;
        align-items: start;
      }
      .ielts-warning-section-title {
        margin: 0 0 12px;
        color: #111827;
        font-size: 20px;
        font-weight: 950;
      }
      .ielts-warning-list {
        margin: 0;
        padding-left: 22px;
        color: #334155;
        font-size: 16px;
        line-height: 1.65;
        font-weight: 650;
        text-align: left;
      }
      .ielts-warning-list li {
        margin: 0 0 9px;
        padding-left: 4px;
      }
      .ielts-warning-side {
        display: grid;
        gap: 12px;
        align-self: start;
      }
      .ielts-warning-info {
        border-radius: 16px;
        background: #f5f8fb;
        border: 1px solid rgba(20,40,60,0.08);
        padding: 15px 16px;
      }
      .ielts-warning-info span {
        display: block;
        color: #64748b;
        font-size: 13px;
        font-weight: 900;
        margin-bottom: 5px;
      }
      .ielts-warning-info strong {
        color: #111827;
        font-size: 20px;
        line-height: 1.2;
        font-weight: 950;
      }
      .ielts-warning-status {
        border-radius: 16px;
        background: #eef8ff;
        border: 1px solid rgba(0,186,255,0.16);
        padding: 15px 16px;
        color: #111827;
      }
      .ielts-warning-status.is-error {
        background: #fff7ed;
        border-color: rgba(249,115,22,0.2);
      }
      .ielts-warning-status-title {
        font-size: 14px;
        color: #64748b;
        font-weight: 900;
        margin-bottom: 4px;
      }
      .ielts-warning-status-value {
        font-size: 20px;
        line-height: 1.25;
        font-weight: 950;
      }
      .ielts-warning-actions {
        display: grid;
        gap: 10px;
        margin-top: 2px;
      }
      .ielts-warning-primary,
      .ielts-warning-secondary {
        width: 100%;
        min-height: 50px;
        border-radius: 14px;
        border: 0;
        font-size: 16px;
        font-weight: 950;
        cursor: pointer;
      }
      .ielts-warning-primary {
        background: #4bb7f4;
        color: #ffffff;
      }
      .ielts-warning-primary:disabled {
        opacity: 0.65;
        cursor: wait;
      }
      .ielts-warning-secondary {
        background: #eef2f7;
        color: #111827;
      }
      .ielts-warning-message {
        min-height: 18px;
        color: #c2410c;
        font-size: 14px;
        font-weight: 800;
        line-height: 1.35;
      }
      @media (max-width: 980px) {
        .ielts-warning-card {
          width: min(940px, 100%);
        }
        .ielts-warning-grid {
          grid-template-columns: minmax(0, 1.35fr) minmax(290px, 0.9fr);
          gap: 24px;
        }
      }
      @media (max-width: 820px) {
        .ielts-warning-page {
          padding: 20px 16px 30px;
        }
        .ielts-warning-card {
          width: min(720px, 100%);
          border-radius: 20px;
          padding: 24px;
        }
        .ielts-warning-grid {
          grid-template-columns: 1fr;
          gap: 20px;
        }
        .ielts-warning-side {
          max-width: none;
        }
      }
      @media (max-width: 520px) {
        .ielts-warning-page {
          min-height: auto;
          padding: 14px 12px 24px;
        }
        .ielts-warning-card {
          border-radius: 18px;
          padding: 20px;
        }
        .ielts-warning-kicker,
        .ielts-warning-title,
        .ielts-warning-label {
          text-align: center;
        }
        .ielts-warning-intro {
          margin-top: 18px;
          text-align: left;
        }
        .ielts-warning-list {
          padding-left: 20px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getHost() {
    const host = screenMocks || document.getElementById("screen-mocks") || document.getElementById("content");
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (host) {
      host.style.display = "block";
      host.classList.add("ielts-warning-host");
    }
    return host;
  }

  function releaseHost() {
    const host = screenMocks || document.getElementById("screen-mocks") || document.getElementById("content");
    host?.classList?.remove("ielts-warning-host");
  }

  function buildAccessPayload(feature, mockId, mode) {
    const config = FEATURE_CONFIG[feature] || FEATURE_CONFIG.reading;
    const isFullMockSection = mode === "full_mock" && feature !== "full_mock";
    return {
      content_type: isFullMockSection ? "separate_block" : config.contentType,
      reference_id: isFullMockSection ? config.referenceId(mockId) : config.referenceId(mockId),
      full_mock_reference_id: isFullMockSection ? String(mockId) : null
    };
  }

  async function loadAccessStatus(feature, mockId, mode) {
    const telegramId = examTelegramId();
    const payload = buildAccessPayload(feature, mockId, mode);
    return apiPost("/vcoins/access-status", {
      ...(telegramId ? { telegram_id: telegramId } : {}),
      ...payload
    });
  }

  function statusView(status, feature, mode) {
    const isFullMockSection = mode === "full_mock" && feature !== "full_mock";
    if (!status) {
      return {
        title: "Holat",
        value: "Tekshirilmoqda...",
        button: "Tekshirilmoqda...",
        disabled: true,
        insufficient: false,
        completed: false
      };
    }
    if (status.attempt_state === "completed") {
      return {
        title: "Siz ushbu testni avval topshirgansiz.",
        value: "Natijani ko'rishingiz yoki qayta topshirishingiz mumkin.",
        button: "Natijani ko'rish",
        secondary: "Qayta topshirish",
        disabled: false,
        insufficient: false,
        completed: true
      };
    }
    if (status.has_access) {
      return {
        title: "Kirish holati",
        value: status.attempt_state === "active" ? "Faol urinish davom etmoqda" : (isFullMockSection ? "To'liq Mock uchun kirish tasdiqlangan" : "Kirish tasdiqlangan"),
        button: status.attempt_state === "active" ? "Testni davom ettirish" : "Testni boshlash",
        disabled: false,
        insufficient: false,
        completed: false
      };
    }
    if (Number(status.balance || 0) < Number(status.required || 0)) {
      return {
        title: "Hisobda mablag' yetarli emas",
        value: `Yetishmayotgan summa: ${formatUzsFromCoins(status.missing || 0)}`,
        button: "Hisobni to'ldirish",
        disabled: false,
        insufficient: true,
        completed: false
      };
    }
    return {
      title: "To'lov holati",
      value: "Balansingiz yetarli. To'lov bir marta yechiladi.",
      button: "To'lovga o'tish",
      disabled: false,
      insufficient: false,
      completed: false
    };
  }

  async function ensureSpeakingPermission(messageEl) {
    if (!navigator.mediaDevices?.getUserMedia) {
      if (messageEl) messageEl.textContent = "Brauzer mikrofon ruxsatini tekshira olmadi.";
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (_) {
      if (messageEl) messageEl.textContent = "Mikrofonga ruxsat berilmadi. Speaking testini boshlash uchun mikrofonni yoqing.";
      return false;
    }
  }

  function startFeature(feature, mockId, mode, meta = {}) {
    const options = {
      fromGateway: true,
      returnTo: meta.returnTo || window.IeltsEntryReturn.resolve?.() || "home",
      resumeActive: !!meta.resumeActive,
      retakePaymentReferenceId: meta.retakePaymentReferenceId || null
    };
    if (mode === "full_mock" && feature !== "full_mock") options.fromFlow = true;
    if (feature === "full_mock") return window.startFullMock?.(mockId, options);
    if (feature === "listening") return window.startListeningMock?.(mockId, options);
    if (feature === "reading") return window.startMock?.(mockId, options);
    if (feature === "writing") return window.startWritingMock?.(mockId, options);
    if (feature === "speaking") return window.startSpeakingMock?.(mockId, options);
  }

  function render({ feature, mockId, title, mode, status }) {
    ensureStyles();
    const config = FEATURE_CONFIG[feature] || FEATURE_CONFIG.reading;
    const host = getHost();
    if (!host) return;
    const view = statusView(status, feature, mode);
    const price = formatUzsFromCoins(status?.required ?? (feature === "full_mock" ? FULL_MOCK_VCOIN_COST : 3));
    const balance = formatUzsFromCoins(status?.balance || 0);
    host.innerHTML = `
      <div class="ielts-warning-page">
        <section class="ielts-warning-card" aria-labelledby="ielts-warning-title">
          <p class="ielts-warning-kicker">Testni boshlashdan oldin</p>
          <h1 class="ielts-warning-title" id="ielts-warning-title">${escapeHtml(title || config.defaultTitle)}</h1>
          <p class="ielts-warning-label">${escapeHtml(config.label)}</p>
          <p class="ielts-warning-intro">${escapeHtml(config.intro)}</p>
          <div class="ielts-warning-grid">
            <div>
              <h2 class="ielts-warning-section-title">Muhim ko'rsatmalar</h2>
              <ul class="ielts-warning-list">
                ${config.instructions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </div>
            <aside class="ielts-warning-side">
              <div class="ielts-warning-info">
                <span>Davomiyligi</span>
                <strong>${escapeHtml(config.duration)}</strong>
              </div>
              <div class="ielts-warning-info">
                <span>Test narxi</span>
                <strong>${price}</strong>
              </div>
              ${view.insufficient ? `
                <div class="ielts-warning-info">
                  <span>Hisobingizda</span>
                  <strong>${balance}</strong>
                </div>
              ` : ""}
              <div class="ielts-warning-status ${view.insufficient ? "is-error" : ""}">
                <div class="ielts-warning-status-title">${escapeHtml(view.title)}</div>
                <div class="ielts-warning-status-value">${escapeHtml(view.value)}</div>
              </div>
              <div class="ielts-warning-actions">
                <button class="ielts-warning-primary" id="ielts-warning-primary" ${view.disabled ? "disabled" : ""}>${escapeHtml(view.button)}</button>
                <button class="ielts-warning-secondary" id="ielts-warning-back">${escapeHtml(view.secondary || "Orqaga")}</button>
                <div class="ielts-warning-message" id="ielts-warning-message"></div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    `;
    document.getElementById("ielts-warning-back").onclick = () => {
      if (view.completed) {
        (async function () {
          const paidRef = await confirmPaidRetake({
            mode: feature === "full_mock" ? "full_mock" : "single_block",
            section: feature === "full_mock" ? "full" : feature,
            mockId,
            serviceName: config.serviceName
          });
          if (paidRef) {
            await startFeature(feature, mockId, mode, { title, retakePaymentReferenceId: paidRef });
          }
        })();
        return;
      }
      releaseHost();
      window.IeltsEntryReturn?.goBack?.();
    };
    document.getElementById("ielts-warning-primary").onclick = async () => {
      const button = document.getElementById("ielts-warning-primary");
      const messageEl = document.getElementById("ielts-warning-message");
      if (!button) return;
      button.disabled = true;
      if (messageEl) messageEl.textContent = "";
      try {
        if (view.insufficient) {
          window.UzsBalance?.showInsufficientFunds?.({
            required: Number(status?.required || 0),
            balance: Number(status?.balance || 0),
            contentType: status?.content_type || buildAccessPayload(feature, mockId, mode).content_type,
            referenceId: status?.reference_id || buildAccessPayload(feature, mockId, mode).reference_id,
            serviceName: config.serviceName
          });
          return;
        }
        if (feature === "speaking") {
          const allowed = await ensureSpeakingPermission(messageEl);
          if (!allowed) return;
        }
        await startFeature(feature, mockId, mode, { title });
      } finally {
        button.disabled = false;
      }
    };
  }

  window.VWarningGateway.open = async function ({ feature, mockId, title = "", mode = "single_block", returnTo = "", origin = "" } = {}) {
    const normalizedFeature = FEATURE_CONFIG[feature] ? feature : "reading";
    const safeMockId = Number(mockId || 0);
    if (!safeMockId) return;
    const normalizedMode = mode === "full_mock" ? "full_mock" : "single_block";
    rememberReturnTarget(returnTo || origin || inferReturnTarget(normalizedFeature));
    render({ feature: normalizedFeature, mockId: safeMockId, title, mode: normalizedMode, status: null });
    try {
      const status = await loadAccessStatus(normalizedFeature, safeMockId, normalizedMode);
      render({ feature: normalizedFeature, mockId: safeMockId, title, mode: normalizedMode, status });
    } catch (error) {
      render({ feature: normalizedFeature, mockId: safeMockId, title, mode: normalizedMode, status: null });
      const messageEl = document.getElementById("ielts-warning-message");
      if (messageEl) messageEl.textContent = "Kirish holatini tekshirib bo'lmadi. Iltimos, qayta urinib ko'ring.";
    }
  };
  window.VWarningGateway.loadStatus = async function ({ feature, mockId, mode = "single_block" } = {}) {
    const normalizedFeature = FEATURE_CONFIG[feature] ? feature : "reading";
    const safeMockId = Number(mockId || 0);
    if (!safeMockId) return null;
    const normalizedMode = mode === "full_mock" ? "full_mock" : "single_block";
    return loadAccessStatus(normalizedFeature, safeMockId, normalizedMode);
  };
})();

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
  window.VWarningGateway?.open?.({
    feature: "full_mock",
    mockId: packId,
    title,
    returnTo: "mocks"
  });
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

window.startFullMock = async function (mockId, options = {}) {
  MockDebug.log("startFullMock.enter", { mockId });
  if (!options.fromGateway) {
    const status = await window.VWarningGateway?.loadStatus?.({ feature: "full_mock", mockId, mode: "single_block" });
    if (status?.attempt_state === "active") {
      return window.startFullMock(mockId, { ...options, fromGateway: true, resumeActive: true });
    }
    window.VWarningGateway?.open?.({
      feature: "full_mock",
      mockId,
      title: options.title || `IELTS Mock №${String(mockId).padStart(2, "0")}`,
      returnTo: options.returnTo
    });
    return;
  }
  window.IeltsEntryReturn?.remember?.(options.returnTo || "mocks");
  if (await window.PremiereUi?.interceptIfPremiere?.(mockId)) {
    return;
  }
  const telegramId = examTelegramId();
  if (telegramId && !window.__isAdmin && !options.retakePaymentReferenceId) {
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
  if (!options.resumeActive) {
    const allowed = await requirePaidAccess({
      contentType: "full_mock",
      referenceId: options.retakePaymentReferenceId || mockId,
      serviceName: "Full Mock Test"
    });
    if (!allowed) return;
  }

  MockFlow.activate(mockId, { retakePaymentReferenceId: options.retakePaymentReferenceId || null });
  await window.startListeningMock(mockId, { fromFlow: true, returnTo: options.returnTo || window.IeltsEntryReturn?.resolve?.(), retakePaymentReferenceId: options.retakePaymentReferenceId || null });
};

window.startMock = async function (mockId, options = {}) {
  MockDebug.log("startMock.enter", { mockId, options });
  if (!options.fromGateway && !options.fromFlow) {
    const status = await window.VWarningGateway?.loadStatus?.({ feature: "reading", mockId, mode: "single_block" });
    if (status?.attempt_state === "active") {
      return window.startMock(mockId, { ...options, fromGateway: true, resumeActive: true });
    }
    window.VWarningGateway?.open?.({
      feature: "reading",
      mockId,
      title: options.title || "IELTS Reading",
      returnTo: options.returnTo
    });
    return;
  }
  if (!options.fromFlow) window.IeltsEntryReturn?.remember?.(options.returnTo || "home");
  if (!options.fromFlow) {
    if (await window.PremiereUi?.interceptIfPremiere?.(mockId)) {
      return;
    }
    if (!options.resumeActive) {
      const allowed = await requirePaidAccess({
        contentType: "separate_block",
        referenceId: options.retakePaymentReferenceId || `reading:${mockId}`,
        serviceName: "Reading section"
      });
      if (!allowed) return;
    }

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

    const telegramId = examTelegramId();
    UserReading.__sessionMode = options.fromFlow ? "full_mock" : "single_block";
    MockDebug.log("startMock.api.startReading", { mockId, telegramId });
    const sessionMode = options.fromFlow ? "full_mock" : "single_block";
    const retakeParam = options.retakePaymentReferenceId
      ? `&retake=1&retake_payment_reference_id=${encodeURIComponent(options.retakePaymentReferenceId)}`
      : "";
    const data = await fetchReadingStartWithRetry(`/mock-tests/${mockId}/reading/start?telegram_id=${telegramId}&session_mode=${sessionMode}${retakeParam}`);

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
  if (!options.fromGateway && !options.fromFlow) {
    const status = await window.VWarningGateway?.loadStatus?.({ feature: "writing", mockId, mode: "single_block" });
    if (status?.attempt_state === "active") {
      return window.startWritingMock(mockId, { ...options, fromGateway: true, resumeActive: true });
    }
    window.VWarningGateway?.open?.({
      feature: "writing",
      mockId,
      title: options.title || "IELTS Writing",
      returnTo: options.returnTo
    });
    return;
  }
  if (!options.fromFlow) window.IeltsEntryReturn?.remember?.(options.returnTo || "home");
  if (!options.fromFlow) {
    if (await window.PremiereUi?.interceptIfPremiere?.(mockId)) {
      return;
    }
    if (!options.resumeActive) {
      const allowed = await requirePaidAccess({
        contentType: "separate_block",
        referenceId: options.retakePaymentReferenceId || `writing:${mockId}`,
        serviceName: "Writing section"
      });
      if (!allowed) return;
    }

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
  if (!options.fromGateway && !options.fromFlow) {
    const status = await window.VWarningGateway?.loadStatus?.({ feature: "listening", mockId, mode: "single_block" });
    if (status?.attempt_state === "active") {
      return window.startListeningMock(mockId, { ...options, fromGateway: true, resumeActive: true });
    }
    window.VWarningGateway?.open?.({
      feature: "listening",
      mockId,
      title: options.title || "IELTS Listening",
      returnTo: options.returnTo
    });
    return;
  }
  if (!options.fromFlow) window.IeltsEntryReturn?.remember?.(options.returnTo || "home");
  if (!options.fromFlow) {
    if (await window.PremiereUi?.interceptIfPremiere?.(mockId)) {
      return;
    }
    if (!options.resumeActive) {
      const allowed = await requirePaidAccess({
        contentType: "separate_block",
        referenceId: options.retakePaymentReferenceId || `listening:${mockId}`,
        serviceName: "Listening section"
      });
      if (!allowed) return;
    }

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
  UserListening.__sessionMode = options.fromFlow ? "full_mock" : "single_block";
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
    const telegramId = examTelegramId();
    MockDebug.log("startListeningMock.api.startListening", { mockId, telegramId });
    const sessionMode = encodeURIComponent(UserListening.__sessionMode || "single_block");
    const retakeParam = options.retakePaymentReferenceId
      ? `&retake=1&retake_payment_reference_id=${encodeURIComponent(options.retakePaymentReferenceId)}`
      : "";
    const dataRaw = await apiGet(`/mock-tests/${mockId}/listening/start?telegram_id=${telegramId}&session_mode=${sessionMode}${retakeParam}`);
    const data = normalizeListeningStartPayload(dataRaw, mockId);
    if (options.fromFlow) {
      data.mock_pack_id = mockId;
    }

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
  if (!options.fromGateway && !options.fromFlow) {
    const status = await window.VWarningGateway?.loadStatus?.({ feature: "speaking", mockId, mode: "single_block" });
    if (status?.attempt_state === "active") {
      return window.startSpeakingMock(mockId, { ...options, fromGateway: true, resumeActive: true });
    }
    window.VWarningGateway?.open?.({
      feature: "speaking",
      mockId,
      title: options.title || "IELTS Speaking",
      returnTo: options.returnTo
    });
    return;
  }
  if (!options.fromFlow) window.IeltsEntryReturn?.remember?.(options.returnTo || "home");
  if (!options.fromFlow) {
    if (await window.PremiereUi?.interceptIfPremiere?.(mockId)) {
      return;
    }
    if (!options.resumeActive) {
      const allowed = await requirePaidAccess({
        contentType: "separate_block",
        referenceId: options.retakePaymentReferenceId || `speaking:${mockId}`,
        serviceName: "Speaking section"
      });
      if (!allowed) return;
    }

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
