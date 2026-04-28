// frontend/js/app.js
const tg = window.Telegram?.WebApp;
const FORCE_LIGHT_THEME = true;

function applyBaseLightTheme() {
  document.documentElement.style.setProperty("--bg-color", "#F5F9FC");
  document.documentElement.style.setProperty("--text-color", "#17212B");
  document.documentElement.style.setProperty("--card-bg", "#FFFFFF");
  document.documentElement.style.setProperty("--border-color", "rgba(20,40,60,0.10)");
  document.documentElement.style.setProperty("--primary", "#00BAFF");

  // Keep native controls and UA widgets in light appearance.
  document.documentElement.style.colorScheme = "light";
}

window.getTelegramId = function () {
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  if (telegramId) return telegramId;

  // Browser/dev fallback, matching the existing admin test flow.
  return 1150875355;
};

function applyTelegramTheme() {
  if (FORCE_LIGHT_THEME) {
    applyBaseLightTheme();
    return;
  }

  if (!tg) return;

  const theme = tg.themeParams || {};

  document.documentElement.style.setProperty("--bg-color", theme.bg_color || "#ffffff");
  document.documentElement.style.setProperty("--text-color", theme.text_color || "#000000");
  document.documentElement.style.setProperty("--card-bg", theme.secondary_bg_color || "#f4f4f6");
  document.documentElement.style.setProperty("--border-color", theme.hint_color || "#e5e5ea");
  document.documentElement.style.setProperty("--primary", theme.button_color || "#4f46e5");
}

if (tg) {
  tg.ready();
  tg.expand();
  if (window.Telegram && Telegram.WebApp) {
    try {
      Telegram.WebApp.setBackgroundColor("#F5F9FC");
      Telegram.WebApp.setHeaderColor("#F5F9FC");
      if (typeof Telegram.WebApp.setBottomBarColor === "function") {
        Telegram.WebApp.setBottomBarColor("#FFFFFF");
      }
    } catch (e) {
      console.warn("Failed to apply Telegram WebApp viewport colors:", e);
    }
  }
  applyTelegramTheme();
  tg.onEvent("themeChanged", applyTelegramTheme);
} else {
  applyBaseLightTheme();
}

window.__isAdmin = false;

function renderHomeIdentity(me) {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
  const homeName = document.getElementById("home-user-name");
  const homeBalance = document.getElementById("home-balance-value");

  if (homeName) {
    const firstName = (me?.name || tgUser?.first_name || "").trim();
    const lastName = (me?.surname || tgUser?.last_name || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    homeName.textContent = fullName || "User";
  }

  if (homeBalance) {
    const rawBalance = me?.v_coins ?? me?.v_coin_balance ?? me?.vcoin_balance ?? me?.v_coin ?? me?.balance ?? 0;
    const parsed = Number(rawBalance);
    homeBalance.textContent = Number.isFinite(parsed) ? String(Math.max(0, Math.floor(parsed))) : "0";
  }
}

function ensureListeningHomeButton(visible) {
  const existingBtn = document.getElementById("listeningHomeBtn");
  if (existingBtn) {
    existingBtn.style.display = visible ? "block" : "none";
    return;
  }

  const home = document.getElementById("screen-home");
  if (!home) return;

  let btn = document.getElementById("listeningHomeBtn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "listeningHomeBtn";
    btn.className = "primary-btn";
    btn.textContent = "🎧 Listening";
    btn.style.display = "none";
    btn.onclick = function () {
      if (typeof window.showListeningEntry === "function") {
        window.showListeningEntry();
      }
    };

    const mockBtn = home.querySelector('button[onclick="showMocksEntry()"]');
    if (mockBtn) {
      home.insertBefore(btn, mockBtn);
    } else {
      home.appendChild(btn);
    }
  }

  btn.style.display = visible ? "block" : "none";
}

function getVcoinBalanceStorageKey(telegramId) {
  return `voxi:vcoins:lastSeen:${telegramId}`;
}

function getDisplayedHomeVcoinBalance() {
  const valueEl = document.getElementById("home-balance-value") || document.getElementById("home-vcoin-balance-value");
  if (!valueEl) return 0;
  return Number(valueEl.textContent || 0) || 0;
}

function setHomeVcoinBalance(value) {
  const valueEl = document.getElementById("home-balance-value") || document.getElementById("home-vcoin-balance-value");
  if (!valueEl) return;
  valueEl.textContent = String(Math.max(0, Number(value) || 0));
}

function animateHomeVcoinBalance(fromValue, toValue) {
  const card = document.querySelector("#screen-home .home-balance") || document.getElementById("home-vcoin-balance");
  const from = Math.max(0, Number(fromValue) || 0);
  const to = Math.max(0, Number(toValue) || 0);

  if (from === to || typeof window.requestAnimationFrame !== "function") {
    setHomeVcoinBalance(to);
    return;
  }

  const startedAt = performance.now();
  const duration = 1100;
  if (card) card.classList.add("is-growing");

  function tick(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (to - from) * eased);
    setHomeVcoinBalance(current);

    if (progress < 1) {
      window.requestAnimationFrame(tick);
      return;
    }

    setHomeVcoinBalance(to);
    if (card) card.classList.remove("is-growing");
  }

  window.requestAnimationFrame(tick);
}

