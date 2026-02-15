const tg = window.Telegram.WebApp;
tg.expand();

document.getElementById("saveBtn").onclick = async () => {
  const status = document.getElementById("status");
  const name = document.getElementById("name").value.trim();

  if (!name) {
    status.innerText = "Please enter your name";
    return;
  }

  status.innerText = "Saving...";

  const telegramId = tg.initDataUnsafe?.user?.id;
  if (!telegramId) {
    status.innerText = "Open this mini app inside Telegram";
    return;
  }

  try {
    await apiPost("/users", { telegram_id: telegramId, name });
    status.innerText = "Saved!";
    showMocksScreen();
  } catch (e) {
    status.innerText = "Network error";
    console.error(e);
  }
};

