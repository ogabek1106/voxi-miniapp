window.MatchWordsApi = window.MatchWordsApi || {};

(function () {
  MatchWordsApi.gameData = function () {
    return apiGet("/match-words/game-data");
  };

  MatchWordsApi.createSession = function (payload) {
    return apiPost("/match-words/sessions", payload);
  };

  MatchWordsApi.finishSession = function (sessionId, payload) {
    return apiPost(`/match-words/sessions/${Number(sessionId)}/finish`, payload);
  };
})();
