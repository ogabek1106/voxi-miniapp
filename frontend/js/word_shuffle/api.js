window.WordShuffleApi = window.WordShuffleApi || {};

(function () {
  WordShuffleApi.gameData = function () {
    return apiGet("/word-shuffle/game-data");
  };

  WordShuffleApi.createSession = function (payload) {
    return apiPost("/word-shuffle/sessions", payload);
  };

  WordShuffleApi.finishSession = function (sessionId, payload) {
    return apiPost(`/word-shuffle/sessions/${Number(sessionId)}/finish`, payload);
  };
})();
