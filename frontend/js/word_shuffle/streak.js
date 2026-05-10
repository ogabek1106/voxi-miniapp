window.WordShuffleStreak = window.WordShuffleStreak || {};

(function () {
  WordShuffleStreak.success = function () {
    const state = WordShuffleState.get();
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    return state.streak;
  };

  WordShuffleStreak.break = function () {
    const state = WordShuffleState.get();
    state.streak = 0;
  };

  WordShuffleStreak.label = function (streak) {
    if (streak >= 20) return "Elite";
    if (streak >= 15) return "Locked in";
    if (streak >= 10) return "On fire";
    if (streak >= 5) return "Combo";
    if (streak >= 3) return "Streak";
    return "Warm up";
  };
})();
