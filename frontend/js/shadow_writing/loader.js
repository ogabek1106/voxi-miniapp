window.ShadowWritingLoader = window.ShadowWritingLoader || {};

(function () {
  const GUEST_LIMIT = 3;
  const GUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
  const GUEST_STORAGE_KEY = "voxi_shadow_writing_guest_completions";

  function now() {
    return Date.now();
  }

  function readGuestCompletions() {
    try {
      const raw = window.localStorage?.getItem(GUEST_STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      const cutoff = now() - GUEST_WINDOW_MS;
      return Array.isArray(parsed)
        ? parsed.map(Number).filter((value) => Number.isFinite(value) && value >= cutoff)
        : [];
    } catch (_) {
      return [];
    }
  }

  function writeGuestCompletions(items) {
    try {
      window.localStorage?.setItem(GUEST_STORAGE_KEY, JSON.stringify(items));
    } catch (_) {}
  }

  function guestUsage() {
    const completions = readGuestCompletions();
    if (completions.length) writeGuestCompletions(completions);
    return {
      count: completions.length,
      remaining: Math.max(0, GUEST_LIMIT - completions.length),
      limitReached: completions.length >= GUEST_LIMIT,
    };
  }

  ShadowWritingLoader.getGuestUsage = guestUsage;

  ShadowWritingLoader.recordGuestCompletion = function () {
    const completions = readGuestCompletions();
    completions.push(now());
    writeGuestCompletions(completions);
    return guestUsage();
  };

  function prepareScreen() {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) {
      screen.classList.add("shadow-writing-host");
      screen.style.display = "block";
      screen.innerHTML = `<div class="shadow-writing-screen"><p class="shadow-muted">Preparing essay...</p></div>`;
    }
    return screen;
  }

  ShadowWritingLoader.start = async function () {
    console.log("[VERIFY] Shadow Writing loader entered.");
    const isGuest = ShadowWritingApi.isGuest?.();
    if (isGuest && guestUsage().limitReached) {
      ShadowWritingUI.showGuestLimitDialog();
      return;
    }

    const screen = prepareScreen();
    if (!screen) return;

    try {
      const data = await ShadowWritingApi.getNext();
      const attempt = {
        attempt_id: data?.attempt_id,
        essay: data?.essay,
      };
      ShadowWritingState.set({
        attemptId: attempt.attempt_id,
        essay: attempt.essay,
        startedAt: Date.now(),
        completed: false,
        result: null,
        isGuest: Boolean(data?.is_guest || isGuest),
      });
      screen.innerHTML = ShadowWritingUI.renderPractice(attempt);
      ShadowWritingTyping.bind({
        essay: attempt.essay,
        output: document.getElementById("shadow-writing-target"),
        mobileInput: document.getElementById("shadow-writing-input"),
        onComplete: ShadowWritingUI.showResult,
      });
    } catch (error) {
      console.error("Shadow Writing start error:", error);
      const message = error?.message === "telegram_id_required"
        ? "Please log in to use Shadow Writing."
        : "No Shadow Writing essay is available yet.";
      screen.innerHTML = `
        <div class="shadow-writing-screen">
          <div class="shadow-empty">${message}</div>
          <button class="shadow-secondary-btn" onclick="goHome()">Back to Home</button>
        </div>
      `;
    }
  };

  ShadowWritingLoader.exit = function () {
    const state = ShadowWritingState.get();
    ShadowWritingTyping.cleanup();
    if (typeof goHome === "function") goHome();
    window.VoxiFeedback?.requestFeedback?.({
      featureType: "shadow_writing",
      contextKey: `shadow_writing:${state.attemptId || state.essay?.id || "latest"}`,
      contextLabel: "Shadow Writing",
      delayMs: 300,
    });
  };
})();

window.showShadowWritingEntry = function () {
  ShadowWritingLoader.start();
};
