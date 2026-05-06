window.ShadowWritingLoader = window.ShadowWritingLoader || {};

(function () {
  function prepareScreen() {
    if (typeof hideAllScreens === "function") hideAllScreens();
    if (typeof hideAnnouncement === "function") hideAnnouncement();
    if (typeof setBottomNavVisible === "function") setBottomNavVisible(false);
    const screen = document.getElementById("screen-mocks");
    if (screen) {
      screen.style.display = "block";
      screen.innerHTML = `<div class="shadow-writing-screen"><p class="shadow-muted">Preparing essay...</p></div>`;
    }
    return screen;
  }

  ShadowWritingLoader.start = async function () {
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
      });
      screen.innerHTML = ShadowWritingUI.renderPractice(attempt);
      ShadowWritingTyping.bind({
        essay: attempt.essay,
        output: document.getElementById("shadow-writing-target"),
        input: document.getElementById("shadow-writing-input"),
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
})();

window.showShadowWritingEntry = function () {
  ShadowWritingLoader.start();
};
