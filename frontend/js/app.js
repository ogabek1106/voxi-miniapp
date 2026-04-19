// frontend/js/app.js
const tg = window.Telegram?.WebApp;
const FORCE_LIGHT_THEME = true;

function applyBaseLightTheme() {
  document.documentElement.style.setProperty("--bg-color", "#ffffff");
  document.documentElement.style.setProperty("--text-color", "#000000");
  document.documentElement.style.setProperty("--card-bg", "#f4f4f6");
  document.documentElement.style.setProperty("--border-color", "#e5e5ea");
  document.documentElement.style.setProperty("--primary", "#4f46e5");

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
  applyTelegramTheme();
  tg.onEvent("themeChanged", applyTelegramTheme);
} else {
  applyBaseLightTheme();
}

window.__isAdmin = false;

function ensureListeningHomeButton(visible) {
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

document.addEventListener("DOMContentLoaded", () => {
  goHome();
  loadMe();
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

    if (adminBtn) {
      adminBtn.style.display = "block";
    }
    ensureListeningHomeButton(true);

    return;
  }

  try {
    const me = await apiGet(`/me?telegram_id=${telegramId}`);
    window.__isAdmin = !!me.is_admin;

    if (adminBtn) {
      adminBtn.style.display = window.__isAdmin ? "block" : "none";
    }
    ensureListeningHomeButton(window.__isAdmin);
  } catch (e) {
    window.__isAdmin = false;

    if (adminBtn) {
      adminBtn.style.display = "none";
    }
    ensureListeningHomeButton(false);

    console.error("Failed to load /me", e);
  }
}
