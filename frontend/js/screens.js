// frontend/js/screens.js
let screenName;
let screenHome;
let screenMocks;
let screenProfile;
let screenReading;
let screenWriting;
let screenSpeaking;

document.addEventListener("DOMContentLoaded", () => {
  screenName = document.getElementById("screen-name");
  screenHome = document.getElementById("screen-home");
  screenMocks = document.getElementById("screen-mocks");
  screenProfile = document.getElementById("screen-profile");
  screenReading = document.getElementById("screen-reading");
  screenWriting = document.getElementById("screen-writing");
  screenSpeaking = document.getElementById("screen-speaking");

  const btnHome = document.getElementById("btn-home");
  const btnProfile = document.getElementById("btn-profile");

  if (btnHome) btnHome.addEventListener("click", navigateToHome);
  if (btnProfile) btnProfile.addEventListener("click", () => navigateToFeature("profile"));
  const btnMockPacks = document.getElementById("btn-mock-packs");
  if (btnMockPacks) btnMockPacks.addEventListener("click", showAdminMockPacks);
});

const FEATURE_ROUTES = {
  "ielts-mock-test": () => window.showMocksEntry?.(),
  reading: () => window.showReadingEntry?.(),
  listening: () => window.showListeningEntry?.(),
  writing: () => window.showWritingEntry?.(),
  speaking: () => window.showSpeakingEntry?.(),
  "shadow-writing": () => window.showShadowWritingEntry?.(),
  "odd-one-out": () => window.showVocabularyOddOneOutEntry?.(),
  "word-shuffle": () => window.showWordShuffleEntry?.(),
  "match-words": () => window.showMatchWordsEntry?.(),
  profile: () => window.goProfile?.(),
  "v-paygate": () => window.VPayGate?.openFromRoute?.(),
};

function routeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function routeUrl(page) {
  const key = routeKey(page);
  const url = new URL(window.location.href);
  url.pathname = "/";
  url.searchParams.delete("open");
  url.searchParams.delete("page");
  if (key) url.searchParams.set("page", key);
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}`;
}

window.openFeatureByRoute = function (page) {
  const key = routeKey(page);
  const handler = FEATURE_ROUTES[key];
  if (!handler) {
    window.goHome?.();
    return false;
  }
  handler();
  return true;
};

window.navigateToFeature = function (page) {
  const key = routeKey(page);
  if (!FEATURE_ROUTES[key]) {
    window.goHome?.();
    return false;
  }
  history.pushState({ page: key }, "", routeUrl(key));
  return window.openFeatureByRoute(key);
};

window.renderHomePage = function () {
  window.goHome?.();
};

window.navigateToHome = function () {
  history.pushState({}, "", "/");
  window.renderHomePage();
};

window.VoxiRouter = window.VoxiRouter || {};
window.VoxiRouter.restoreInitialRoute = function () {
  const params = new URLSearchParams(window.location.search);
  const page = routeKey(params.get("page"));
  if (!page) {
    history.replaceState({}, "", "/");
    return false;
  }
  history.replaceState({ page }, "", routeUrl(page));
  return window.openFeatureByRoute(page);
};

window.addEventListener("popstate", () => {
  const params = new URLSearchParams(window.location.search);
  const page = routeKey(params.get("page"));
  if (!page) {
    window.renderHomePage();
    return;
  }
  window.openFeatureByRoute(page);
});

function hideAllScreens() {
  window.VoxiFeedback?.cancelPending?.();
  window.AdminLiveDashboardLoader?.stop?.();
  window.AdminContentEngineLoader?.stop?.();
  if (window.MockTransitionPage?.cleanup) {
    window.MockTransitionPage.cleanup();
  }
  if (screenName) screenName.style.display = "none";
  if (screenHome) screenHome.style.display = "none";
  if (screenMocks) screenMocks.style.display = "none";
  if (screenProfile) screenProfile.style.display = "none";
  if (screenReading) screenReading.style.display = "none";
  if (screenWriting) screenWriting.style.display = "none";
  if (screenSpeaking) screenSpeaking.style.display = "none";
  document.getElementById("screen-v-paygate")?.style.setProperty("display", "none");
  document.body.classList.remove("vpaygate-active");
  document.documentElement.classList.remove("vpaygate-active");
  if (screenMocks) screenMocks.classList.remove("shadow-writing-host");
  if (screenMocks) screenMocks.classList.remove("vocab-ooo-host");
  if (screenMocks) screenMocks.classList.remove("admin-live-host");
  if (screenMocks) screenMocks.classList.remove("admin-content-engine-host");
  if (screenMocks) screenMocks.classList.remove("admin-learning-host");
  if (screenMocks) screenMocks.classList.remove("ielts-warning-host");
  document.body.classList.remove("vocab-ooo-active");
  document.body.classList.remove("match-words-active");
  document.documentElement.classList.remove("match-words-active");
}
window.hideAllScreens = hideAllScreens;
function setBottomNavVisible(visible) {
  const nav = document.querySelector(".bottom-nav");
  if (!nav) return;

  nav.style.display = visible ? "flex" : "none";
}
window.goHome = function () {
  history.replaceState({}, "", routeUrl(""));
  hideAllScreens();
  showAnnouncement();
  if (screenHome) screenHome.style.display = "block";
  setBottomNavVisible(true);
  setActiveNav(0);
  if (typeof window.refreshVcoinBalance === "function") {
    window.refreshVcoinBalance({ animate: true });
  }
  window.PremiereLoader?.load?.();
  window.VoxiFeedback?.requestFeedback?.({
    featureType: "homepage_idle",
    contextKey: "homepage_idle",
    contextLabel: "Voxi Home",
    delayMs: 10 * 60 * 1000,
  });
};

window.goProfile = function () {
  hideAllScreens();
  hideAnnouncement();
  if (screenProfile) {
    screenProfile.style.display = "block";
    renderProfile();
  }
  setBottomNavVisible(true);
  setActiveNav(1);
  window.VoxiFeedback?.requestFeedback?.({
    featureType: "profile_idle",
    contextKey: "profile_idle",
    contextLabel: "Profile",
    delayMs: 10 * 60 * 1000,
  });
};
function setActiveNav(index) {
  const buttons = document.querySelectorAll(".nav-btn");
  buttons.forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
  });
}

window.showMocksScreen = function () {
  const content = document.getElementById("content");
  if (content) content.style.padding = "12px 16px";
  hideAllScreens();
  hideAnnouncement();
  screenMocks.style.display = "block";
  setBottomNavVisible(false);
  showMockList();
};

window.showMocksEntry = function () {
  if (!window.VoxiAuthGate?.requireAuth?.({
    feature: "full-mock",
    onSuccess: () => window.showMocksEntry(),
  })) {
    return;
  }

  window.showMocksScreen();
};

window.showReadingEntry = async function () {
  if (!window.VoxiAuthGate?.requireAuth?.({
    feature: "reading",
    onSuccess: () => window.showReadingEntry(),
  })) {
    return;
  }

  try {
    const mocks = await apiGet("/mock/list");
    if (!Array.isArray(mocks) || !mocks.length) {
      alert("No reading mocks available.");
      return;
    }

    const latestPublishedMock = mocks
      .map((item) => ({
        id: Number(item?.id || 0),
        title: item?.title || ""
      }))
      .filter((item) => item.id > 0)
      .sort((a, b) => b.id - a.id)[0];

    const mockId = Number(latestPublishedMock?.id || 0);
    if (!mockId) {
      alert("No reading mocks available.");
      return;
    }

    startMock(mockId, { title: latestPublishedMock.title || "IELTS Reading", returnTo: "home" });
  } catch (error) {
    console.error("Reading quick entry error:", error);
    alert("Failed to open reading.");
  }
};

window.showWritingEntry = async function () {
  if (!window.VoxiAuthGate?.requireAuth?.({
    feature: "writing",
    onSuccess: () => window.showWritingEntry(),
  })) {
    return;
  }

  try {
    const mocks = await apiGet("/mock/writing-list");
    if (!Array.isArray(mocks) || !mocks.length) {
      alert("No writing mocks available.");
      return;
    }

    const latestPublishedMock = mocks
      .map((item) => ({
        id: Number(item?.id || 0),
        title: item?.title || ""
      }))
      .filter((item) => item.id > 0)
      .sort((a, b) => b.id - a.id)[0];

    const mockId = Number(latestPublishedMock?.id || 0);
    if (!mockId) {
      alert("No writing mocks available.");
      return;
    }

    if (typeof window.startWritingMock === "function") {
      window.startWritingMock(mockId, { title: latestPublishedMock.title || "IELTS Writing", returnTo: "home" });
      return;
    }

    alert("Writing module is not loaded.");
  } catch (error) {
    console.error("Writing quick entry error:", error);
    alert("Failed to open writing.");
  }
};

window.showSpeakingEntry = async function () {
  if (!window.VoxiAuthGate?.requireAuth?.({
    feature: "speaking",
    onSuccess: () => window.showSpeakingEntry(),
  })) {
    return;
  }

  try {
    const mocks = await apiGet("/mock/speaking-list");
    if (!Array.isArray(mocks) || !mocks.length) {
      alert("No speaking mocks available.");
      return;
    }

    const latestPublishedMock = mocks
      .map((item) => ({
        id: Number(item?.id || 0),
        title: item?.title || ""
      }))
      .filter((item) => item.id > 0)
      .sort((a, b) => b.id - a.id)[0];

    const mockId = Number(latestPublishedMock?.id || 0);
    if (!mockId) {
      alert("No speaking mocks available.");
      return;
    }

    if (typeof window.startSpeakingMock === "function") {
      window.startSpeakingMock(mockId, { title: latestPublishedMock.title || "IELTS Speaking", returnTo: "home" });
      return;
    }

    alert("Speaking module is not loaded.");
  } catch (error) {
    console.error("Speaking quick entry error:", error);
    alert("Failed to open speaking.");
  }
};

window.showListeningEntry = async function () {
  if (!window.VoxiAuthGate?.requireAuth?.({
    feature: "listening",
    onSuccess: () => window.showListeningEntry(),
  })) {
    return;
  }

  try {
    const mocks = await apiGet("/mock/list");
    if (!Array.isArray(mocks) || !mocks.length) {
      alert("No listening mocks available.");
      return;
    }

    const mockId = Number(mocks[0]?.id || 0);
    if (!mockId) {
      alert("No listening mock found.");
      return;
    }

    if (typeof window.startListeningMock === "function") {
      window.startListeningMock(mockId, { title: mocks[0]?.title || "IELTS Listening", returnTo: "home" });
      return;
    }
  } catch (error) {
    console.error("Listening quick entry error:", error);
  }

  alert("Failed to open listening.");
};

function render(html) {
  if (!screenMocks) return;
  screenMocks.innerHTML = html;
}

function hideAnnouncement() {
  const el = document.getElementById("announcement");
  if (!el) return;
  el.style.display = "none";
  el.classList.remove("has-image");
}

function renderAnnouncementData(data) {
  const el = document.getElementById("announcement");
  const textEl = document.getElementById("announcement-text");
  const imageEl = document.getElementById("announcement-image");
  const mediaEl = document.getElementById("announcement-media");
  if (!el || !textEl || !imageEl || !mediaEl) return;

  const text = (data?.text || "").trim();
  const imageUrl = (data?.image_url || "").trim();
  const hasContent = Boolean(text || imageUrl);

  if (!hasContent) {
    hideAnnouncement();
    return;
  }

  textEl.textContent = text || "";
  textEl.style.display = text ? "inline" : "none";

  if (imageUrl) {
    imageEl.src = imageUrl.startsWith("http") ? imageUrl : `${window.API}${imageUrl}`;
    mediaEl.style.display = "block";
    el.classList.add("has-image");
  } else {
    imageEl.removeAttribute("src");
    mediaEl.style.display = "none";
    el.classList.remove("has-image");
  }

  el.style.display = "flex";
}

async function showAnnouncement() {
  try {
    const data = await apiGet("/announcement");
    renderAnnouncementData(data);
  } catch (err) {
    console.error("Failed to load announcement:", err);
    hideAnnouncement();
  }
}

function renderMatchWordsAssetLoading() {
  hideAllScreens();
  hideAnnouncement();
  setBottomNavVisible(false);
  if (!screenMocks) return;
  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <div style="min-height:calc(100vh - 140px);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:#F5F9FC;">
      <div style="display:grid;gap:14px;justify-items:center;text-align:center;">
        <div class="initial-loader-ring" aria-hidden="true"></div>
        <strong style="display:block;color:#17212b;font-size:20px;font-weight:950;">Preparing Match Words...</strong>
      </div>
    </div>
  `;
}

