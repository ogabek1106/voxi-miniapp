window.WordShuffleApi = window.WordShuffleApi || {};

(function () {
  function adminId() {
    return Number(window.getTelegramId?.() || window.currentTelegramId || 0);
  }

  function withAdmin(path) {
    const join = path.includes("?") ? "&" : "?";
    return `${path}${join}telegram_id=${adminId()}`;
  }

  WordShuffleApi.gameData = function () {
    return apiGet(withAdmin("/word-shuffle/game-data"));
  };

  WordShuffleApi.createSession = function (payload) {
    return apiPost(withAdmin("/word-shuffle/sessions"), payload);
  };

  WordShuffleApi.finishSession = function (sessionId, payload) {
    return apiPost(withAdmin(`/word-shuffle/sessions/${Number(sessionId)}/finish`), payload);
  };
})();
