const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
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
      showMocksScreen();
    } catch (e) {
      status.innerText = "Network error";
      console.error(e);
      alert("API error: " + e.message);
    }
  };
});
