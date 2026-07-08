window.ShadowWritingResult = window.ShadowWritingResult || {};

(function () {
  function formatTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safe / 60);
    const sec = String(safe % 60).padStart(2, "0");
    return `${minutes}:${sec}`;
  }

  ShadowWritingResult.renderStats = function (result) {
    return `
      <div class="shadow-result-grid">
        <div class="shadow-result-card"><span>Time</span><strong>${formatTime(result?.time_seconds)}</strong></div>
        <div class="shadow-result-card"><span>Speed</span><strong>${Number(result?.wpm || 0)} WPM</strong></div>
        <div class="shadow-result-card"><span>Accuracy</span><strong>${Number(result?.accuracy || 0)}%</strong></div>
        <div class="shadow-result-card"><span>Mistakes</span><strong>${Number(result?.mistakes_count || 0)}</strong></div>
        <div class="shadow-result-card"><span>Typed</span><strong>${Number(result?.typed_chars || 0)}</strong></div>
      </div>
    `;
  };

  ShadowWritingResult.renderActions = function () {
    return `
      <button class="shadow-primary-btn" onclick="ShadowWritingLoader.start()">Next essay</button>
      <button class="shadow-secondary-btn" onclick="ShadowWritingHistory.show()">History</button>
      <button class="shadow-secondary-btn" onclick="goHome()">Back</button>
    `;
  };

  ShadowWritingResult.renderCompletion = function (result, options = {}) {
    const isGuest = Boolean(options.isGuest);
    const signedActions = `
      <button class="shadow-primary-btn" onclick="ShadowWritingLoader.start()">Next Essay</button>
      <button class="shadow-secondary-btn" onclick="ShadowWritingHistory.show()">History</button>
      <button class="shadow-secondary-btn" onclick="ShadowWritingLoader.exit()">Exit</button>
    `;
    const guestActions = `
      <button class="shadow-primary-btn" onclick="window.WebsiteAuthModal?.open('signup')">Create Account</button>
      <button class="shadow-secondary-btn" onclick="window.WebsiteAuthModal?.open('login')">Log In</button>
      <button class="shadow-tertiary-btn" onclick="ShadowWritingLoader.start()">Next Essay</button>
    `;

    return `
      <section class="shadow-completion-panel">
        <div class="shadow-completion-head">
          <span class="shadow-completion-check" aria-hidden="true">&#10003;</span>
          <div>
            <h3>Shadow Writing Completed</h3>
          </div>
        </div>
        ${ShadowWritingResult.renderStats(result)}
        <div class="shadow-writing-result-actions">
          ${isGuest ? guestActions : signedActions}
        </div>
      </section>
    `;
  };

  ShadowWritingResult.render = function (result) {
    return ShadowWritingResult.renderStats(result);
  };

  ShadowWritingResult.formatTime = formatTime;
})();
