// frontend/js/user_reading/api/progress.js

window.UserReading = window.UserReading || {};

UserReading.getTelegramUserId = function () {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    || (typeof window.getTelegramId === "function" ? window.getTelegramId() : null)
    || null;
};

UserReading.saveProgress = async function (mockId, options = {}) {
  const userId = UserReading.getTelegramUserId();
  if (!userId || !mockId) return null;

  const answers = UserReading.collectSaveableAnswers();
  const payload = {
    telegram_id: userId,
    session_mode: UserReading.__sessionMode || "single_block",
    answers
  };

  if (options.keepalive) {
    const res = await fetch(`${window.API}/mock-tests/${mockId}/reading/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    });

    if (!res.ok) {
      throw new Error(await res.text() || "Failed to save reading progress");
    }

    const text = await res.text();
    return text ? JSON.parse(text) : { status: "saved" };
  }

  return apiPost(`/mock-tests/${mockId}/reading/save`, payload);
};

UserReading.loadProgress = async function (mockId) {
  const userId = UserReading.getTelegramUserId();
  if (!userId || !mockId) return null;

  return apiGet(`/mock-tests/${mockId}/reading/resume?telegram_id=${userId}&session_mode=${encodeURIComponent(UserReading.__sessionMode || "single_block")}`);
};

UserReading.submitProgress = async function (mockId) {
  const userId = UserReading.getTelegramUserId();
  if (!userId || !mockId) {
    throw new Error("Missing user or mock id");
  }

  const answers = UserReading.collectAnswers();

  return apiPost(`/mock-tests/${mockId}/reading/submit`, {
    telegram_id: userId,
    session_mode: UserReading.__sessionMode || "single_block",
    answers
  });
};
