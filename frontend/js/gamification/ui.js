window.GamificationUI = window.GamificationUI || {};

(function () {
  let cached = null;

  function escapeHtml(value) {
    if (window.ProfileUI?.escapeHtml) return window.ProfileUI.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function monthName(month) {
    const date = new Date(2026, Number(month || 1) - 1, 1);
    return date.toLocaleString("en", { month: "long" });
  }

  function assetUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("/media/") && window.apiUrl) return window.apiUrl(value);
    return value;
  }

  function iconMarkup(badge) {
    const url = assetUrl(badge?.icon_url);
    if (url) return `<img src="${escapeHtml(url)}" alt="">`;
    return "";
  }

  function streakIconMarkup(data) {
    const badge = data?.current_badge;
    const url = assetUrl(badge?.icon_url);
    if (url) return `<img src="${escapeHtml(url)}" alt="" aria-hidden="true">`;
    return "";
  }

  GamificationUI.load = async function () {
    try {
      cached = await window.GamificationApi?.load?.();
      GamificationUI.updateHeaderIndicator(cached);
      return cached;
    } catch (error) {
      console.warn("Gamification load failed:", error);
      GamificationUI.updateHeaderIndicator(null);
      return null;
    }
  };

  GamificationUI.current = function () {
    return cached;
  };

  GamificationUI.renderBadgePill = function (data) {
    const badge = data?.current_badge;
    if (!badge) {
      return `<span class="website-profile-badge-pill"><span aria-hidden="true">New</span> New learner</span>`;
    }
    return `
      <span class="website-profile-badge-pill">
        ${iconMarkup(badge)}
        ${escapeHtml(badge.name)}
      </span>
    `;
  };

  GamificationUI.renderStreakCard = function (data) {
    const monthly = data?.monthly || {};
    const stats = data?.stats || {};
    const completed = Number(monthly.completed_count || 0);
    const length = Number(monthly.month_length || 31);
    const danger = Boolean(monthly.danger_state);
    const secured = Boolean(monthly.today_secured);
    const next = monthly.next_reward;
    return `
      <button class="website-profile-streak ${danger ? "is-danger" : ""}" type="button" data-gamification-calendar="1">
        <span class="website-profile-streak-icon">${streakIconMarkup(data)}</span>
        <span class="website-profile-streak-main">
          <strong>Monthly Streak</strong>
          <small>${completed} / ${length} days secured</small>
          <em>${danger ? "Secure today before midnight" : (secured ? "Secured today" : "Secure today to keep going")}</em>
          <span class="website-profile-streak-mini">
            <span>Freeze ${Number(stats.freeze_cards || 0)}</span>
            ${next ? `<span>Next day ${Number(next.milestone_day || 0)}</span>` : ""}
          </span>
        </span>
        <span class="website-profile-action-chevron" aria-hidden="true">&rsaquo;</span>
      </button>
    `;
  };

  function rewardForDay(rewards, day) {
    return (rewards || []).find((reward) => Number(reward.milestone_day) === Number(day));
  }

  function renderCalendarGrid(monthly) {
    const year = Number(monthly?.year || new Date().getFullYear());
    const month = Number(monthly?.month || (new Date().getMonth() + 1));
    const length = Number(monthly?.month_length || 31);
    const completed = new Set((monthly?.completed_days || []).map(Number));
    const today = new Date();
    const todayDay = today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : 0;
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;
    const cells = [];
    for (let i = 0; i < offset; i += 1) cells.push(`<span class="gamification-calendar-empty"></span>`);
    for (let day = 1; day <= length; day += 1) {
      const reward = rewardForDay(monthly?.rewards, day);
      const classes = [
        "gamification-day",
        completed.has(day) ? "is-complete" : "",
        todayDay === day ? "is-today" : "",
        reward?.claimable ? "is-claimable" : "",
        reward?.claimed ? "is-claimed" : "",
        reward ? "has-reward" : "",
      ].filter(Boolean).join(" ");
      cells.push(`
        <button class="${classes}" type="button" data-reward-day="${day}" ${reward ? "" : "disabled"}>
          <span>${day}</span>
          ${reward ? `<small class="gamification-reward-marker ${reward.claimed ? "is-claimed" : ""}" aria-hidden="true"></small>` : ""}
        </button>
      `);
    }
    return cells.join("");
  }

  function rewardItems(payload = {}, rewardType = "") {
    const items = [];
    if (payload.xp) items.push(`${Number(payload.xp)} XP`);
    if (payload.xp_boost_percent) {
      const hours = payload.xp_boost_hours ? ` for ${Number(payload.xp_boost_hours)}h` : "";
      items.push(`${Number(payload.xp_boost_percent)}% XP boost${hours}`);
    }
    if (payload.vcoins) items.push(`${Number(payload.vcoins)} V-Coins`);
    if (payload.freeze_cards) items.push(`${Number(payload.freeze_cards)} freeze card${Number(payload.freeze_cards) === 1 ? "" : "s"}`);
    if (payload.free_block) items.push(`Free ${String(payload.free_block).replace(/_/g, " ")}`);
    if (payload.badge_code) items.push(`Badge: ${String(payload.badge_code).replace(/_/g, " ")}`);
    if (payload.vcoin_coupon_percent) items.push(`${Number(payload.vcoin_coupon_percent)}% V-Coin coupon`);
    if (!items.length && rewardType) items.push(String(rewardType).replace(/_/g, " "));
    return items;
  }

  function renderRewardDetail(reward) {
    if (!reward) return `<div class="gamification-reward-detail">Tap a reward day to see reward details.</div>`;
    const payload = reward.reward_payload || {};
    const items = rewardItems(payload, reward.reward_type);
    return `
      <div class="gamification-reward-detail">
        <strong>${escapeHtml(reward.name || "Reward")}</strong>
        <span>Day ${Number(reward.milestone_day || 0)} reward</span>
        <div class="gamification-reward-items">
          ${items.map((item) => `<em>${escapeHtml(item)}</em>`).join("")}
        </div>
        ${reward.claimable ? `<button type="button" data-claim-reward="${Number(reward.milestone_day)}">Claim</button>` : ""}
        ${reward.claimed ? `<em class="gamification-claimed-label">Claimed</em>` : ""}
      </div>
    `;
  }

  GamificationUI.openCalendar = function (data = cached) {
    if (!data?.monthly) return;
    document.getElementById("gamification-calendar-backdrop")?.remove();
    const monthly = data.monthly;
    const backdrop = document.createElement("div");
    backdrop.id = "gamification-calendar-backdrop";
    backdrop.className = "gamification-calendar-backdrop";
    backdrop.innerHTML = `
      <div class="gamification-calendar-card" role="dialog" aria-modal="true" aria-label="Monthly streak calendar">
        <div class="gamification-calendar-head">
          <div>
            <h2>${monthName(monthly.month)} ${Number(monthly.year)}</h2>
            <p>${Number(monthly.completed_count || 0)} / ${Number(monthly.month_length || 31)} days secured</p>
          </div>
          <button type="button" data-gamification-close="1">Close</button>
        </div>
        <div class="gamification-weekdays">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>
        <div class="gamification-calendar-grid">
          ${renderCalendarGrid(monthly)}
        </div>
        <div id="gamification-reward-host">${renderRewardDetail(monthly.next_reward)}</div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", async (event) => {
      if (event.target === backdrop || event.target.closest("[data-gamification-close='1']")) {
        backdrop.remove();
        return;
      }
      const rewardButton = event.target.closest("[data-reward-day]");
      if (rewardButton) {
        const day = Number(rewardButton.dataset.rewardDay);
        const reward = rewardForDay(monthly.rewards, day);
        const host = document.getElementById("gamification-reward-host");
        if (host) host.innerHTML = renderRewardDetail(reward);
        return;
      }
      const claimButton = event.target.closest("[data-claim-reward]");
      if (claimButton) {
        claimButton.disabled = true;
        claimButton.textContent = "Claiming...";
        try {
          const result = await GamificationApi.claimMonthlyReward(Number(claimButton.dataset.claimReward));
          cached = result?.monthly ? { ...cached, monthly: result.monthly } : await GamificationUI.load();
          backdrop.remove();
          GamificationUI.openCalendar(cached);
        } catch (error) {
          console.warn("Reward claim failed:", error);
          claimButton.textContent = "Try again";
          claimButton.disabled = false;
        }
      }
    });
  };

  GamificationUI.bindProfile = function (root, data) {
    root?.querySelector("[data-gamification-calendar='1']")?.addEventListener("click", () => {
      GamificationUI.openCalendar(data || cached);
    });
  };

  GamificationUI.updateHeaderIndicator = function (data) {
    const profileButton = document.getElementById("website-profile-button");
    if (!profileButton) return;
    profileButton.classList.toggle("has-gamification-danger", Boolean(data?.monthly?.danger_state));
  };
})();
