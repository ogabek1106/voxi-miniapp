window.WordShuffleTimer = window.WordShuffleTimer || {};

(function () {
  let timerId = null;

  WordShuffleTimer.start = function () {
    WordShuffleTimer.stop();
    timerId = window.setInterval(() => {
      const state = WordShuffleState.get();
      if (state.gameOver || state.solving) return;
      state.seconds = Number(state.seconds || 0) + 0.25;
      state.helpAvailable = state.slots.length > 2 && state.seconds >= 90 && !state.helpUsed;
      WordShuffleUI.renderTimer();
      WordShuffleUI.renderHelp();
    }, 250);
  };

  WordShuffleTimer.stop = function () {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  };

  WordShuffleTimer.resetPuzzle = function () {
    const state = WordShuffleState.get();
    state.seconds = 0;
    state.helpAvailable = false;
    state.helpUsed = false;
    WordShuffleUI.renderTimer();
    WordShuffleUI.renderHelp();
  };

  WordShuffleTimer.add = function () {
    WordShuffleUI.renderTimer();
  };
})();