window.refreshVcoinBalance = async function ({ animate = true } = {}) {
  const telegramId = window.getTelegramId();
  if (!telegramId) return;

  try {
    const data = await apiGet(`/vcoins/balance?telegram_id=${telegramId}`);
    const balance = Math.max(0, Number(data?.v_coins || 0));
    const storageKey = getVcoinBalanceStorageKey(telegramId);
    const storedRaw = window.localStorage?.getItem(storageKey);
    const storedBalance = storedRaw === null ? null : Number(storedRaw);
    const displayedBalance = getDisplayedHomeVcoinBalance();
    const startBalance = storedBalance !== null && Number.isFinite(storedBalance)
      ? storedBalance
      : displayedBalance;

    if (animate && balance > startBalance) {
      animateHomeVcoinBalance(startBalance, balance);
    } else {
      setHomeVcoinBalance(balance);
    }

    window.localStorage?.setItem(storageKey, String(balance));
  } catch (e) {
    console.error("Failed to refresh V-Coin balance", e);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  goHome();
  renderHomeIdentity();
  loadMe();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      window.refreshVcoinBalance({ animate: true });
    }
  });

  window.addEventListener("focus", () => {
    window.refreshVcoinBalance({ animate: true });
  });

  if (tg && typeof tg.onEvent === "function") {
    tg.onEvent("viewportChanged", () => {
      window.refreshVcoinBalance({ animate: true });
    });
  }

  const btn = document.getElementById("saveBtn");
  const status = document.getElementById("status");

  if (!btn) {
    console.error("saveBtn not found");
    return;
  }

  btn.onclick = async () => {
    const name = document.getElementById("name").value.trim();
    if (!name) {
      status.innerText = "Please enter your name";
      return;
    }

    status.innerText = "Saving...";

    const telegramId = window.getTelegramId();
    if (!telegramId) {
      status.innerText = "Open this mini app inside Telegram";
      return;
    }

    try {
      await apiPost("/users", { telegram_id: telegramId, name });
      status.innerText = "Saved!";
      document.getElementById("screen-name").style.display = "none";
      goHome();
      loadMe();
    } catch (e) {
      status.innerText = "Network error";
      console.error(e);
      alert("API error: " + e.message);
    }
  };
});

async function loadMe() {
  const telegramId = window.getTelegramId();
  const adminBtn = document.getElementById("adminBtn");

  // hard fallback for your admin account
  if (telegramId === 1150875355) {
    window.__isAdmin = true;
    renderHomeIdentity();

    if (adminBtn) {
      adminBtn.style.display = "block";
    }
    ensureListeningHomeButton(true);

    return;
  }

  try {
    const me = await apiGet(`/me?telegram_id=${telegramId}`);
    window.__isAdmin = !!me.is_admin;
    renderHomeIdentity(me);

    if (adminBtn) {
      adminBtn.style.display = window.__isAdmin ? "block" : "none";
    }
    ensureListeningHomeButton(window.__isAdmin);
  } catch (e) {
    window.__isAdmin = false;
    renderHomeIdentity();

    if (adminBtn) {
      adminBtn.style.display = "none";
    }
    ensureListeningHomeButton(false);

    console.error("Failed to load /me", e);
  }
}
