window.AdminWordShuffleApi = window.AdminWordShuffleApi || {};

(function () {
  function adminId() {
    return Number(window.getTelegramId?.() || window.currentTelegramId || 0);
  }

  function withAdmin(path) {
    const join = path.includes("?") ? "&" : "?";
    return `${path}${join}telegram_id=${adminId()}`;
  }

  AdminWordShuffleApi.list = function () {
    return apiGet(withAdmin("/admin/word-shuffle/entries"));
  };

  AdminWordShuffleApi.create = function (payload) {
    return apiPost(withAdmin("/admin/word-shuffle/entries"), payload);
  };

  AdminWordShuffleApi.update = function (entryId, payload) {
    return apiPut(withAdmin(`/admin/word-shuffle/entries/${Number(entryId)}`), payload);
  };

  AdminWordShuffleApi.remove = function (entryId) {
    return apiDelete(withAdmin(`/admin/word-shuffle/entries/${Number(entryId)}`));
  };

  AdminWordShuffleApi.activate = function (entryId) {
    return apiRequest(withAdmin(`/admin/word-shuffle/entries/${Number(entryId)}/activate`), { method: "PATCH" });
  };

  AdminWordShuffleApi.deactivate = function (entryId) {
    return apiRequest(withAdmin(`/admin/word-shuffle/entries/${Number(entryId)}/deactivate`), { method: "PATCH" });
  };
})();
