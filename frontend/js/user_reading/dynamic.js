// frontend/js/user_reading/dynamic.js
window.UserReading = window.UserReading || {};

UserReading.renderTest = function (container, data) {
  UserReading.renderShell(container);

  const title = document.getElementById("reading-user-title");
  const content = document.getElementById("reading-user-content");

  if (title) title.textContent = data?.title || "Reading Test";
  UserReading.startTimer(data?.timer);
  if (!content) return;

  content.innerHTML = (data.passages || [])
    .map((passage, pi) => UserReading.renderPassage(passage, pi))
    .join("");
};

UserReading.startTimer = function (timer) {
  const timerEl = document.getElementById("reading-user-timer");
  if (!timerEl) return;

  if (window.__userReadingTimer) {
    clearInterval(window.__userReadingTimer);
  }

  const endsAt = timer?.ends_at ? new Date(timer.ends_at).getTime() : null;
  if (!endsAt) {
    timerEl.textContent = "--:--";
    return;
  }

  function tick() {
    const leftMs = Math.max(0, endsAt - Date.now());
    const leftSec = Math.ceil(leftMs / 1000);
    const min = Math.floor(leftSec / 60).toString().padStart(2, "0");
    const sec = (leftSec % 60).toString().padStart(2, "0");

    timerEl.textContent = `${min}:${sec}`;

    if (leftSec <= 0 && window.__userReadingTimer) {
      clearInterval(window.__userReadingTimer);
      window.__userReadingTimer = null;
    }
  }

  tick();
  window.__userReadingTimer = setInterval(tick, 1000);
};

UserReading.renderPassage = function (passage, passageIndex) {
  const image = passage.image_url
    ? `<img src="${window.API}${passage.image_url}" style="width:100%; max-width:100%; border-radius:8px; margin:10px 0;" />`
    : "";

  return `
    <section class="reading-passage" style="margin-bottom:24px; text-align:left;">
      <h4>Passage ${passageIndex + 1}</h4>
      ${passage.title ? `<h5>${UserReading.escapeHtml(passage.title)}</h5>` : ""}
      ${image}
      <p style="white-space:pre-wrap; line-height:1.5;">
        ${UserReading.escapeHtml(passage.text || "")}
      </p>

      <div class="reading-questions">
        ${(passage.questions || []).map((q, qi) => window.renderSingleQuestion(q, qi)).join("")}
      </div>
    </section>
  `;
};

