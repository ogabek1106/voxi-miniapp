window.AdminWordMergeApi = window.AdminWordMergeApi || {};

(function () {
  function adminId() {
    return Number(window.getTelegramId?.() || window.currentTelegramId || 0);
  }

  function withAdmin(path) {
    const join = path.includes("?") ? "&" : "?";
    return `${path}${join}telegram_id=${adminId()}`;
  }

  AdminWordMergeApi.list = function () {
    return apiGet(withAdmin("/admin/word-merge/families"));
  };

  AdminWordMergeApi.create = function (payload) {
    return apiPost(withAdmin("/admin/word-merge/families"), payload);
  };

  AdminWordMergeApi.update = function (familyId, payload) {
    return apiPut(withAdmin(`/admin/word-merge/families/${Number(familyId)}`), payload);
  };

  AdminWordMergeApi.remove = function (familyId) {
    return apiDelete(withAdmin(`/admin/word-merge/families/${Number(familyId)}`));
  };

  AdminWordMergeApi.activate = function (familyId) {
    return apiRequest(withAdmin(`/admin/word-merge/families/${Number(familyId)}/activate`), { method: "PATCH" });
  };

  AdminWordMergeApi.deactivate = function (familyId) {
    return apiRequest(withAdmin(`/admin/word-merge/families/${Number(familyId)}/deactivate`), { method: "PATCH" });
  };

  AdminWordMergeApi.stats = function () {
    return apiGet(withAdmin("/admin/word-merge/stats"));
  };
})();
