window.MatchWordsTimer = window.MatchWordsTimer || {};

(function () {
  let lastFrame = 0;
  let timeoutId = null;

  function timerClass(seconds) {
    if (seconds >= 50) return "is-soft";
    if (seconds < 15) return "is-red";
    if (seconds < 30) return "is-orange";
    return "is-blue";
  }

  function tick(now) {
    const state = MatchWordsState.get();
    if (!state.isRunning) return;
    if (!lastFrame) lastFrame = now;
    lastFrame = now;
    const deadlineAt = Number(state.deadlineAt || 0);
    const next = deadlineAt ? Math.max(0, (deadlineAt - now) / 1000) : Math.max(0, Number(state.timeLeft || 0));
    MatchWordsState.set({ timeLeft: next });
    MatchWordsTimer.render();
    if (next <= 0) {
      MatchWordsEngine.gameOver();
      return;
    }
    const rafId = requestAnimationFrame(tick);
    MatchWordsState.set({ rafId });
  }

  function scheduleTimeout() {
    if (timeoutId) window.clearTimeout(timeoutId);
    const state = MatchWordsState.get();
    const remainingMs = Math.max(0, Number(state.deadlineAt || 0) - performance.now());
    timeoutId = window.setTimeout(() => {
      MatchWordsTimer.checkExpired();
    }, remainingMs + 40);
  }

  MatchWordsTimer.start = function () {
    MatchWordsTimer.stop();
    lastFrame = 0;
    const now = performance.now();
    MatchWordsState.set({ isRunning: true, startedAt: now, deadlineAt: now + 60000, lastMatchAt: now, timeLeft: 60 });
    scheduleTimeout();
    const rafId = requestAnimationFrame(tick);
    MatchWordsState.set({ rafId });
  };

  MatchWordsTimer.stop = function () {
    const state = MatchWordsState.get();
    if (state.rafId) cancelAnimationFrame(state.rafId);
    if (timeoutId) window.clearTimeout(timeoutId);
    timeoutId = null;
    MatchWordsState.set({ rafId: null, isRunning: false });
    lastFrame = 0;
  };

  MatchWordsTimer.addSeconds = function (amount) {
    const state = MatchWordsState.get();
    const deltaMs = Number(amount || 0) * 1000;
    const deadlineAt = Math.max(performance.now(), Number(state.deadlineAt || performance.now()) + deltaMs);
    const timeLeft = Math.max(0, (deadlineAt - performance.now()) / 1000);
    MatchWordsState.set({ deadlineAt, timeLeft });
    scheduleTimeout();
    MatchWordsTimer.render();
    MatchWordsAnimations.timeFloat(amount);
    if (timeLeft <= 0) MatchWordsEngine.gameOver();
  };

  MatchWordsTimer.checkExpired = function () {
    const state = MatchWordsState.get();
    if (!state.isRunning) return;
    const deadlineAt = Number(state.deadlineAt || 0);
    const timeLeft = deadlineAt ? Math.max(0, (deadlineAt - performance.now()) / 1000) : Number(state.timeLeft || 0);
    MatchWordsState.set({ timeLeft });
    MatchWordsTimer.render();
    if (timeLeft <= 0) MatchWordsEngine.gameOver();
  };

  MatchWordsTimer.render = function () {
    const timer = document.getElementById("match-words-timer");
    if (!timer) return;
    const seconds = MatchWordsState.get().timeLeft || 0;
    const progress = Math.max(0, Math.min(100, (seconds / 60) * 100));
    timer.style.setProperty("--timer-progress", `${progress}%`);
    timer.className = `match-words-timer ${timerClass(seconds)}${seconds < 10 ? " is-heartbeat" : ""}`;
    const label = document.getElementById("match-words-timer-label");
    if (label) label.textContent = `${Math.ceil(seconds)}s`;
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") MatchWordsTimer.checkExpired();
  });

  window.addEventListener("pageshow", () => MatchWordsTimer.checkExpired());
})();
