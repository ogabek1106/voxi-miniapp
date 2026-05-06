window.ShadowWritingResult = window.ShadowWritingResult || {};

(function () {
  function formatTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safe / 60);
    const sec = String(safe % 60).padStart(2, "0");
    return `${minutes}:${sec}`;
  }

  ShadowWritingResult.render = function (result, essay) {
    return `
      <div class="shadow-writing-screen">
        <div class="shadow-writing-head">
          <h2>Shadow Writing Result</h2>
          <p>${essay?.title || "Untitled Essay"} · ${essay?.theme || "Theme"} · ${essay?.level || "Band"}</p>
        </div>

        <div class="shadow-result-grid">
          <div class="shadow-result-card"><span>Time</span><strong>${formatTime(result?.time_seconds)}</strong></div>
          <div class="shadow-result-card"><span>Accuracy</span><strong>${Number(result?.accuracy || 0)}%</strong></div>
          <div class="shadow-result-card"><span>Mistakes</span><strong>${Number(result?.mistakes_count || 0)}</strong></div>
          <div class="shadow-result-card"><span>Typed</span><strong>${Number(result?.typed_chars || 0)}</strong></div>
        </div>

        <button class="shadow-primary-btn" onclick="ShadowWritingLoader.start()">Next essay</button>
        <button class="shadow-secondary-btn" onclick="ShadowWritingHistory.show()">History</button>
        <button class="shadow-secondary-btn" onclick="goHome()">Back to Home</button>
      </div>
    `;
  };

  ShadowWritingResult.formatTime = formatTime;
})();
