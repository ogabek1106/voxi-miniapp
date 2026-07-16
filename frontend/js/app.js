// frontend/js/app.js
const tg = window.AppViewMode?.isMiniApp?.() ? window.Telegram?.WebApp : null;
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
  if (window.AppViewMode?.isWebsite?.()) {
    const websiteUser = window.WebsiteAuthState?.getUser?.();
    return websiteUser?.telegram_id || null;
  }

  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  if (telegramId) return telegramId;

  // Browser/dev fallback, matching the existing admin test flow.
  return 1150875355;
};

window.getExamTelegramId = function () {
  const telegramId = typeof window.getTelegramId === "function" ? Number(window.getTelegramId() || 0) : 0;
  if (Number.isFinite(telegramId) && telegramId > 0) return telegramId;

  const websiteUser = window.WebsiteAuthState?.getUser?.();
  const userId = Number(websiteUser?.id || 0);
  if (Number.isFinite(userId) && userId > 0) return -userId;

  return null;
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
    syncHomeBalanceIcon();
    const vcoins = window.SharedUser?.getBalance?.(me) || 0;
    const amount = displayBalanceFromVcoins(vcoins);
    homeBalance.textContent = formatDisplayBalance(amount);
  }

  if (window.WebsiteHeader?.update) {
    window.WebsiteHeader.update(me || {});
  }

  window.XPUI?.refresh?.();
}

