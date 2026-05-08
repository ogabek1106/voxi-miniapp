window.VocabularyOddOneOutApi = window.VocabularyOddOneOutApi || {};

(function () {
  VocabularyOddOneOutApi.session = function () {
    return apiGet("/vocabulary/odd-one-out/session");
  };

  VocabularyOddOneOutApi.check = function ({ setId, selectedWordId, timedOut = false }) {
    return apiPost("/vocabulary/odd-one-out/check", {
      set_id: Number(setId),
      selected_word_id: selectedWordId == null ? null : Number(selectedWordId),
      timed_out: Boolean(timedOut),
    });
  };

  VocabularyOddOneOutApi.recordAttempt = function (payload) {
    return apiPost("/vocabulary/odd-one-out/attempts", payload);
  };
})();
