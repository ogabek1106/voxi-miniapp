// frontend/js/profile/ui/last_activity.js

window.ProfileUI = window.ProfileUI || {};

ProfileUI.escapeHtml = function (value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

ProfileUI.__lastActivities = [];

ProfileUI.parseScore = function (scoreValue) {
  const text = String(scoreValue ?? "").trim();
  const match = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (match) {
    return {
      correct: Number(match[1] || 0),
      total: Number(match[2] || 40)
    };
  }

  const correct = Number(text || 0);
  return {
    correct: Number.isFinite(correct) ? correct : 0,
    total: 40
  };
};

ProfileUI.openLastActivityResult = function (index) {
  const item = (ProfileUI.__lastActivities || [])[Number(index)];
  if (!item) return;

  const parsed = ProfileUI.parseScore(item.score);
  const band = Number(item.band || 0);

  const nav = document.querySelector(".bottom-nav");
  if (nav) nav.style.display = "none";

  const announcement = document.getElementById("announcement");
  if (announcement) announcement.style.display = "none";

  if (window.UserReading?.showResultScreen) {
    window.UserReading.showResultScreen({
      band: Number.isFinite(band) ? band : 0,
      correct: parsed.correct,
      total: parsed.total,
      backTarget: "profile"
    });
  }
};

ProfileUI.renderLastActivity = function (activity) {
  const list = Array.isArray(activity)
    ? activity.filter(Boolean)
    : (activity ? [activity] : []);

  ProfileUI.__lastActivities = list;

  if (!list.length) {
    return `
      <div class="profile-card profile-activity-card">
        <h3 class="profile-activity-title">Last Activity</h3>
        <div class="profile-row-subtitle">No reading activity yet.</div>
      </div>
    `;
  }

  const rowsHtml = list.map((item, index) => {
    const readingTitle = ProfileUI.escapeHtml(item.reading_title || "IELTS Academic Reading");
    const score = ProfileUI.escapeHtml(item.score || "-");
    const band = ProfileUI.escapeHtml(item.band || "-");

    return `
      <button class="profile-activity-row" onclick="ProfileUI.openLastActivityResult(${index})">
        <div class="profile-row-title">IELTS Reading</div>
        <div class="profile-row-subtitle">${readingTitle}</div>
        <div class="profile-result-line">
          <span>Score: ${score}</span>
          <span>Band: ${band}</span>
        </div>
      </button>
    `;
  }).join("");

  return `
    <div class="profile-card profile-activity-card">
      <h3 class="profile-activity-title">Last Activity</h3>
      <div class="profile-activity-list">
        ${rowsHtml}
      </div>
    </div>
  `;
};