window.loadMatchWordsGameAssets = window.loadMatchWordsGameAssets || (async function () {
  const cssFiles = [
    "css/match_words.css?v=public-4",
  ];
  const scriptFiles = [
    "/js/games/match_words/api/api.js?v=public-2",
    "/js/games/match_words/state/state.js?v=public-2",
    "/js/games/match_words/animations/cards.js?v=public-2",
    "/js/games/match_words/ui/render.js?v=public-4",
    "/js/games/match_words/core/combo.js?v=public-2",
    "/js/games/match_words/core/timer.js?v=public-2",
    "/js/games/match_words/core/engine.js?v=public-2",
    "/js/games/match_words/loader/loader.js?v=public-2",
  ];

  cssFiles.forEach((href) => {
    if (document.querySelector(`link[data-match-words-asset="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.matchWordsAsset = href;
    document.head.appendChild(link);
  });

  for (const src of scriptFiles) {
    if (document.querySelector(`script[data-match-words-asset="${src}"]`)) continue;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.dataset.matchWordsAsset = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }
});

window.showMatchWordsEntry = async function () {
  try {
    renderMatchWordsAssetLoading();
    await window.loadMatchWordsGameAssets();
    window.MatchWordsState?.set?.({ returnToAdmin: false });
    window.MatchWordsLoader?.start?.();
  } catch (error) {
    console.error("Match Words load failed:", error);
    alert("Could not load Match Words.");
  }
};

window.loadMatchWordsAdminAssets = window.loadMatchWordsAdminAssets || (async function () {
  await window.loadMatchWordsGameAssets();
  const cssFiles = [
    "css/admin_match_words.css?v=public-2",
  ];
  const scriptFiles = [
    "/js/admin_match_words/api.js?v=public-2",
    "/js/admin_match_words/state.js?v=public-2",
    "/js/admin_match_words/ui.js?v=public-2",
    "/js/admin_match_words/form.js?v=public-2",
    "/js/admin_match_words/list.js?v=public-2",
    "/js/admin_match_words/loader.js?v=public-2",
    "/js/admin_match_words_stats/api.js?v=public-2",
    "/js/admin_match_words_stats/state.js?v=public-2",
    "/js/admin_match_words_stats/ui.js?v=public-2",
    "/js/admin_match_words_stats/table.js?v=public-2",
    "/js/admin_match_words_stats/loader.js?v=public-2",
  ];

  cssFiles.forEach((href) => {
    if (document.querySelector(`link[data-match-words-asset="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.matchWordsAsset = href;
    document.head.appendChild(link);
  });

  for (const src of scriptFiles) {
    if (document.querySelector(`script[data-match-words-asset="${src}"]`)) continue;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.dataset.matchWordsAsset = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }
});

window.showAdminMatchWords = async function () {
  try {
    await window.loadMatchWordsAdminAssets();
    window.AdminMatchWordsLoader?.show?.();
  } catch (error) {
    console.error("Match Words admin load failed:", error);
    alert("Could not load Match Words admin tools.");
  }
};

window.showAdminPanel = function () {
  hideAllScreens();
  hideAnnouncement();
  setBottomNavVisible(false);
  if (!screenMocks) return;

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <h3>🛠 Admin Panel</h3>
    <button onclick="showAdminMockPacks()">📦 MOCK Packs</button>
    <button onclick="showAdminLiveDashboard()">Live Dashboard</button>
    <button onclick="showAdminShadowWriting()">Shadow Writing Essays</button>
    <button onclick="showAdminShadowWritingStats()">Shadow Writing Stats</button>
    <button onclick="showAdminVocabularyOddOneOut()">Vocabulary Odd One Out</button>
    <button onclick="showAdminVocabularyOddOneOutStats()">Odd One Out Stats</button>
    <button onclick="showAdminWordMerge()">Voxi Word Merge</button>
    <button onclick="showAdminWordShuffle()">Voxi Word Shuffle</button>
    <button onclick="showAdminWordShuffleStats()">Word Shuffle Stats</button>
    <button onclick="showAdminMatchWords()">Match Words</button>
    <button onclick="loadMatchWordsAdminAssets().then(() => showAdminMatchWordsStats())">Match Words Stats</button>
    <button onclick="showAdminGamification()">Gamification</button>
    <button onclick="showAdminLearningPlan()">Learning Plan</button>
    <button onclick="showAdminFeedbackRatings()">Feedback Ratings</button>
    <button onclick="showAdminContentEngine()">Voxi Content Engine</button>
    <button onclick="showAdminTransactions()">Transactions</button>
    <button onclick="showAdminVCoinPayments()">V-Coin Payments</button>
    <button onclick="showAdminPremiereSubscriptions()">Premiere Subscriptions</button>
    <button onclick="showAdminNotifications()">Notifications</button>
    <button onclick="showAnnouncementAdmin()">📢 Announcement</button>
    <button onclick="showDbStats()">📊 Database Stats</button>
    <button onclick="goHome()">⬅ Back</button>
  `;
};

window.showAnnouncementAdmin = async function () {
  const telegramId = window.getTelegramId?.();
  if (!telegramId) return alert("Open inside Telegram");

  hideAllScreens();
  hideAnnouncement();
  setBottomNavVisible(false);
  if (!screenMocks) return;

  let data = { text: "", image_url: "" };
  try {
    data = await apiGet(`/__admin/announcement?telegram_id=${telegramId}`);
  } catch (e) {
    console.error("Failed to load admin announcement:", e);
  }

  const currentText = data?.text || "";
  const currentImage = data?.image_url || "";
  const previewSrc = currentImage
    ? (currentImage.startsWith("http") ? currentImage : `${window.API}${currentImage}`)
    : "";

  screenMocks.style.display = "block";
  screenMocks.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
      <h3 style="margin:0;">📢 Announcement</h3>
      <label style="font-size:13px; color:#607080; font-weight:700;">Text</label>
      <textarea id="announcement-admin-text" placeholder="Announcement text..." style="width:100%; min-height:84px; box-sizing:border-box; border-radius:12px; border:1px solid rgba(20,40,60,0.12); padding:10px;">${currentText}</textarea>
      <label style="font-size:13px; color:#607080; font-weight:700;">Image (optional)</label>
      <input id="announcement-admin-file" type="file" accept="image/*" style="width:100%;">
      <img id="announcement-admin-preview" src="${previewSrc}" style="display:${previewSrc ? "block" : "none"}; width:100%; max-height:220px; object-fit:contain; border-radius:12px; background:#fff; border:1px solid rgba(20,40,60,0.08);" />
      <div style="display:flex; gap:10px;">
        <button onclick="saveAnnouncementAdmin()" style="margin:0;">Save</button>
        <button onclick="clearAnnouncementAdmin()" style="margin:0; background:#e5e7eb; color:#17212B;">Clear</button>
      </div>
      <button onclick="showAdminPanel()" style="margin:0; background:#eef2f7; color:#17212B;">⬅ Back</button>
    </div>
  `;

  const previewEl = document.getElementById("announcement-admin-preview");
  if (previewEl) {
    previewEl.dataset.imageUrl = currentImage || "";
  }
};

async function uploadAnnouncementImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${window.API}/admin/upload-image`, {
    method: "POST",
    body: fd
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "Upload failed");
  return JSON.parse(text);
}

window.saveAnnouncementAdmin = async function () {
  const telegramId = window.getTelegramId?.();
  if (!telegramId) return alert("Open inside Telegram");

  const textEl = document.getElementById("announcement-admin-text");
  const fileEl = document.getElementById("announcement-admin-file");
  const previewEl = document.getElementById("announcement-admin-preview");
  if (!textEl || !fileEl || !previewEl) return;

  try {
    let imageUrl = previewEl.dataset.imageUrl || "";
    const file = fileEl.files?.[0];
    if (file) {
      const up = await uploadAnnouncementImage(file);
      imageUrl = up.url || "";
    }

    await apiPost(`/__admin/announcement?telegram_id=${telegramId}`, {
      text: textEl.value.trim(),
      image_url: imageUrl
    });
    alert("Announcement saved");
    await showAnnouncementAdmin();
  } catch (e) {
    console.error("Save announcement failed:", e);
    alert("Failed to save announcement");
  }
};

window.clearAnnouncementAdmin = async function () {
  const telegramId = window.getTelegramId?.();
  if (!telegramId) return alert("Open inside Telegram");

  try {
    await apiPost(`/__admin/announcement?telegram_id=${telegramId}`, {
      text: "",
      image_url: ""
    });
    alert("Announcement cleared");
    await showAnnouncementAdmin();
  } catch (e) {
    console.error("Clear announcement failed:", e);
    alert("Failed to clear announcement");
  }
};

window.showDbStats = async function () {
  const telegramId = window.getTelegramId?.();
  if (!telegramId) return alert("Open inside Telegram");

  hideAllScreens();
  hideAnnouncement();
  setBottomNavVisible(false);
  try {
    const data = await apiGet(`/__admin/users?telegram_id=${telegramId}`);

    const rows = data.users.map(u => `
      <div style="
        padding: 10px 8px;
        border-bottom: 1px solid #e5e5ea;
        text-align: left;
        font-size: 14px;
      ">
        <b>#${u.id}</b> — ${u.name}
      </div>
    `).join("");

    screenMocks.style.display = "block";
    screenMocks.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%;">
        <h3 style="margin-bottom:6px;">📊 Database Stats</h3>
        <p style="margin:0 0 8px 0;">Users: <b>${data.total}</b></p>
        <div style="height:1px; background:#e5e5ea; margin:8px 0;"></div>

        <div style="
          flex:1;
          overflow-y:auto;
          border:1px solid #e5e5ea;
          border-radius:8px;
        ">
          ${rows || "<p style='padding:12px;'>No users yet</p>"}
        </div>

        <button style="margin-top:12px;" onclick="showAdminPanel()">⬅ Back</button>
      </div>
    `;
  } catch (e) {
    console.error(e);
    alert("Failed to load database stats");
  }
};

async function renderProfile() {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  if (!telegramId) {
    screenProfile.innerHTML = `<p>Open this inside Telegram</p>`;
    return;
  }

  try {
    const me = await apiGet(`/me?telegram_id=${telegramId}`);
    const lastActivityHtml = window.ProfileUI?.renderLastActivity(me.last_activity) || "";

    const name = me.name || "";
    const surname = me.surname || "";
    const fullName = [name, surname].filter(Boolean).join(" ") || "Profile";
    const safeFullName = window.ProfileUI?.escapeHtml ? window.ProfileUI.escapeHtml(fullName) : fullName;
    const vCoins = Number(me.v_coins || 0);
    const activityList = Array.isArray(me.last_activity)
      ? me.last_activity.filter(Boolean)
      : (me.last_activity ? [me.last_activity] : []);
    const lastScore = window.ProfileUI?.formatLastScore
      ? window.ProfileUI.formatLastScore(activityList[0])
      : "-";
    const safeLastScore = window.ProfileUI?.escapeHtml ? window.ProfileUI.escapeHtml(lastScore) : lastScore;
    const vcoinEnabled = window.AppConfig?.isVcoinEnabled?.() === true;
    const statsHtml = vcoinEnabled
      ? `
          <div class="profile-stat-row">
            <div class="profile-stat-chip">V-Coins <strong>${vCoins}</strong></div>
            <div class="profile-stat-chip">Last score <strong>${safeLastScore}</strong></div>
          </div>
        `
      : `
          <div class="profile-stat-row">
            <div class="profile-stat-chip">Last score <strong>${safeLastScore}</strong></div>
          </div>
        `;
    const walletHtml = vcoinEnabled
      ? `
        <div class="profile-card profile-vcoin-card" data-vcoin-open="1" role="button" tabindex="0">
          <div class="profile-icon-box" aria-hidden="true">
            <img class="vcoin-icon" src="./assets/vcoin.png" alt="">
          </div>
          <div>
            <div class="profile-card-title">Wallet</div>
            <div class="profile-card-subtitle">${vCoins} V-Coins available</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </div>
        `
      : `
        <div class="profile-card profile-vcoin-card" data-payment-wallet="1" role="button" tabindex="0">
          <div class="profile-icon-box" aria-hidden="true">
            ${window.UzsBalance?.walletIconMarkup?.("wallet-balance-icon") || ""}
          </div>
          <div>
            <div class="profile-card-title">Wallet</div>
            <div class="profile-card-subtitle">${window.SharedUser?.formatUzsBalance?.(me) || "0 UZS"} available</div>
          </div>
          <svg class="profile-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </div>
        `;

    screenProfile.innerHTML = `
      <div class="profile-shell">
        <div class="profile-page-header">
          <h2 class="profile-page-title">Profile</h2>
          <div class="profile-page-subtitle">Your learning account</div>
        </div>

        <div class="profile-card profile-summary-card">
          <div class="profile-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"></circle>
              <path d="M5 19.2c1.5-3 4-4.7 7-4.7s5.5 1.7 7 4.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
            </svg>
          </div>
          <div>
            <div class="profile-name">${safeFullName}</div>
            <div class="profile-level-badge">Beginner</div>
          </div>
          <button class="profile-edit-btn" onclick="editProfile()" aria-label="Edit profile">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4.2L19 9.2a2.4 2.4 0 00-3.4-3.4L4.8 16.6 4 20z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
            </svg>
            <span>Edit profile</span>
          </button>
          ${statsHtml}
        </div>

        ${walletHtml}

        ${lastActivityHtml}
      </div>
    `;
  } catch (e) {
    console.error(e);
    screenProfile.innerHTML = `
      <p>Could not load profile.</p>
      <button onclick="renderProfile()">Retry</button>
    `;
  }
}

window.editProfile = function () {
  screenProfile.innerHTML = `
    <h3>Edit profile</h3>
    <input id="edit-name" placeholder="Name" style="width:100%; padding:12px; margin-bottom:8px;" />
    <input id="edit-surname" placeholder="Surname" style="width:100%; padding:12px; margin-bottom:12px;" />
    <button onclick="saveProfile()">Save</button>
    <button onclick="renderProfile()" style="margin-top:8px; background:#ddd; color:#000;">Cancel</button>
  `;
};

window.saveProfile = async function () {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const name = document.getElementById("edit-name").value.trim();
  const surname = document.getElementById("edit-surname").value.trim();

  await apiPost(`/me?telegram_id=${telegramId}`, { name, surname });
  renderProfile();
};

window.showReadingScreen = function () {
  hideAllScreens();
  hideAnnouncement();
  setBottomNavVisible(false);
  if (screenReading) {
    screenReading.style.display = "block";
    screenReading.innerHTML = `<h3>📖 Reading screen loaded</h3><p>UI coming next…</p>`;
  }
};
// ===== Reading Timer (60 min, never pauses, water drain) =====
let readingTimerInterval = null;
let readingEndAt = null;

function startReadingTimer(totalSeconds = 60 * 60) {
  const totalMs = totalSeconds * 1000;
  readingEndAt = Date.now() + totalMs;

  if (readingTimerInterval) clearInterval(readingTimerInterval);

  readingTimerInterval = setInterval(() => {
    const now = Date.now();
    const leftMs = Math.max(0, readingEndAt - now);
    const leftSec = Math.ceil(leftMs / 1000);

    const min = Math.floor(leftSec / 60).toString().padStart(2, "0");
    const sec = (leftSec % 60).toString().padStart(2, "0");

    const el = document.getElementById("rt-timer");
    if (!el) return;

    el.textContent = `${min}:${sec}`;

    const ratio = leftMs / totalMs; // 1 → 0

    // color: green -> yellow -> red
    let color = "#22c55e"; // green
    if (ratio < 0.66) color = "#facc15"; // yellow
    if (ratio < 0.33) color = "#ef4444"; // red

    el.style.color = color;
    el.style.background = `linear-gradient(to top, ${color} ${Math.floor(ratio * 100)}%, transparent 0%)`;

    if (leftSec <= 0) {
      clearInterval(readingTimerInterval);
      el.textContent = "00:00";
      el.style.color = "#ef4444";
      // later: auto-submit
    }
  }, 1000);
}

window.showSubscribeGate = function (mockId = null) {
  if (window.TelegramSubGate?.stopEntryRecheck) {
    window.TelegramSubGate.stopEntryRecheck();
  }
  hideAllScreens();
  hideAnnouncement();
  setBottomNavVisible(false);

  if (!screenReading) return;

  screenReading.style.display = "block";

  screenReading.innerHTML = `
    <div style="
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
      height:100%;
      text-align:center;
      padding:20px;
      gap:16px;
    ">
      
      <div id="subscribe-gate-message" style="font-size:16px; line-height:1.4;">
        Ooops! Not subscribed yet.<br/>
        Subscribe to use the app ❤️
      </div>

      <button id="subscribe-btn" onclick="openChannel()" style="
  position: relative;
  width:100%;
  height:52px;
  border-radius:12px;
  font-weight:700;
  font-size:16px;
  background:#ffe4e6;
  color:#000;
  overflow:hidden;
">
  <div class="subscribe-hearts">
    <span>❤️</span>
    <span>❤️</span>
    <span>❤️</span>
    <span>❤️</span>
    <span>❤️</span>
    <span>❤️</span>
  </div>

  <span class="subscribe-btn-label" style="
    position:relative;
    z-index:2;
  ">Subscribe</span>
</button>

      <button id="subscribe-back-btn" onclick="goHome()" style="
        width:100%;
        height:48px;
        border-radius:12px;
        background:#eee;
        color:#000;
        font-weight:500;
      ">
        Cancel
      </button>

    </div>
  `;

  window.__subGateMockId = mockId;
  window.__subGateCompleted = false;

  const backBtn = document.getElementById("subscribe-back-btn");
  if (backBtn) {
    backBtn.onclick = function () {
      if (window.TelegramSubGate?.stopEntryRecheck) {
        window.TelegramSubGate.stopEntryRecheck();
      }
      goHome();
    };
  }
};
window.openChannel = function () {
  const tg = window.Telegram?.WebApp;
  const channelUrl = "https://t.me/IELTSforeverybody";
  if (tg && typeof tg.openTelegramLink === "function") {
    tg.openTelegramLink(channelUrl);
  } else {
    window.open(channelUrl, "_blank");
  }

  const mockId = window.__subGateMockId;
  if (!mockId || !window.TelegramSubGate?.startEntryRecheck) return;

  const subscribeBtn = document.getElementById("subscribe-btn");
  const subscribeLabel = subscribeBtn?.querySelector(".subscribe-btn-label");
  if (subscribeBtn) {
    subscribeBtn.disabled = true;
    subscribeBtn.style.opacity = "0.85";
  }
  if (subscribeLabel) subscribeLabel.textContent = "Checking...";

  window.TelegramSubGate.startEntryRecheck(mockId, {
    onSuccess: function () {
      window.__subGateCompleted = true;
      const message = document.getElementById("subscribe-gate-message");
      const backBtn = document.getElementById("subscribe-back-btn");
      const mainBtn = document.getElementById("subscribe-btn");

      if (message) {
        message.innerHTML = `Wooo! You subscribed!<br/>Thank you! 🥳`;
      }

      if (mainBtn) {
        mainBtn.remove();
      }

      if (backBtn) {
        backBtn.textContent = "Back to The app";
        backBtn.onclick = function () {
          goHome();
        };
      }
    },
    onTimeout: function () {
      const btn = document.getElementById("subscribe-btn");
      const label = btn?.querySelector(".subscribe-btn-label");
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
      }
      if (label) label.textContent = "Subscribe";
    }
  });
};
