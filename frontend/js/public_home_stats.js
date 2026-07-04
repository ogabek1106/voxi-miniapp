window.PublicHomeStats = window.PublicHomeStats || {};

(function () {
  const REFRESH_MS = 30000;
  const COLORS = {
    shadow_writing: "#7c3aed",
    odd_one_out: "#10b981",
    word_shuffle: "#f59e0b",
    match_words: "#06b6d4",
    ielts_mock_test: "#ef4444",
    listening_test: "#3b82f6",
    reading_test: "#14b8a6",
    writing_test: "#f97316",
    speaking_test: "#ec4899",
  };
  let timer = null;

  function number(value) {
    return Number(value || 0).toLocaleString();
  }

  function barHeight(value, max) {
    if (!value || !max) return 0;
    return Math.max(8, Math.round((Number(value) / max) * 100));
  }

  function render(data) {
    const root = document.getElementById("publicHomeStats");
    if (!root) return;

    const categories = Array.isArray(data?.categories) ? data.categories : [];
    const max = Math.max(0, ...categories.map((item) => Number(item?.value || 0)));
    const liveUsers = Number(data?.live_users || 0);
    root.classList.toggle("is-empty", max === 0);

    const liveEl = root.querySelector("[data-public-stat='live-users']");
    const totalEl = root.querySelector("[data-public-stat='total-learners']");
    const chartEl = root.querySelector("[data-public-stat='chart']");
    if (liveEl) liveEl.textContent = number(liveUsers);
    if (totalEl) totalEl.textContent = number(data?.total_learners || 0);
    if (!chartEl) return;

    chartEl.innerHTML = categories.map((item) => {
      const key = String(item?.key || "");
      const label = String(item?.label || "");
      const value = Number(item?.value || 0);
      const color = COLORS[key] || "#00baff";
      return `
        <div class="public-stats-bar-item" style="--public-stat-color:${color}">
          <span class="public-stats-value">${value > 0 ? number(value) : ""}</span>
          <span class="public-stats-bar-track" aria-hidden="true">
            <span class="public-stats-bar-fill" style="height:${barHeight(value, max)}%"></span>
          </span>
          <span class="public-stats-label">${label}</span>
        </div>
      `;
    }).join("");
  }

  async function load() {
    try {
      const data = await apiGet("/activity/public-stats");
      render(data);
    } catch (error) {
      console.log("[PublicHomeStats] load failed", error?.message || error);
    }
  }

  PublicHomeStats.start = function () {
    if (timer) return;
    load();
    timer = window.setInterval(load, REFRESH_MS);
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(PublicHomeStats.start, 0);
  });
})();
