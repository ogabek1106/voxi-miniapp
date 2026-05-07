window.VocabularyOddOneOutGame = window.VocabularyOddOneOutGame || {};

(function () {
  VocabularyOddOneOutGame.answer = async function (selectedWordId) {
    const state = VocabularyOddOneOutState.get();
    if (state.answered) return;
    const set = state.sets[state.index];
    if (!set) return;
    VocabularyOddOneOutState.set({ answered: true });
    try {
      const result = await VocabularyOddOneOutApi.check({ setId: set.id, selectedWordId });
      VocabularyOddOneOutState.set({
        correct: state.correct + (result.correct ? 1 : 0),
        lastResult: result,
      });
      VocabularyOddOneOutUI.renderFeedback({
        selectedWordId,
        correct: Boolean(result.correct),
        correctWordId: result.correct_word_id,
        explanation: result.explanation,
      });
    } catch (error) {
      console.error("Odd One Out check error:", error);
      VocabularyOddOneOutState.set({ answered: false });
    }
  };

  VocabularyOddOneOutGame.next = function () {
    const state = VocabularyOddOneOutState.get();
    VocabularyOddOneOutState.set({
      index: state.index + 1,
      answered: false,
      lastResult: null,
    });
    VocabularyOddOneOutUI.renderPuzzle();
  };
})();
