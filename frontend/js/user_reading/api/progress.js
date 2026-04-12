// frontend/js/user_reading/api/progress.js

window.UserReading = window.UserReading || {};

UserReading.getTelegramUserId = function () {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null;
};

UserReading.saveProgress = async function (mockId) {
  const userId = UserReading.getTelegramUserId();
  if (!userId || !mockId) return null;

  const answers = UserReading.collectSaveableAnswers();

  return apiPost(`/mock-tests/${mockId}/reading/save`, {
    telegram_id: userId,
    answers: answers
  });
};

UserReading.loadProgress = async function (mockId) {
  const userId = UserReading.getTelegramUserId();
  if (!userId || !mockId) return null;

  return apiGet(`/mock-tests/${mockId}/reading/resume?telegram_id=${userId}`);
};
