window.AdminVocabularyOddOneOutApi = window.AdminVocabularyOddOneOutApi || {};

(function () {
  function telegramId() {
    const id = window.getTelegramId?.();
    if (!id) throw new Error("telegram_id_required");
    return encodeURIComponent(id);
  }

  AdminVocabularyOddOneOutApi.list = function () {
    return apiGet(`/admin/vocabulary/odd-one-out/sets?telegram_id=${telegramId()}`);
  };

  AdminVocabularyOddOneOutApi.create = function (payload) {
    return apiPost(`/admin/vocabulary/odd-one-out/sets?telegram_id=${telegramId()}`, payload);
  };

  AdminVocabularyOddOneOutApi.update = function (setId, payload) {
    return apiPut(`/admin/vocabulary/odd-one-out/sets/${Number(setId)}?telegram_id=${telegramId()}`, payload);
  };

  AdminVocabularyOddOneOutApi.remove = function (setId) {
    return apiDelete(`/admin/vocabulary/odd-one-out/sets/${Number(setId)}?telegram_id=${telegramId()}`);
  };

  AdminVocabularyOddOneOutApi.publish = function (setId) {
    return apiRequest(`/admin/vocabulary/odd-one-out/sets/${Number(setId)}/publish?telegram_id=${telegramId()}`, {
      method: "PATCH",
    });
  };

  AdminVocabularyOddOneOutApi.draft = function (setId) {
    return apiRequest(`/admin/vocabulary/odd-one-out/sets/${Number(setId)}/draft?telegram_id=${telegramId()}`, {
      method: "PATCH",
    });
  };
})();
