window.WordMergeApi = window.WordMergeApi || {};

(function () {
  function adminId() {
    return Number(window.getTelegramId?.() || window.currentTelegramId || 0);
  }

  function withAdmin(path) {
    const join = path.includes("?") ? "&" : "?";
    return `${path}${join}telegram_id=${adminId()}`;
  }

  WordMergeApi.gameData = function () {
    return apiGet(withAdmin("/word-merge/game-data"));
  };

  WordMergeApi.createSession = function (payload) {
    return apiPost(withAdmin("/word-merge/sessions"), payload);
  };

  WordMergeApi.finishSession = function (sessionId, payload) {
    return apiPost(withAdmin(`/word-merge/sessions/${Number(sessionId)}/finish`), payload);
  };
})();
