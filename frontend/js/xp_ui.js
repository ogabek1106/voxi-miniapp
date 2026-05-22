window.XPUI = window.XPUI || {};

(function () {
  let state = {
    total: 0,
    history: [],
    settings: null,
    leaderboard: [],
  };

  function telegramId() {
    const id = typeof window.getTelegramId === "function" ? Number(window.getTelegramId() || 0) : 0;
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  function querySuffix() {
    const id = telegramId();
    return id ? `?telegram_id=${encodeURIComponent(id)}` : "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function reasonLabel(reason) {
    return String(reason || "xp_award")
      .replace(/^shadow_/, "Shadow Writing ")
      .replace(/^odd_/, "Odd One Out ")
      .replace(/^word_shuffle_/, "Word Shuffle ")
      .replace(/^full_mock_/, "Full Mock ")
      .replace(/^reading_/, "Reading ")
      .replace(/^listening_/, "Listening ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function setIndicatorValue(value) {
    const normalized = String(Math.max(0, Number(value) || 0));
    [
      document.getElementById("home-xp-value"),
      document.getElementById("website-xp-value"),
    ].filter(Boolean).forEach((node) => {
      node.textContent = normalized;
    });
  }

  async function loadMe() {
    const data = await window.apiGet(`/xp/me${querySuffix()}`);
    state.total = Math.max(0, Number(data?.total_xp || 0));
    state.history = Array.isArray(data?.history) ? data.history : [];
    setIndicatorValue(state.total);
    return data;
  }

  async function loadSettings() {
    state.settings = await window.apiGet(`/xp/settings${querySuffix()}`);
    return state.settings;
  }

  async function loadLeaderboard() {
    const rows = await window.apiGet("/xp/leaderboard?limit=100");
    state.leaderboard = Array.isArray(rows) ? rows : [];
    return state.leaderboard;
  }

  function sheetRoot() {
    let root = document.getElementById("xp-sheet-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "xp-sheet-root";
      document.body.appendChild(root);
    }
    return root;
  }

  function close() {
    const root = document.getElementById("xp-sheet-root");
    if (root) root.innerHTML = "";
  }

  function renderHistory() {
    if (!state.history.length) {
      return `<p class="xp-empty">XP history will appear here after you complete activities.</p>`;
    }
    return state.history.slice(0, 8).map((item) => `
      <div class="xp-history-item">
        <span class="xp-history-reason">${escapeHtml(reasonLabel(item.reason))}</span>
        <span class="xp-history-amount">+${Number(item.amount || 0)} XP</span>
      </div>
    `).join("");
  }

  function renderSettings() {
    const settings = state.settings || {};
    return `
      <div class="xp-settings">
        <p class="xp-settings-title">Leaderboard privacy</p>
        <input id="xp-nickname" maxlength="40" placeholder="Custom nickname" value="${escapeHtml(settings.nickname || "")}">
        <label class="xp-toggle-row">
          <input id="xp-show-full-name" type="checkbox" ${settings.show_full_name ? "checked" : ""}>
          <span>Show full profile name</span>
        </label>
        <label class="xp-toggle-row">
          <input id="xp-show-full-username" type="checkbox" ${settings.show_full_username !== false ? "checked" : ""}>
          <span>Show full Telegram username</span>
        </label>
        <button class="xp-save" type="button" id="xp-save-settings">Save privacy settings</button>
      </div>
    `;
  }

  function renderSheet(mode = "summary") {
    const root = sheetRoot();
    const leaderboard = mode === "leaderboard"
      ? `
        <div class="xp-leaderboard">
          <p class="xp-leaderboard-title">Global Leaderboard</p>
          ${state.leaderboard.length ? state.leaderboard.map((item) => `
            <div class="xp-leaderboard-row">
              <span class="xp-rank">#${Number(item.rank || 0)}</span>
              <span class="xp-name">${escapeHtml(item.display_name || "Learner")}</span>
              <span class="xp-score">${Number(item.xp || 0)} XP</span>
            </div>
          `).join("") : `<p class="xp-empty">No XP leaders yet.</p>`}
        </div>
      `
      : "";

    root.innerHTML = `
      <div class="xp-sheet-backdrop" role="presentation">
        <div class="xp-sheet" role="dialog" aria-modal="true" aria-label="XP">
          <div class="xp-sheet-head">
            <div>
              <h3 class="xp-title">${mode === "leaderboard" ? "Leaderboard" : "Global XP"}</h3>
              <p class="xp-total">Total XP: <strong>${Number(state.total || 0)}</strong></p>
            </div>
            <button class="xp-close" type="button" aria-label="Close XP">×</button>
          </div>
          ${mode === "leaderboard" ? leaderboard : `
            <div class="xp-history">
              <p class="xp-history-title">Recent XP history</p>
              ${renderHistory()}
            </div>
            <a href="#" class="xp-link" id="xp-see-leaderboard">See Leaderboard</a>
            ${renderSettings()}
          `}
        </div>
      </div>
    `;
  }

  async function open() {
    try {
      await Promise.all([loadMe(), loadSettings()]);
    } catch (_) {
      state.history = [];
    }
    renderSheet("summary");
  }

  async function showLeaderboard(event) {
    event?.preventDefault?.();
    try {
      await Promise.all([loadMe(), loadLeaderboard()]);
    } catch (_) {
      state.leaderboard = [];
    }
    renderSheet("leaderboard");
  }

  async function saveSettings() {
    const id = telegramId();
    const payload = {
      telegram_id: id,
      nickname: document.getElementById("xp-nickname")?.value || "",
      show_full_name: Boolean(document.getElementById("xp-show-full-name")?.checked),
      show_full_username: Boolean(document.getElementById("xp-show-full-username")?.checked),
    };
    state.settings = await window.apiPost("/xp/settings", payload);
    renderSheet("summary");
  }

  function bind() {
    if (window.XPUI._bound) return;
    window.XPUI._bound = true;
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-xp-open='1']")) {
        event.preventDefault();
        open();
        return;
      }
      if (event.target.closest(".xp-close") || (event.target.classList && event.target.classList.contains("xp-sheet-backdrop"))) {
        close();
        return;
      }
      if (event.target.closest("#xp-see-leaderboard")) {
        showLeaderboard(event);
        return;
      }
      if (event.target.closest("#xp-save-settings")) {
        saveSettings();
      }
    });
  }

  window.XPUI.refresh = async function () {
    try {
      await loadMe();
    } catch (_) {
      setIndicatorValue(0);
    }
  };

  window.XPUI.open = open;

  document.addEventListener("DOMContentLoaded", () => {
    bind();
    window.XPUI.refresh();
  });
})();
