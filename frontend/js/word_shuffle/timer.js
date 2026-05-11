window.WordShuffleTimer = window.WordShuffleTimer || {};

(function () {
  let timerId = null;

  WordShuffleTimer.start = function () {
    WordShuffleTimer.stop();
    timerId = window.setInterval(() => {
      const state = WordShuffleState.get();
      if (state.gameOver || state.solving) return;
      state.seconds = Math.max(0, Number(state.seconds || 0) - 0.25);
      WordShuffleUI.renderTimer();
      if (state.seconds <= 0) WordShuffleEngine.gameOver();
    }, 250);
  };

  WordShuffleTimer.stop = function () {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  };

  WordShuffleTimer.add = function (seconds) {
    const state = WordShuffleState.get();
    state.seconds = Math.min(90, Number(state.seconds || 0) + Number(seconds || 0));
    WordShuffleUI.renderTimer();
  };
})();
