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

    if (res.status === 404) {
      console.warn("Listening save endpoint is not ready yet. Skipping backend progress save.");
      return { status: "save_unavailable" };
    }

    if (!res.ok) {
      throw new Error(await res.text() || "Failed to save listening progress");
    }

    const text = await res.text();
    return text ? JSON.parse(text) : { status: "saved" };
  }

  const response = await fetch(`${window.API}/mock-tests/${mockId}/listening/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (response.status === 404) {
    console.warn("Listening save endpoint is not ready yet. Skipping backend progress save.");
    return { status: "save_unavailable" };
  }

  if (!response.ok) {
    throw new Error(text || "Failed to save listening progress");
  }

  return text ? JSON.parse(text) : { status: "saved" };
};

UserListening.loadProgress = async function (mockId) {
  const userId = UserListening.getTelegramUserId();
  if (!userId || !mockId) return null;

  const response = await fetch(`${window.API}/mock-tests/${mockId}/listening/resume?telegram_id=${userId}`);
  const text = await response.text();

  if (response.status === 404) {
    console.warn("Listening resume endpoint is not ready yet. Starting without backend progress.");
    return null;
  }

  if (!response.ok) {
    throw new Error(text || "Failed to load listening progress");
  }

  return text ? JSON.parse(text) : null;
};

UserListening.submitProgress = async function (mockId) {
  const userId = UserListening.getTelegramUserId();
  if (!userId || !mockId) {
    throw new Error("Missing user or mock id");
  }

  const answers = UserListening.collectAnswers();
  const payload = {
    telegram_id: userId,
    answers
  };

  const response = await fetch(`${window.API}/mock-tests/${mockId}/listening/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (!response.ok) {
    if (response.status === 404) {
      console.warn("Listening submit endpoint is not ready yet. Using frontend fallback submit.");
      return {
        score: 0,
        total: 40,
        band: "0.0",
        status: "submitted_fallback"
      };
    }
    throw new Error(text || "Failed to submit listening");
  }

  return text ? JSON.parse(text) : { status: "submitted" };
};
