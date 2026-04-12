// frontend/js/user_reading/api/progress.js

window.UserReading = window.UserReading || {};

UserReading.getTelegramUserId = function () {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null;
};

UserReading.saveProgress = async function (testId) {
  const userId = UserReading.getTelegramUserId();
  if (!userId || !testId) return;

  const answers = UserReading.collectSaveableAnswers();

  return apiPost(`/reading/tests/${testId}/progress`, {
    telegram_id: userId,
    answers: answers
  });
};

UserReading.loadProgress = async function (testId) {
  const userId = UserReading.getTelegramUserId();
  if (!userId || !testId) return null;

  return apiGet(`/reading/tests/${testId}/progress?telegram_id=${userId}`);
};
