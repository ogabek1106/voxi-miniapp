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
  const CHART_MAX = 1000;
  let timer = null;

  function number(value) {
    return Number(value || 0).toLocaleString();
  }

  function barHeight(value) {
    if (!value) return 4;
    return Math.min(100, Math.max(4, Math.round((Number(value) / CHART_MAX) * 100)));
  }

  function ensureBars(chartEl, categories) {
    const keys = categories.map((item) => String(item?.key || "")).join("|");
    if (chartEl.dataset.keys === keys) return;
    chartEl.dataset.keys = keys;
    const bars = categories.map((item) => {
      const key = String(item?.key || "");
      const label = String(item?.label || "");
      const color = COLORS[key] || "#00baff";
      return `
        <div class="public-stats-bar-item" data-public-stat-key="${key}" style="--public-stat-color:${color}">
          <span class="public-stats-value">0</span>
          <span class="public-stats-bar-fill" style="height:4%"></span>
          <span class="public-stats-label">${label}</span>
        </div>
      `;
    }).join("");

    chartEl.innerHTML = `
      <div class="public-stats-chart-inner">
        <div class="public-stats-y-axis" aria-hidden="true">
          <span style="bottom:100%">1000</span>
          <span style="bottom:50%">500</span>
          <span style="bottom:10%">100</span>
          <span style="bottom:5%">50</span>
          <span style="bottom:0%">0</span>
        </div>
        <div class="public-stats-plot">
          <span class="public-stats-gridline" style="bottom:100%"></span>
          <span class="public-stats-gridline" style="bottom:50%"></span>
          <span class="public-stats-gridline" style="bottom:10%"></span>
          <span class="public-stats-gridline" style="bottom:5%"></span>
          <span class="public-stats-x-axis" aria-hidden="true"></span>
          <div class="public-stats-bars">${bars}</div>
        </div>
      </div>
    `;
  }

  function render(data) {
    const root = document.getElementById("publicHomeStats");
    if (!root) return;

    const categories = Array.isArray(data?.categories) ? data.categories : [];
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
      const height = barHeight(value);
      itemEl.style.setProperty("--public-stat-height", `${height}%`);
      if (valueEl) valueEl.textContent = number(value);
      if (fillEl) fillEl.style.height = `${height}%`;
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
