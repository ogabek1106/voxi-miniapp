window.MatchWordsCombo = window.MatchWordsCombo || {};

(function () {
  MatchWordsCombo.applyCorrect = function () {
    const state = MatchWordsState.get();
    const streak = Number(state.streak || 0) + 1;
    const combo = Math.floor(streak / 3);
    const bestCombo = Math.max(Number(state.bestCombo || 0), combo);
    MatchWordsState.set({ streak, combo, bestCombo });
    if (combo > Number(state.combo || 0)) {
      MatchWordsUI.updateCombo(true);
    } else {
      MatchWordsUI.updateCombo(false);
    }
  };

  MatchWordsCombo.reset = function () {
    MatchWordsState.set({ streak: 0, combo: 0 });
    MatchWordsUI.updateCombo(false);
  };
})();
