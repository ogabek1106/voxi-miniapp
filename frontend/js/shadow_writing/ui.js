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
    const title = ShadowWritingUI.escape(essay.title || "Untitled Essay");
    const meta = [essay.level || "", essay.theme || ""].filter(Boolean).map(ShadowWritingUI.escape).join(" &middot; ");
    const isGuest = Boolean(ShadowWritingState.get().isGuest);

    return `
      <div class="shadow-writing-screen">
        <div class="shadow-writing-head">
          <h2>Shadow Writing</h2>
          <strong>${title}</strong>
          ${meta ? `<p>${meta}</p>` : ""}
          <div class="shadow-writing-actions">
            <button class="shadow-secondary-btn" onclick="ShadowWritingLoader.exit()">Back</button>
          </div>
        </div>

        <div class="shadow-essay-card" onclick="document.getElementById('shadow-writing-input')?.focus({ preventScroll: true })">
          <div id="shadow-writing-target" class="shadow-target" aria-label="Essay text"></div>
        </div>

        <div id="shadow-writing-completion" class="shadow-completion-wrap" hidden></div>

        <div id="shadow-writing-finish-actions" class="shadow-writing-finish-actions">
          <button class="shadow-finish-btn" onclick="ShadowWritingTyping.finishNow()">Finish Now</button>
        </div>

        <textarea id="shadow-writing-input" class="shadow-hidden-input" aria-hidden="true" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
      </div>
    `;
  };

  ShadowWritingUI.showResult = async function (stats) {
    const screen = document.getElementById("screen-mocks");
    const state = ShadowWritingState.get();
    const essay = state.essay || {};
    const isGuest = Boolean(state.isGuest);
    let guestUsage = null;
    if (isGuest) {
      guestUsage = ShadowWritingLoader.recordGuestCompletion?.();
    } else {
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
    }
    ShadowWritingState.set({ completed: true, result: stats });
    const completionEl = document.getElementById("shadow-writing-completion");
    const topActions = document.querySelector(".shadow-writing-head .shadow-writing-actions");
    const finishActions = document.getElementById("shadow-writing-finish-actions");

    if (completionEl) {
      completionEl.innerHTML = ShadowWritingResult.renderCompletion(stats, { isGuest, guestUsage });
      completionEl.hidden = false;
    }
    if (topActions) topActions.remove();
    if (finishActions) finishActions.remove();
    if (!isGuest) {
      window.VoxiFeedback?.requestFeedback?.({
        featureType: "shadow_writing",
        contextKey: `shadow_writing:${state.attemptId || essay.id || "latest"}`,
        contextLabel: "Shadow Writing",
        delayMs: 3000,
      });
    }
  };

  ShadowWritingUI.showGuestLimitDialog = function () {
    document.getElementById("shadow-guest-limit-dialog")?.remove();
    const backdrop = document.createElement("div");
    backdrop.id = "shadow-guest-limit-dialog";
    backdrop.className = "shadow-limit-backdrop";
    backdrop.innerHTML = `
      <section class="shadow-limit-card" role="dialog" aria-modal="true" aria-labelledby="shadow-limit-title">
        <button class="shadow-limit-close" type="button" data-shadow-limit-close="1" aria-label="Close">&times;</button>
        <div class="shadow-limit-mark" aria-hidden="true">*</div>
        <h2 id="shadow-limit-title">Today's free practice is complete</h2>
        <p>You have used your 3 free Shadow Writing essays for this 24-hour period. Create an account to keep practicing without limits.</p>
        <ul>
          <li>Unlimited Shadow Writing</li>
          <li>Saved History</li>
          <li>XP & Coins</li>
          <li>Progress Tracking</li>
        </ul>
        <div class="shadow-limit-actions">
          <button class="shadow-primary-btn" type="button" data-shadow-signup="1">Create Account</button>
          <button class="shadow-secondary-btn" type="button" data-shadow-login="1">Log In</button>
        </div>
      </section>
    `;
    function close() {
      backdrop.remove();
    }
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop || event.target.closest("[data-shadow-limit-close='1']")) close();
      if (event.target.closest("[data-shadow-signup='1']")) {
        close();
        window.WebsiteAuthModal?.open("signup");
      }
      if (event.target.closest("[data-shadow-login='1']")) {
        close();
        window.WebsiteAuthModal?.open("login");
      }
    });
    document.body.appendChild(backdrop);
  };
})();
