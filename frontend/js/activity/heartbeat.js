window.VoxiActivity = window.VoxiActivity || {};

(function () {
  const HEARTBEAT_MS = 30000;
  const VISITOR_KEY = "voxi:activity:visitor";
  const SESSION_KEY = "voxi:activity:session";
  let currentPage = "homepage";
  let timer = null;

  function randomKey(prefix) {
    const cryptoKey = window.crypto?.randomUUID?.();
    return `${prefix}_${cryptoKey || `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
  }

  function storageGet(storage, key) {
    try {
      return storage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function storageSet(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (_error) {
      // Storage can be unavailable in strict browser modes; heartbeat still works in-memory.
    }
  }

  function visitorKey() {
    let key = storageGet(localStorage, VISITOR_KEY);
    if (!key) {
      key = randomKey("visitor");
      storageSet(localStorage, VISITOR_KEY, key);
    }
    return key;
  }

  function sessionKey() {
    let key = storageGet(sessionStorage, SESSION_KEY);
    if (!key) {
      key = randomKey("session");
      storageSet(sessionStorage, SESSION_KEY, key);
    }
    return key;
  }

  function userPayload() {
    const websiteUser = window.WebsiteAuthState?.getUser?.() || null;
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
    const telegramId = window.getTelegramId?.() || websiteUser?.telegram_id || tgUser?.id || null;
    const firstName = websiteUser?.name || tgUser?.first_name || "";
    const lastName = websiteUser?.surname || tgUser?.last_name || "";
    const userName = `${firstName} ${lastName}`.trim() || websiteUser?.email || tgUser?.username || "";
    return {
      user_id: websiteUser?.id || null,
      telegram_id: telegramId ? Number(telegramId) : null,
      user_name: userName || null,
    };
  }

  function deviceType() {
    if (window.AppViewMode?.isMiniApp?.()) return "Telegram Mini App";
    if (document.body?.classList.contains("mobile-browser-view") || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      return "mobile browser";
    }
    return "desktop browser";
  }

  function visiblePage() {
    if (document.body?.classList.contains("word-shuffle-active")) return "word_shuffle";
    if (document.body?.classList.contains("word-merge-active")) return "word_merge";
    if (document.body?.classList.contains("vocab-ooo-active")) return "odd_one_out";
    const visible = ["screen-reading", "screen-writing", "screen-speaking", "screen-profile", "screen-mocks", "screen-home"]
      .find((id) => {
        const el = document.getElementById(id);
        return el && getComputedStyle(el).display !== "none";
      });
    if (visible === "screen-reading") return "reading_test";
    if (visible === "screen-writing") return "writing_test";
    if (visible === "screen-speaking") return "speaking_test";
    if (visible === "screen-profile") return "profile";
    if (visible === "screen-mocks") return currentPage === "admin_panel" ? "admin_panel" : currentPage;
    return "homepage";
  }

  async function send() {
    if (document.visibilityState === "hidden") return;
    const page = currentPage || visiblePage();
    try {
      await apiPost("/activity/heartbeat", {
        session_key: sessionKey(),
        visitor_key: visitorKey(),
        current_page: page,
        device_type: deviceType(),
        ...userPayload(),
      });
    } catch (error) {
      console.log("[Activity] heartbeat failed", error?.message || error);
    }
  }

  function start() {
    if (timer) return;
    send();
    timer = window.setInterval(send, HEARTBEAT_MS);
  }

  function wrapNavigation() {
    const mappings = {
      goHome: "homepage",
      goProfile: "profile",
      showAdminPanel: "admin_panel",
      showMocksEntry: "mock_tests",
      showReadingEntry: "reading_test",
      showWritingEntry: "writing_test",
      showSpeakingEntry: "speaking_test",
      showListeningEntry: "listening_test",
      showShadowWritingEntry: "shadow_writing",
      showVocabularyOddOneOutEntry: "odd_one_out",
      showWordShuffleEntry: "word_shuffle",
    };
    Object.entries(mappings).forEach(([name, page]) => {
      const original = window[name];
      if (typeof original !== "function" || original.__activityWrapped) return;
      const wrapped = function (...args) {
        window.VoxiActivity.setPage(page);
        return original.apply(this, args);
      };
      wrapped.__activityWrapped = true;
      window[name] = wrapped;
    });

    const gate = window.TelegramSubGate;
    if (gate && typeof gate.checkReadingEntry === "function" && !gate.checkReadingEntry.__activityWrapped) {
      const originalGateCheck = gate.checkReadingEntry;
      gate.checkReadingEntry = function (...args) {
        window.VoxiActivity.setPage("subscription_gate");
        return originalGateCheck.apply(this, args);
      };
      gate.checkReadingEntry.__activityWrapped = true;
    }
  }

  window.VoxiActivity.setPage = function (page) {
    currentPage = String(page || "unknown").trim() || "unknown";
    send();
  };

  window.VoxiActivity.endSession = function () {
    currentPage = "homepage";
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (_error) {
      // Session storage can be blocked; auth logout still clears the account session.
    }
  };

  window.VoxiActivity.start = start;
  window.VoxiActivity.ping = send;
  window.VoxiActivity.wrapNavigation = wrapNavigation;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") send();
  });
  document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(() => {
      wrapNavigation();
      start();
    }, 0);
  });
})();
