window.MatchWordsTimer = window.MatchWordsTimer || {};

(function () {
  let lastFrame = 0;

  function timerClass(seconds) {
    if (seconds < 15) return "is-red";
    if (seconds < 30) return "is-orange";
    return "is-blue";
  }

  function tick(now) {
    const state = MatchWordsState.get();
    if (!state.isRunning) return;
    if (!lastFrame) lastFrame = now;
    const delta = (now - lastFrame) / 1000;
    lastFrame = now;
    const next = Math.max(0, Number(state.timeLeft || 0) - delta);
    MatchWordsState.set({ timeLeft: next });
    MatchWordsTimer.render();
    if (next <= 0) {
      MatchWordsEngine.gameOver();
      return;
    }
    const rafId = requestAnimationFrame(tick);
    MatchWordsState.set({ rafId });
  }

  MatchWordsTimer.start = function () {
    MatchWordsTimer.stop();
    lastFrame = 0;
    MatchWordsState.set({ isRunning: true, startedAt: performance.now(), lastMatchAt: performance.now(), timeLeft: 60 });
    const rafId = requestAnimationFrame(tick);
    MatchWordsState.set({ rafId });
  };

  MatchWordsTimer.stop = function () {
    const state = MatchWordsState.get();
    if (state.rafId) cancelAnimationFrame(state.rafId);
    MatchWordsState.set({ rafId: null, isRunning: false });
    lastFrame = 0;
  };

  MatchWordsTimer.addSeconds = function (amount) {
    const state = MatchWordsState.get();
    MatchWordsState.set({ timeLeft: Math.max(0, Number(state.timeLeft || 0) + Number(amount || 0)) });
    MatchWordsTimer.render();
    MatchWordsAnimations.timeFloat(amount);
  };

  MatchWordsTimer.render = function () {
    const timer = document.getElementById("match-words-timer");
    if (!timer) return;
    const seconds = MatchWordsState.get().timeLeft || 0;
    timer.textContent = Math.ceil(seconds).toString();
    timer.className = `match-words-timer ${timerClass(seconds)}${seconds < 10 ? " is-heartbeat" : ""}`;
  };
})();
