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

  function ensureBars(chartEl, categories) {
    const keys = categories.map((item) => String(item?.key || "")).join("|");
    if (chartEl.dataset.keys === keys) return;
    chartEl.dataset.keys = keys;
    chartEl.innerHTML = categories.map((item) => {
      const key = String(item?.key || "");
      const label = String(item?.label || "");
      const color = COLORS[key] || "#00baff";
      return `
        <div class="public-stats-bar-item" data-public-stat-key="${key}" style="--public-stat-color:${color}">
          <span class="public-stats-value">0</span>
          <span class="public-stats-bar-track" aria-hidden="true">
            <span class="public-stats-bar-fill" style="height:0%"></span>
          </span>
          <span class="public-stats-label">${label}</span>
        </div>
      `;
    }).join("");
  }

  function render(data) {
    const root = document.getElementById("publicHomeStats");
    if (!root) return;

    const categories = Array.isArray(data?.categories) ? data.categories : [];
    const max = Math.max(0, ...categories.map((item) => Number(item?.value || 0)));
    const liveUsers = Number(data?.live_users || 0);

    const liveEl = root.querySelector("[data-public-stat='live-users']");
    const totalEl = root.querySelector("[data-public-stat='total-learners']");
    const chartEl = root.querySelector("[data-public-stat='chart']");
    if (liveEl) liveEl.textContent = number(liveUsers);
    if (totalEl) totalEl.textContent = number(data?.total_learners || 0);
    if (!chartEl) return;

    ensureBars(chartEl, categories);
    categories.forEach((item) => {
      const key = String(item?.key || "");
      const value = Number(item?.value || 0);
      const itemEl = chartEl.querySelector(`[data-public-stat-key="${key}"]`);
      if (!itemEl) return;
      const valueEl = itemEl.querySelector(".public-stats-value");
      const fillEl = itemEl.querySelector(".public-stats-bar-fill");
      if (valueEl) valueEl.textContent = number(value);
      if (fillEl) fillEl.style.height = `${barHeight(value, max)}%`;
    });
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
