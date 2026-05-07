window.VocabularyOddOneOutApi = window.VocabularyOddOneOutApi || {};

(function () {
  VocabularyOddOneOutApi.session = function () {
    return apiGet("/vocabulary/odd-one-out/session");
  };

  VocabularyOddOneOutApi.check = function ({ setId, selectedWordId }) {
    return apiPost("/vocabulary/odd-one-out/check", {
      set_id: Number(setId),
      selected_word_id: Number(selectedWordId),
    });
  };
})();