function ensureListeningHomeButton(visible) {
  const legacyBtn = document.getElementById("listeningHomeBtn");
  if (legacyBtn) legacyBtn.remove();
  return;

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

function isVcoinEnabled() {
  return window.AppConfig?.isVcoinEnabled?.() === true;
}

function getBalanceStorageKey(telegramId) {
  const mode = isVcoinEnabled() ? "vcoins" : "uzs";
  return `voxi:${mode}:lastSeen:${telegramId}`;
}

function displayBalanceFromVcoins(vcoins) {
  const normalized = Math.max(0, Math.floor(Number(vcoins) || 0));
  if (isVcoinEnabled()) return normalized;
  return window.UzsBalance?.convertVCoinsToUzs?.(normalized) || 0;
}

function formatDisplayBalance(value) {
  if (isVcoinEnabled()) return String(Math.max(0, Math.floor(Number(value) || 0)));
  return window.UzsBalance?.formatUzs?.(value) || "0 UZS";
}

function parseDisplayedBalance(text) {
  const cleaned = String(text || "").replace(/[^\d]/g, "");
  return Number(cleaned || 0) || 0;
}

function getDisplayedHomeBalance() {
  const valueEl = document.getElementById("home-balance-value")
    || document.getElementById("home-vcoin-balance-value")
    || document.getElementById("website-balance-value");
  if (!valueEl) return 0;
  return parseDisplayedBalance(valueEl.textContent);
}

function setHomeBalance(value) {
  const normalized = Math.max(0, Math.floor(Number(value) || 0));
  const valueEls = [
    document.getElementById("home-balance-value"),
    document.getElementById("home-vcoin-balance-value"),
    document.getElementById("website-balance-value")
  ].filter(Boolean);
  valueEls.forEach((valueEl) => {
    valueEl.textContent = formatDisplayBalance(normalized);
  });
}

function syncHomeBalanceIcon() {
  const cards = [
    document.querySelector("#screen-home .home-balance"),
    document.querySelector(".website-balance-button")
  ].filter(Boolean);
  cards.forEach((card) => {
    const icon = card.querySelector(".vcoin-icon, .wallet-balance-icon");
    if (isVcoinEnabled()) {
      if (!icon || icon.tagName.toLowerCase() !== "img") {
        card.insertAdjacentHTML("afterbegin", `<img class="vcoin-icon" src="./assets/vcoin.png" alt="" aria-hidden="true">`);
        icon?.remove();
      }
      card.setAttribute("data-vcoin-open", "1");
      card.removeAttribute("data-payment-wallet");
      card.setAttribute("aria-label", "Open V-Coin balance");
      return;
    }
    if (!icon || icon.tagName.toLowerCase() !== "svg") {
      card.insertAdjacentHTML("afterbegin", window.UzsBalance?.walletIconMarkup?.("wallet-balance-icon") || "");
      icon?.remove();
    }
    card.removeAttribute("data-vcoin-open");
    card.setAttribute("data-payment-wallet", "1");
    card.setAttribute("aria-label", "Available balance");
  });
}

function animateHomeBalance(fromValue, toValue, animate) {
  const card = document.querySelector("#screen-home .home-balance")
    || document.getElementById("home-vcoin-balance")
    || document.querySelector(".website-balance-button");
  const valueEls = [
    document.getElementById("home-balance-value"),
    document.getElementById("home-vcoin-balance-value"),
    document.getElementById("website-balance-value")
  ].filter(Boolean);
  window.CountUpUI?.animateInteger?.({
    key: "home-balance",
    elements: valueEls,
    card,
    fromValue,
    toValue,
    formatter: formatDisplayBalance,
    animate
  });
}

window.refreshVcoinBalance = async function ({ animate = true } = {}) {
  const telegramId = window.getTelegramId();
  const websiteUserId = window.AppViewMode?.isWebsite?.() ? Number(window.WebsiteAuthState?.getUser?.()?.id || 0) : 0;
  if (!telegramId && !websiteUserId) return;

  try {
    syncHomeBalanceIcon();
    const data = await apiGet(telegramId ? `/vcoins/balance?telegram_id=${telegramId}` : "/vcoins/balance");
    const vcoins = Math.max(0, Number(data?.v_coins || 0));
    const balance = displayBalanceFromVcoins(vcoins);
    const storageKey = getBalanceStorageKey(telegramId || `user:${websiteUserId}`);
    const storedRaw = window.localStorage?.getItem(storageKey);
    const storedBalance = storedRaw === null ? null : Number(storedRaw);
    const displayedBalance = getDisplayedHomeBalance();
    const startBalance = animate
      ? displayedBalance
      : (
          storedBalance !== null && Number.isFinite(storedBalance)
            ? storedBalance
            : displayedBalance
        );

    if (animate && balance !== startBalance) {
      animateHomeBalance(startBalance, balance, true);
    } else {
      setHomeBalance(balance);
    }

    window.localStorage?.setItem(storageKey, String(balance));
  } catch (e) {
    console.error("Failed to refresh balance", e);
  }
};

function markAppReady() {
  document.body.classList.add("app-ready");
  window.setTimeout(() => {
    document.getElementById("initial-loader")?.remove();
  }, 180);
}

function resolveInitialScreen() {
  const handledDeepLink = Boolean(window.VoxiDeepLinks?.handleCurrentUrl?.());
  if (handledDeepLink) return true;

  const restoredRoute = Boolean(window.VoxiRouter?.restoreInitialRoute?.());
  if (restoredRoute) return true;

  window.renderHomePage?.();
  return false;
}

document.addEventListener("DOMContentLoaded", async () => {
  await window.AppConfig?.ready;
  window.AppConfig?.subscribe?.(() => {
    syncHomeBalanceIcon();
    renderHomeIdentity(window.WebsiteAuthState?.getUser?.() || null);
    window.refreshVcoinBalance({ animate: false });
    window.WebsiteHeader?.render?.();
  });
  document.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-payment-wallet='1']");
    if (!opener) return;
    event.preventDefault();
    if (typeof window.UzsBalance?.openBalanceSheet === "function") {
      window.UzsBalance.openBalanceSheet();
      return;
    }
    window.UzsBalance?.showGatewayPlaceholder?.();
  });

  if (window.AppViewMode?.isWebsite?.()) {
    window.WebsiteLayout?.init?.();
    markAppReady();
    window.VoxiNotifications?.init?.();
    resolveInitialScreen();

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        window.refreshVcoinBalance({ animate: true });
      }
    });

    window.addEventListener("focus", () => {
      window.refreshVcoinBalance({ animate: true });
    });

    return;
  }

  renderHomeIdentity();
  loadMe();
  markAppReady();
  window.VoxiNotifications?.init?.();
  resolveInitialScreen();

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
  const isWebsite = window.AppViewMode?.isWebsite?.();

  // hard fallback for your admin account
  if (telegramId === 1150875355) {
    window.__isAdmin = !isWebsite;
    renderHomeIdentity();

    if (adminBtn) {
      adminBtn.style.display = isWebsite ? "none" : "block";
    }
    ensureListeningHomeButton(!isWebsite);

    return;
  }

  try {
    const me = await apiGet(`/me?telegram_id=${telegramId}`);
    window.__isAdmin = !!me.is_admin;
    renderHomeIdentity(me);

    if (adminBtn) {
      adminBtn.style.display = (!isWebsite && window.__isAdmin) ? "block" : "none";
    }
    ensureListeningHomeButton(!isWebsite);
  } catch (e) {
    window.__isAdmin = false;
    renderHomeIdentity();

    if (adminBtn) {
      adminBtn.style.display = "none";
    }
    ensureListeningHomeButton(!isWebsite);

    console.error("Failed to load /me", e);
  }
}
