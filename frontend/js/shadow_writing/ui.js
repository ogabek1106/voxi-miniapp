window.ShadowWritingUI = window.ShadowWritingUI || {};

(function () {
  ShadowWritingUI.escape = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  ShadowWritingUI.renderPractice = function (attempt) {
    const essay = attempt?.essay || {};
    return `
      <div class="shadow-writing-screen">
        <div class="shadow-writing-head">
          <h2>Shadow Writing</h2>
          <p>${ShadowWritingUI.escape(essay.title || "Untitled Essay")} · ${ShadowWritingUI.escape(essay.level || "")} · ${ShadowWritingUI.escape(essay.theme || "")}</p>
        </div>

        <div class="shadow-essay-card">
          <div id="shadow-writing-target" class="shadow-target" aria-label="Essay text"></div>
        </div>

        <textarea id="shadow-writing-input" class="shadow-input" placeholder="Start typing the essay here..." autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>

        <div class="shadow-writing-actions">
          <button class="shadow-secondary-btn" onclick="ShadowWritingHistory.show()">History</button>
          <button class="shadow-secondary-btn" onclick="goHome()">Back</button>
        </div>
      </div>
    `;
  };

  ShadowWritingUI.showResult = async function (stats) {
    const screen = document.getElementById("screen-mocks");
    const state = ShadowWritingState.get();
    const essay = state.essay || {};
    try {
      const payload = {
        attempt_id: state.attemptId,
        essay_id: essay.id,
        ...stats,
      };
      await ShadowWritingApi.completeAttempt(payload);
    } catch (error) {
      console.error("Shadow Writing complete error:", error);
    }
    ShadowWritingState.set({ completed: true, result: stats });
    if (screen) screen.innerHTML = ShadowWritingResult.render(stats, essay);
  };
})();
