// frontend/js/user_reading/api/progress.js

window.UserListening = window.UserListening || {};

UserListening.getTelegramUserId = function () {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    || (typeof window.getTelegramId === "function" ? window.getTelegramId() : null)
    || null;
};

UserListening.saveProgress = async function (mockId, options = {}) {
  const userId = UserListening.getTelegramUserId();
  if (!userId || !mockId) return null;

  const answers = UserListening.collectSaveableAnswers();
  const payload = {
    telegram_id: userId,
    answers
  };

  if (options.keepalive) {
    const res = await fetch(`${window.API}/mock-tests/${mockId}/listening/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    });

    if (!res.ok) {
      throw new Error(await res.text() || "Failed to save listening progress");
    }

    const text = await res.text();
    return text ? JSON.parse(text) : { status: "saved" };
  }

  return apiPost(`/mock-tests/${mockId}/listening/save`, payload);
};

UserListening.loadProgress = async function (mockId) {
  const userId = UserListening.getTelegramUserId();
  if (!userId || !mockId) return null;

  return apiGet(`/mock-tests/${mockId}/listening/resume?telegram_id=${userId}`);
};

UserListening.submitProgress = async function (mockId) {
  const userId = UserListening.getTelegramUserId();
  if (!userId || !mockId) {
    throw new Error("Missing user or mock id");
  }

  const answers = UserListening.collectAnswers();

  return apiPost(`/mock-tests/${mockId}/listening/submit`, {
    telegram_id: userId,
    answers
  });
};
