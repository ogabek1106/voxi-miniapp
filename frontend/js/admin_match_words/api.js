window.AdminMatchWordsApi = window.AdminMatchWordsApi || {};

(function () {
  function adminId() {
    return Number(window.getTelegramId?.() || 0);
  }

  AdminMatchWordsApi.list = function () {
    return apiGet(`/admin/match-words/entries?telegram_id=${adminId()}`);
  };

  AdminMatchWordsApi.create = function (payload) {
    return apiPost(`/admin/match-words/entries?telegram_id=${adminId()}`, payload);
  };

  AdminMatchWordsApi.update = function (entryId, payload) {
    return apiPut(`/admin/match-words/entries/${Number(entryId)}?telegram_id=${adminId()}`, payload);
  };

  AdminMatchWordsApi.remove = function (entryId) {
    return apiDelete(`/admin/match-words/entries/${Number(entryId)}?telegram_id=${adminId()}`);
  };

  AdminMatchWordsApi.activate = function (entryId) {
    return apiRequest(`/admin/match-words/entries/${Number(entryId)}/activate?telegram_id=${adminId()}`, { method: "PATCH" });
  };

  AdminMatchWordsApi.deactivate = function (entryId) {
    return apiRequest(`/admin/match-words/entries/${Number(entryId)}/deactivate?telegram_id=${adminId()}`, { method: "PATCH" });
  };
})();
