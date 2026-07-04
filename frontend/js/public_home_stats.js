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
  const SCALE_STEPS = [50, 100, 250, 500, 1000, 2500, 5000];
  const ZERO_BAR_HEIGHT = 2;
  const MIN_ACTIVE_BAR_HEIGHT = 9;
  let timer = null;
  let tooltipTimer = null;

  function number(value) {
    return Number(value || 0).toLocaleString();
  }

  function chartMax(values) {
    const highest = Math.max(0, ...values.map((value) => Number(value || 0)));
    return SCALE_STEPS.find((step) => highest <= step) || Math.ceil(highest / 5000) * 5000;
  }

  function scaleTicks(max) {
    return [max, Math.round(max / 2), 0];
  }

  function barHeight(value, max) {
    if (!value) return ZERO_BAR_HEIGHT;
    return Math.min(100, Math.max(MIN_ACTIVE_BAR_HEIGHT, Math.round((Number(value) / max) * 100)));
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
        <div class="public-stats-bar-item" data-public-stat-key="${key}" data-public-stat-label="${label}" style="--public-stat-color:${color}">
          <span class="public-stats-bar-fill" style="height:${ZERO_BAR_HEIGHT}%"></span>
          <span class="public-stats-label">${label}</span>
        </div>
      `;
    }).join("");

    chartEl.innerHTML = `
      <div class="public-stats-chart-inner">
        <div class="public-stats-y-axis" aria-hidden="true">
          <span data-public-stat-tick="0" style="top:0; transform:translateY(0)">0</span>
          <span data-public-stat-tick="1" style="top:50%; transform:translateY(-50%)">0</span>
          <span data-public-stat-tick="2" style="top:100%; transform:translateY(-100%)">0</span>
        </div>
        <div class="public-stats-plot">
          <span class="public-stats-gridline" style="bottom:100%"></span>
          <span class="public-stats-gridline" style="bottom:50%"></span>
          <span class="public-stats-x-axis" aria-hidden="true"></span>
          <div class="public-stats-bars">${bars}</div>
          <div class="public-stats-tooltip" data-public-stat-tooltip></div>
        </div>
      </div>
    `;
    bindTooltip(chartEl);
  }

  function isCompactStatsView() {
    return window.matchMedia?.("(max-width: 640px)")?.matches;
  }

  function hideTooltip(chartEl) {
    const tooltip = chartEl?.querySelector("[data-public-stat-tooltip]");
    if (!tooltip) return;
    tooltip.classList.remove("is-visible");
  }

  function showTooltip(chartEl, barEl) {
    if (!isCompactStatsView()) return;
    const tooltip = chartEl.querySelector("[data-public-stat-tooltip]");
    const plot = chartEl.querySelector(".public-stats-plot");
    if (!tooltip || !plot || !barEl) return;
    const plotRect = plot.getBoundingClientRect();
    const barRect = barEl.getBoundingClientRect();
    const left = Math.max(18, Math.min(plotRect.width - 18, barRect.left + (barRect.width / 2) - plotRect.left));
    tooltip.textContent = barEl.dataset.publicStatLabel || "";
    tooltip.style.left = `${left}px`;
    tooltip.classList.add("is-visible");
    window.clearTimeout(tooltipTimer);
    tooltipTimer = window.setTimeout(() => hideTooltip(chartEl), 2200);
  }

  function bindTooltip(chartEl) {
    if (chartEl.dataset.tooltipBound === "1") return;
    chartEl.dataset.tooltipBound = "1";
    const handleBarTap = (event) => {
      const barEl = event.target?.closest?.(".public-stats-bar-item");
      if (!barEl || !chartEl.contains(barEl)) return;
      event.stopPropagation();
      showTooltip(chartEl, barEl);
    };
    chartEl.addEventListener("pointerup", handleBarTap);
    chartEl.addEventListener("click", handleBarTap);
    document.addEventListener("click", () => hideTooltip(chartEl));
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
    const values = categories.map((item) => Number(item?.value || 0));
    const max = chartMax(values);
    scaleTicks(max).forEach((tick, index) => {
      const tickEl = chartEl.querySelector(`[data-public-stat-tick="${index}"]`);
      if (tickEl) tickEl.textContent = number(tick);
    });
    categories.forEach((item) => {
      const key = String(item?.key || "");
      const value = Number(item?.value || 0);
      const itemEl = chartEl.querySelector(`[data-public-stat-key="${key}"]`);
      if (!itemEl) return;
      const fillEl = itemEl.querySelector(".public-stats-bar-fill");
      const height = barHeight(value, max);
      itemEl.style.setProperty("--public-stat-height", `${height}%`);
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
