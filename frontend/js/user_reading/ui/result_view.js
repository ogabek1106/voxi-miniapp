// frontend/js/user_reading/ui/result_view.js
window.UserReading = window.UserReading || {};

UserReading.renderResultPage = function (container, data = {}) {
  if (!container) return;

  const band = Number(data.band ?? 7.5);
  const correct = data.correct ?? 34;
  const total = data.total ?? 40;

  const today = new Date();
const formattedDate = today.toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

container.innerHTML = `
  <div class="reading-result-page">
    <div class="reading-result-card" id="reading-result-card">
      <div class="reading-result-card-type">IELTS Reading</div>

      <div class="reading-result-band-box">
        <div class="reading-result-band-value" id="reading-result-band-value">0.0</div>
      </div>

      <div class="reading-result-score">Score: ${correct}/${total}</div>

      <div class="reading-result-date">${formattedDate}</div>

      <div class="reading-result-brand">Powered by EBAI Academy</div>
      <div class="reading-result-actions">
  <div class="result-action-item" id="result-share-btn">
    <div class="result-action-circle">🔗</div>
    <div class="result-action-label">Share</div>
  </div>

  <div class="result-action-item" id="result-story-btn">
    <div class="result-action-circle">📸</div>
    <div class="result-action-label">Story</div>
  </div>

  <div class="result-action-item" id="result-save-btn">
    <div class="result-action-circle">⬇️</div>
    <div class="result-action-label">Save</div>
  </div>
</div>
    </div>
  </div>
`;
  UserReading.animateBandValue(band);
};

UserReading.animateBandValue = function (targetBand) {
  const el = document.getElementById("reading-result-band-value");
  if (!el) return;

  let current = 0;
  const step = 0.1;

  function tick() {
    if (current >= targetBand) {
      el.textContent = targetBand.toFixed(1);
      return;
    }

    current = Math.min(current + step, targetBand);
    el.textContent = current.toFixed(1);

    // dynamic speed:
    const remaining = targetBand - current;

    let delay;
    if (remaining > 1.0) {
      delay = 20; // very fast at start
    } else if (remaining > 0.5) {
      delay = 50; // medium
    } else {
      delay = 120; // slow at the end (important!)
    }

    setTimeout(tick, delay);
  }

  tick();
};
