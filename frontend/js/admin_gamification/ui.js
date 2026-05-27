window.AdminGamificationUI = window.AdminGamificationUI || {};

(function () {
  const badgeConditions = [
    "streak_days",
    "xp_total",
    "vocabulary_activities_completed",
    "listening_tasks_completed",
    "shadow_writings_completed",
    "leaderboard_rank_top",
    "early_launch_user",
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function screen() {
    return document.getElementById("screen-mocks");
  }

  function assetUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("/media/") && window.apiUrl) return window.apiUrl(value);
    return value;
  }

  function option(value, label, selected) {
    return `<option value="${escapeHtml(value ?? "")}" ${String(value ?? "") === String(selected ?? "") ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function badgeForm(editing = null) {
    const iconUrl = assetUrl(editing?.icon_url);
    return `
      <form class="admin-gamification-card" id="admin-gamification-badge-form">
        <h3>${editing ? "Edit badge" : "Create badge"}</h3>
        <input type="hidden" id="gamification-badge-id" value="${escapeHtml(editing?.id || "")}">
        <label>Code <input id="gamification-badge-code" value="${escapeHtml(editing?.code || "")}" required></label>
        <label>Name <input id="gamification-badge-name" value="${escapeHtml(editing?.name || "")}" required></label>
        <label>Description <textarea id="gamification-badge-description">${escapeHtml(editing?.description || "")}</textarea></label>
        <div class="admin-gamification-two">
          <label>Type <input id="gamification-badge-type" value="${escapeHtml(editing?.type || "general")}"></label>
          <label>Sort order <input id="gamification-badge-sort" type="number" value="${Number(editing?.sort_order || 0)}"></label>
        </div>
        <label>Condition
          <select id="gamification-badge-condition">
            ${badgeConditions.map((item) => option(item, item, editing?.unlock_condition_type || "streak_days")).join("")}
          </select>
        </label>
        <label>Condition value <input id="gamification-badge-value" type="number" value="${editing?.unlock_condition_value ?? ""}"></label>
        <label>Icon URL <input id="gamification-badge-icon" value="${escapeHtml(editing?.icon_url || "")}"></label>
        <div class="admin-gamification-upload">
          <small>PNG/WebP icons are automatically fitted to 512x512. Transparent background recommended, max 5MB.</small>
          <div class="admin-gamification-icon-preview" id="gamification-badge-preview">
            ${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="">` : `<span>No icon uploaded</span>`}
          </div>
          <input id="gamification-badge-upload" type="file" accept="image/png,image/webp">
        </div>
        <label class="admin-gamification-check">Active <input id="gamification-badge-active" type="checkbox" ${editing?.is_active === false ? "" : "checked"}></label>
        <button type="submit">Save badge</button>
      </form>
    `;
  }

  function rewardForm(editing = null) {
    return `
      <form class="admin-gamification-card" id="admin-gamification-reward-form">
        <h3>${editing ? "Edit reward" : "Create reward"}</h3>
        <input type="hidden" id="gamification-reward-id" value="${escapeHtml(editing?.id || "")}">
        <label>Name <input id="gamification-reward-name" value="${escapeHtml(editing?.name || "")}" required></label>
        <div class="admin-gamification-two">
          <label>Month length
            <select id="gamification-reward-month">
              ${option("", "All months", editing?.month_length ?? "")}
              ${[28, 29, 30, 31].map((value) => option(value, value, editing?.month_length)).join("")}
            </select>
          </label>
          <label>Milestone day <input id="gamification-reward-day" type="number" min="1" max="31" value="${Number(editing?.milestone_day || 1)}"></label>
        </div>
        <div class="admin-gamification-two">
          <label>Reward type <input id="gamification-reward-type" value="${escapeHtml(editing?.reward_type || "xp")}"></label>
          <label>Chest type <input id="gamification-reward-chest" value="${escapeHtml(editing?.chest_type || "")}"></label>
        </div>
        <label>Reward payload JSON <textarea id="gamification-reward-payload">${escapeHtml(JSON.stringify(editing?.reward_payload || { xp: 20 }, null, 2))}</textarea></label>
        <label>Sort order <input id="gamification-reward-sort" type="number" value="${Number(editing?.sort_order || 0)}"></label>
        <label class="admin-gamification-check">Active <input id="gamification-reward-active" type="checkbox" ${editing?.is_active === false ? "" : "checked"}></label>
        <button type="submit">Save reward</button>
      </form>
    `;
  }

  function badgeList(badges) {
    if (!badges.length) return `<div class="admin-gamification-empty">No badges yet.</div>`;
    return badges.map((badge) => {
      const iconUrl = assetUrl(badge.icon_url);
      return `
        <div class="admin-gamification-row">
          <span class="admin-gamification-icon">${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="">` : ""}</span>
          <span><strong>${escapeHtml(badge.name)}</strong><small>${escapeHtml(badge.code)} - ${escapeHtml(badge.unlock_condition_type)} ${badge.unlock_condition_value ?? ""}</small></span>
          <button type="button" data-edit-badge="${Number(badge.id)}">Edit</button>
          <button type="button" data-delete-badge="${Number(badge.id)}">Disable</button>
        </div>
      `;
    }).join("");
  }

  function rewardList(rewards) {
    if (!rewards.length) return `<div class="admin-gamification-empty">No monthly rewards yet.</div>`;
    return rewards.map((reward) => `
      <div class="admin-gamification-row">
        <span><strong>${escapeHtml(reward.name)}</strong><small>${reward.month_length || "All"} months - day ${Number(reward.milestone_day)} - ${escapeHtml(reward.reward_type)}</small></span>
        <button type="button" data-edit-reward="${Number(reward.id)}">Edit</button>
        <button type="button" data-delete-reward="${Number(reward.id)}">Disable</button>
      </div>
    `).join("");
  }

  AdminGamificationUI.render = function (state = {}) {
    hideAllScreens();
    window.hideAnnouncement?.();
    window.setBottomNavVisible?.(false);
    const host = screen();
    if (!host) return;
    const tab = state.tab || "badges";
    host.style.display = "block";
    host.classList.add("admin-gamification-host");
    host.innerHTML = `
      <div class="admin-gamification-page">
        <div class="admin-gamification-head">
          <div>
            <h2>Gamification</h2>
            <p>Manage badges, uploaded icons, and monthly streak rewards.</p>
          </div>
          <button type="button" onclick="showAdminPanel()">Back</button>
        </div>
        <div class="admin-gamification-tabs">
          <button class="${tab === "badges" ? "active" : ""}" data-gamification-tab="badges">Badges</button>
          <button class="${tab === "rewards" ? "active" : ""}" data-gamification-tab="rewards">Monthly Rewards</button>
        </div>
        <div class="admin-gamification-layout">
          <div>${tab === "badges" ? badgeForm(state.editingBadge) : rewardForm(state.editingReward)}</div>
          <div class="admin-gamification-card">
            <h3>${tab === "badges" ? "Badges" : "Monthly rewards"}</h3>
            ${tab === "badges" ? badgeList(state.badges || []) : rewardList(state.rewards || [])}
          </div>
        </div>
      </div>
    `;
  };

  AdminGamificationUI.setIconPreview = function (url) {
    const input = document.getElementById("gamification-badge-icon");
    const preview = document.getElementById("gamification-badge-preview");
    if (input) input.value = url || "";
    if (preview) {
      const finalUrl = assetUrl(url);
      preview.innerHTML = finalUrl ? `<img src="${escapeHtml(finalUrl)}" alt="">` : `<span>No icon uploaded</span>`;
    }
  };

  AdminGamificationUI.collectBadge = function () {
    const rawValue = document.getElementById("gamification-badge-value")?.value;
    return {
      id: document.getElementById("gamification-badge-id")?.value || null,
      code: document.getElementById("gamification-badge-code")?.value?.trim() || "",
      name: document.getElementById("gamification-badge-name")?.value?.trim() || "",
      description: document.getElementById("gamification-badge-description")?.value?.trim() || null,
      type: document.getElementById("gamification-badge-type")?.value?.trim() || "general",
      icon_url: document.getElementById("gamification-badge-icon")?.value?.trim() || null,
      unlock_condition_type: document.getElementById("gamification-badge-condition")?.value || "streak_days",
      unlock_condition_value: rawValue === "" ? null : Number(rawValue),
      sort_order: Number(document.getElementById("gamification-badge-sort")?.value || 0),
      is_active: Boolean(document.getElementById("gamification-badge-active")?.checked),
    };
  };

  AdminGamificationUI.collectReward = function () {
    let payload = {};
    try {
      payload = JSON.parse(document.getElementById("gamification-reward-payload")?.value || "{}");
    } catch (_error) {
      alert("Reward payload must be valid JSON.");
      return null;
    }
    const month = document.getElementById("gamification-reward-month")?.value;
    return {
      id: document.getElementById("gamification-reward-id")?.value || null,
      name: document.getElementById("gamification-reward-name")?.value?.trim() || "",
      month_length: month ? Number(month) : null,
      milestone_day: Number(document.getElementById("gamification-reward-day")?.value || 1),
      reward_type: document.getElementById("gamification-reward-type")?.value?.trim() || "xp",
      reward_payload: payload,
      chest_type: document.getElementById("gamification-reward-chest")?.value?.trim() || null,
      sort_order: Number(document.getElementById("gamification-reward-sort")?.value || 0),
      is_active: Boolean(document.getElementById("gamification-reward-active")?.checked),
    };
  };

  AdminGamificationUI.findBadge = (items, id) => (items || []).find((item) => Number(item.id) === Number(id));
  AdminGamificationUI.findReward = (items, id) => (items || []).find((item) => Number(item.id) === Number(id));
})();
