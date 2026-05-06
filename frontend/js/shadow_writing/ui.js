window.ShadowWritingUI = window.ShadowWritingUI || {};

(function () {
  function isAdmin() {
    if (window.__isAdmin) return true;
    const websiteUser = window.WebsiteAuthState?.getUser?.();
    return Boolean(websiteUser?.is_admin);
  }

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
    const meta = [
      essay.title || "Untitled Essay",
      essay.level || "",
      essay.theme || ""
    ].filter(Boolean).map(ShadowWritingUI.escape).join(" &middot; ");

    return `
      <div class="shadow-writing-screen">
        <div class="shadow-writing-head">
          <h2>Shadow Writing</h2>
          <p>${meta}</p>
          <div class="shadow-writing-actions">
            <button class="shadow-secondary-btn" onclick="ShadowWritingTyping.cleanup(); ShadowWritingHistory.show()">History</button>
            ${isAdmin() ? `<button class="shadow-finish-btn" onclick="ShadowWritingTyping.finishNow()">Finish Now</button>` : ""}
            <button class="shadow-secondary-btn" onclick="ShadowWritingTyping.cleanup(); goHome()">Back</button>
          </div>
        </div>

        <div id="shadow-writing-stats" class="shadow-stats-wrap" hidden></div>

        <div class="shadow-essay-card" onclick="document.getElementById('shadow-writing-input')?.focus({ preventScroll: true })">
          <div id="shadow-writing-target" class="shadow-target" aria-label="Essay text"></div>
        </div>

        <div id="shadow-writing-result-actions" class="shadow-writing-result-actions" hidden></div>

        <textarea id="shadow-writing-input" class="shadow-hidden-input" aria-hidden="true" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
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
    const statsEl = document.getElementById("shadow-writing-stats");
    const topActions = document.querySelector(".shadow-writing-head .shadow-writing-actions");
    const resultActions = document.getElementById("shadow-writing-result-actions");

    if (statsEl) {
      statsEl.innerHTML = ShadowWritingResult.renderStats(stats, essay);
      statsEl.hidden = false;
    }
    if (topActions) topActions.remove();
    if (resultActions) {
      resultActions.innerHTML = ShadowWritingResult.renderActions();
      resultActions.hidden = false;
    }
  };
})();
