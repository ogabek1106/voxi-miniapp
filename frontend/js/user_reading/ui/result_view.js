// frontend/js/user_reading/ui/result_view.js
window.UserReading = window.UserReading || {};

UserReading.renderResultPage = function (container, data = {}) {
  if (!container) return;

  const band = data.band ?? "7.5";
  const correct = data.correct ?? 34;
  const total = data.total ?? 40;

  container.innerHTML = `
    <div class="reading-result-page">
      <div class="reading-result-title">Your IELTS Band</div>

      <div class="reading-result-band-box">
        <div class="reading-result-band-value">${band}</div>
      </div>

      <div class="reading-result-score">Score: ${correct}/${total}</div>
    </div>
  `;
};
