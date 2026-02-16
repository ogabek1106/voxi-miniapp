const tg = window.Telegram?.WebApp;
function applyTelegramTheme() {
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
  applyTelegramTheme();                 // 👈 ADD
  tg.onEvent("themeChanged", applyTelegramTheme); // 👈 ADD
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("saveBtn");
  const status = document.getElementById("status");

  if (!btn) {
    console.error("saveBtn not found");
    return;
  }

  btn.onclick = async () => {
    // 🔴 Remove this after testing
    // alert("Save clicked");

    const name = document.getElementById("name").value.trim();
    if (!name) {
      status.innerText = "Please enter your name";
      return;
    }

    status.innerText = "Saving...";

    const telegramId = tg?.initDataUnsafe?.user?.id;
    if (!telegramId) {
      status.innerText = "Open this mini app inside Telegram";
      return;
    }

    try {
      const res = await apiPost("/users", { telegram_id: telegramId, name });
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
  const telegramId = tg?.initDataUnsafe?.user?.id;
  if (!telegramId) return;

  try {
    const me = await apiGet(`/me?telegram_id=${telegramId}`);

    if (me.is_admin) {
      const adminBtn = document.getElementById("adminBtn");
      if (adminBtn) adminBtn.style.display = "block";
    }
  } catch (e) {
    console.error("Failed to load /me", e);
  }
}

