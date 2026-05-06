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

  ShadowWritingResult.render = function (result) {
    return ShadowWritingResult.renderStats(result);
  };

  ShadowWritingResult.formatTime = formatTime;
})();
