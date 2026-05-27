window.XPUI = window.XPUI || {};

(function () {
  let state = {
    total: 0,
    history: [],
    settings: null,
    leaderboard: [],
    nicknameDraft: "",
    settingsMessage: "",
    displayName: "",
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

  function assetUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("/media/") && window.apiUrl) return window.apiUrl(value);
    return value;
  }

  function leaderboardBadge(item) {
    const url = assetUrl(item?.badge?.icon_url);
    if (!url) return `<span class="xp-leaderboard-badge" aria-hidden="true"></span>`;
    return `<span class="xp-leaderboard-badge"><img src="${escapeHtml(url)}" alt="" aria-hidden="true"></span>`;
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
    state.displayName = data?.display_name || "";
    setIndicatorValue(state.total);
    return data;
  }

  async function loadSettings() {
    state.settings = await window.apiGet(`/xp/settings${querySuffix()}`);
    state.nicknameDraft = state.settings?.nickname || "";
    return state.settings;
  }

  async function loadLeaderboard() {
    const suffix = querySuffix();
    const rows = await window.apiGet(`/xp/leaderboard${suffix}${suffix ? "&" : "?"}limit=100`);
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
    const nickname = state.nicknameDraft ?? settings.nickname ?? "";
    const nicknameChanged = String(nickname || "") !== String(settings.nickname || "");
    return `
      <div class="xp-settings">
        <p class="xp-settings-title">Leaderboard privacy</p>
        <div class="xp-nickname-field">
          <input id="xp-nickname" maxlength="40" placeholder="Custom nickname" value="${escapeHtml(nickname)}">
          <button class="xp-nickname-save" type="button" id="xp-save-nickname" ${nicknameChanged ? "" : "disabled"}>Save</button>
        </div>
        ${state.settingsMessage ? `<p class="xp-settings-message">${escapeHtml(state.settingsMessage)}</p>` : ""}
        <div class="xp-toggle-group">
          <label class="xp-toggle-row xp-switch-row">
            <input id="xp-show-full-name" type="checkbox" ${settings.show_full_name ? "checked" : ""}>
            <span class="xp-switch-visual" aria-hidden="true"></span>
            <span class="xp-switch-label">Show full profile name</span>
          </label>
          <label class="xp-toggle-row xp-switch-row">
            <input id="xp-show-full-username" type="checkbox" ${settings.show_full_username !== false ? "checked" : ""}>
            <span class="xp-switch-visual" aria-hidden="true"></span>
            <span class="xp-switch-label">Show full Telegram username</span>
          </label>
        </div>
      </div>
    `;
  }

  function leaderboardRowsForDisplay() {
    const rows = Array.isArray(state.leaderboard) ? state.leaderboard : [];
    const topRows = rows.slice(0, 7);
    const current = rows.find((item) => item?.is_current_user);
    if (!current || Number(current.rank || 0) <= 7) return topRows;
    const display = topRows.slice();
    if (Number(current.rank || 0) > 8) {
      display.push({ is_gap: true });
    }
    display.push(current);
    return display;
  }

  function renderSheet(mode = "summary") {
    const root = sheetRoot();
    const leaderboard = mode === "leaderboard"
      ? `
        <div class="xp-leaderboard">
          <p class="xp-leaderboard-title">Global Leaderboard</p>
          ${state.leaderboard.length ? leaderboardRowsForDisplay().map((item) => {
            if (item.is_gap) {
              return `<div class="xp-leaderboard-gap" aria-hidden="true">...</div>`;
            }
            const rank = Number(item.rank || 0);
            const medal = rank === 1 ? "xp-rank-gold" : rank === 2 ? "xp-rank-silver" : rank === 3 ? "xp-rank-bronze" : "";
            return `
            <div class="xp-leaderboard-row ${medal} ${item.is_current_user ? "is-current-user" : ""}">
              <span class="xp-rank">${rank}</span>
              <span class="xp-name">${escapeHtml(item.display_name || "Learner")}</span>
              ${leaderboardBadge(item)}
              <span class="xp-score">${Number(item.xp || 0)} XP</span>
            </div>
          `;}).join("") : `<p class="xp-empty">No XP leaders yet.</p>`}
        </div>
      `
      : "";

    root.innerHTML = `
      <div class="xp-sheet-backdrop" role="presentation">
        <div class="xp-sheet" role="dialog" aria-modal="true" aria-label="XP">
          <div class="xp-sheet-head">
            <div>
              <h3 class="xp-title">${mode === "leaderboard" ? "Leaderboard" : escapeHtml(state.displayName || "Global XP")}</h3>
              <p class="xp-total">Total XP: <strong>${Number(state.total || 0)}</strong></p>
            </div>
            <button class="xp-close" type="button" aria-label="Close XP">×</button>
          </div>
          ${mode === "leaderboard" ? leaderboard : `
            <div class="xp-history">
              <p class="xp-history-title">Recent XP history</p>
              <div class="xp-history-list">${renderHistory()}</div>
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

  async function saveSettings(overrides = {}) {
    const id = telegramId();
    const nicknameValue = document.getElementById("xp-nickname")?.value ?? state.settings?.nickname ?? "";
    const payload = {
      telegram_id: id,
      nickname: overrides.nickname ?? nicknameValue,
      show_full_name: overrides.show_full_name ?? Boolean(document.getElementById("xp-show-full-name")?.checked),
      show_full_username: overrides.show_full_username ?? Boolean(document.getElementById("xp-show-full-username")?.checked),
    };
    state.settings = await window.apiPost("/xp/settings", payload);
    state.nicknameDraft = state.settings?.nickname || "";
    state.settingsMessage = "";
    renderSheet("summary");
  }

  async function saveNickname() {
    const nickname = (document.getElementById("xp-nickname")?.value || "").trim();
    state.nicknameDraft = nickname;
    state.settingsMessage = "";
    if (nickname && nickname !== (state.settings?.nickname || "")) {
      const data = await window.apiGet(`/xp/nickname/check${querySuffix()}${querySuffix() ? "&" : "?"}nickname=${encodeURIComponent(nickname)}`);
      if (data?.available === false) {
        state.settingsMessage = "This nickname is already taken";
        renderSheet("summary");
        return;
      }
    }
    try {
      await saveSettings({ nickname });
    } catch (error) {
      state.settingsMessage = error?.status === 409 ? "This nickname is already taken" : "Could not save nickname";
      renderSheet("summary");
    }
  }

  async function autosaveToggle(event) {
    const target = event.target;
    if (!target || !target.matches("#xp-show-full-name, #xp-show-full-username")) return;
    try {
      await saveSettings({
        show_full_name: target.id === "xp-show-full-name" ? target.checked : undefined,
        show_full_username: target.id === "xp-show-full-username" ? target.checked : undefined,
      });
    } catch (_) {
      state.settingsMessage = "Could not save privacy setting";
      renderSheet("summary");
    }
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
      if (event.target.closest("#xp-save-nickname")) {
        saveNickname();
      }
    });
    document.addEventListener("input", (event) => {
      if (!event.target.matches("#xp-nickname")) return;
      state.nicknameDraft = event.target.value;
      const save = document.getElementById("xp-save-nickname");
      if (save) save.disabled = String(state.nicknameDraft || "") === String(state.settings?.nickname || "");
      if (state.settingsMessage) {
        state.settingsMessage = "";
        const message = document.querySelector(".xp-settings-message");
        if (message) message.remove();
      }
    });
    document.addEventListener("change", autosaveToggle);
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
