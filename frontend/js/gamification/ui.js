window.GamificationUI = window.GamificationUI || {};

(function () {
  let cached = null;
  let previousBodyOverflow = "";

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

  function rewardIconAsset(fileName) {
    return `assets/gamification/rewards/${fileName}`;
  }

  function rewardIconCandidates(kind, value = 0) {
    const amount = Number(value || 0);
    if (kind === "xp_boost") {
      const boostMap = {
        5: ["xp-boost-5-green-lightning.png", "green-lightning.png"],
        10: ["xp-boost-10-blue-lightning.png", "blue-lightning.png"],
        20: ["xp-boost-20-purple-lightning.png", "purple-lightning.png"],
        30: ["xp-boost-30-orange-lightning.png", "orange-lightning.png"],
        40: ["xp-boost-40-gold-lightning.png", "gold-lightning.png", "white-gold-lightning.png"],
        50: ["xp-boost-50-white-gold-lightning.png", "white-gold-lightning.png", "gold-lightning.png"],
      };
      return (boostMap[amount] || ["xp-boost-lightning.png"]).map(rewardIconAsset);
    }
    if (kind === "xp") {
      const xpMap = {
        20: "xp-20-bronze.png",
        30: "xp-30-silver.png",
        50: "xp-50-rose-gold.png",
        70: "xp-70-ruby-red.png",
        80: "xp-80-emerald-teal.png",
        90: "xp-90-sapphire-cyan.png",
        100: "xp-100-rainbow-pearl.png",
      };
      return [rewardIconAsset(xpMap[amount] || "xp-generic.png")];
    }
    if (kind === "vcoin_coupon") return [rewardIconAsset("vcoin-coupon-purple-ticket.png")];
    if (kind === "vcoins") return ["assets/vcoin.png"];
    return [];
  }

  function iconImg(visual, sizeClass = "") {
    const sources = visual.sources || [];
    const fallback = escapeHtml(visual.fallback || "");
    if (!sources.length) {
      return `
        <span class="gamification-reward-icon ${sizeClass} is-missing-image">
          <span class="gamification-reward-fallback" aria-hidden="true">${fallback}</span>
        </span>
      `;
    }
    return `
      <span class="gamification-reward-icon ${sizeClass}">
        <img src="${escapeHtml(sources[0])}" alt="" aria-hidden="true" data-icon-fallbacks="${escapeHtml(sources.slice(1).join("|"))}">
        <span class="gamification-reward-fallback" aria-hidden="true">${fallback}</span>
      </span>
    `;
  }

  function badgeForCode(code, data = cached) {
    const value = String(code || "").trim();
    if (!value) return null;
    return (data?.badges || []).find((badge) => String(badge?.code || "") === value) || null;
  }

  function rewardVisuals(reward, data = cached) {
    const payload = reward?.reward_payload || {};
    const visuals = [];
    if (payload.xp) {
      const xp = Number(payload.xp || 0);
      visuals.push({
        key: `xp-${xp}`,
        label: `${xp} XP`,
        fallback: "XP",
        sources: rewardIconCandidates("xp", xp),
      });
    }
    if (payload.xp_boost_percent) {
      const percent = Number(payload.xp_boost_percent || 0);
      const hours = payload.xp_boost_hours ? ` for ${Number(payload.xp_boost_hours)}h` : "";
      visuals.push({
        key: `boost-${percent}`,
        label: `${percent}% XP booster${hours}`,
        fallback: `${percent}%`,
        sources: rewardIconCandidates("xp_boost", percent),
      });
    }
    if (payload.vcoin_coupon_percent) {
      const percent = Number(payload.vcoin_coupon_percent || 0);
      visuals.push({
        key: `coupon-${percent}`,
        label: `${percent}% V-Coin coupon`,
        fallback: "V",
        sources: rewardIconCandidates("vcoin_coupon", percent),
      });
    }
    if (payload.vcoins) {
      const vcoins = Number(payload.vcoins || 0);
      visuals.push({
        key: `vcoins-${vcoins}`,
        label: `${vcoins} V-Coins`,
        fallback: "V",
        sources: rewardIconCandidates("vcoins", vcoins),
      });
    }
    if (payload.freeze_cards) {
      const count = Number(payload.freeze_cards || 0);
      visuals.push({
        key: `freeze-${count}`,
        label: `${count} freeze card${count === 1 ? "" : "s"}`,
        fallback: "FR",
        sources: [],
      });
    }
    if (payload.free_block) {
      visuals.push({
        key: `free-${payload.free_block}`,
        label: `Free ${String(payload.free_block).replace(/_/g, " ")}`,
        fallback: "FREE",
        sources: [],
      });
    }
    if (payload.badge_code) {
      const badge = badgeForCode(payload.badge_code, data);
      const badgeName = badge?.name || String(payload.badge_code).replace(/_/g, " ");
      const badgeIcon = assetUrl(badge?.icon_url);
      visuals.push({
        key: `badge-${payload.badge_code}`,
        label: `Badge: ${badgeName}`,
        fallback: "BDG",
        sources: badgeIcon ? [badgeIcon] : [],
      });
    }
    if (!visuals.length && reward?.reward_type) {
      visuals.push({
        key: `type-${reward.reward_type}`,
        label: String(reward.reward_type).replace(/_/g, " "),
        fallback: "RW",
        sources: [],
      });
    }
    return visuals;
  }

  GamificationUI.tryRewardIcon = function (image) {
    const fallbacks = String(image?.dataset?.iconFallbacks || "").split("|").filter(Boolean);
    const next = fallbacks.shift();
    if (next) {
      image.dataset.iconFallbacks = fallbacks.join("|");
      image.src = next;
      return;
    }
    const icon = image.closest(".gamification-reward-icon");
    if (icon) icon.classList.add("is-missing-image");
  };

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

  function rewardsForDay(rewards, day) {
    return (rewards || []).filter((reward) => Number(reward.milestone_day) === Number(day));
  }

  function rewardForDay(rewards, day) {
    return rewardsForDay(rewards, day)[0] || null;
  }

  function renderDayRewardIcons(rewards, data = cached) {
    const visuals = rewards.flatMap((reward) => rewardVisuals(reward, data));
    if (!visuals.length) return "";
    const visible = visuals.slice(0, 3);
    const extra = visuals.length - visible.length;
    return `
      <span class="gamification-day-rewards" aria-hidden="true">
        ${visible.map((visual) => iconImg(visual, "is-day-icon")).join("")}
        ${extra > 0 ? `<span class="gamification-day-extra">+${extra}</span>` : ""}
      </span>
    `;
  }

  function renderCalendarGrid(monthly, selectedDay = 0, data = cached) {
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
      const rewards = rewardsForDay(monthly?.rewards, day);
      const reward = rewards[0];
      const claimed = rewards.length > 0 && rewards.every((item) => item.claimed);
      const claimable = rewards.some((item) => item.claimable);
      const isMilestone = [7, 14, 21, 30].includes(day);
      const classes = [
        "gamification-day",
        completed.has(day) ? "is-complete" : "",
        todayDay === day ? "is-today" : "",
        day === Number(selectedDay || 0) ? "is-selected" : "",
        claimable ? "is-claimable" : "",
        claimed ? "is-claimed" : "",
        rewards.length ? "has-reward" : "",
        isMilestone ? "is-milestone" : "",
      ].filter(Boolean).join(" ");
      cells.push(`
        <button class="${classes}" type="button" data-reward-day="${day}" ${rewards.length ? "" : "disabled"}>
          <span class="gamification-day-number">${day}</span>
          ${todayDay === day ? `<small class="gamification-today-badge">Today</small>` : ""}
          ${renderDayRewardIcons(rewards, data)}
          ${claimed ? `<small class="gamification-day-check" aria-hidden="true">✓</small>` : ""}
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

  function renderRewardDetail(rewards, data = cached) {
    const rewardList = Array.isArray(rewards) ? rewards.filter(Boolean) : (rewards ? [rewards] : []);
    if (!rewardList.length) return `<div class="gamification-reward-detail">Tap a reward day to see reward details.</div>`;
    const day = Number(rewardList[0]?.milestone_day || 0);
    const visuals = rewardList.flatMap((reward) => rewardVisuals(reward, data));
    const isChest = rewardList.some((reward) => reward.chest_type || String(reward.reward_type || "").toLowerCase() === "chest");
    const claimable = rewardList.some((reward) => reward.claimable);
    const claimed = rewardList.length > 0 && rewardList.every((reward) => reward.claimed);
    const title = isChest ? "Monthly Chest" : (rewardList.length > 1 ? `Day ${day} Rewards` : (rewardList[0]?.name || "Reward"));
    return `
      <div class="gamification-reward-detail ${isChest ? "is-monthly-chest" : ""}">
        <div class="gamification-reward-detail-main">
          <div>
            <strong>${escapeHtml(title)}</strong>
            <span>Day ${day} reward${rewardList.length === 1 ? "" : "s"}</span>
          </div>
          ${isChest ? `<em class="gamification-chest-label">Monthly Chest</em>` : ""}
        </div>
        <div class="gamification-reward-items">
          ${visuals.map((visual) => `
            <em>
              ${iconImg(visual, isChest ? "is-chest-icon" : "is-detail-icon")}
              <span>${escapeHtml(visual.label)}</span>
            </em>
          `).join("")}
        </div>
        ${claimable ? `<button type="button" data-claim-reward="${day}">Claim</button>` : ""}
        ${claimed ? `<em class="gamification-claimed-label">Claimed</em>` : ""}
      </div>
    `;
  }

  function renderProgress(monthly) {
    const completed = Number(monthly.completed_count || 0);
    const length = Number(monthly.month_length || 31);
    const pct = Math.max(0, Math.min(100, length ? (completed / length) * 100 : 0));
    return `
      <div class="gamification-calendar-progress" aria-label="${completed} of ${length} days secured">
        <span>${completed} / ${length} days secured</span>
        <div><i style="width: ${pct}%"></i></div>
      </div>
    `;
  }

  function lockCalendarScroll() {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  function unlockCalendarScroll() {
    document.body.style.overflow = previousBodyOverflow;
  }

  GamificationUI.openCalendar = function (data = cached) {
    if (!data?.monthly) return;
    cached = data || cached;
    if (document.getElementById("gamification-calendar-backdrop")) {
      document.getElementById("gamification-calendar-backdrop")?.remove();
      unlockCalendarScroll();
    }
    const monthly = data.monthly;
    const year = Number(monthly?.year || new Date().getFullYear());
    const month = Number(monthly?.month || (new Date().getMonth() + 1));
    const today = new Date();
    const todayDay = today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : 0;
    let selectedDay = Number(monthly.next_reward?.milestone_day || todayDay || 0);
    let selectedRewards = rewardsForDay(monthly.rewards, selectedDay);
    if (!selectedRewards.length && monthly.next_reward) selectedRewards = [monthly.next_reward];
    const backdrop = document.createElement("div");
    backdrop.id = "gamification-calendar-backdrop";
    backdrop.className = "gamification-calendar-backdrop";
    backdrop.innerHTML = `
      <div class="gamification-calendar-card" role="dialog" aria-modal="true" aria-label="Monthly streak calendar">
        <div class="gamification-calendar-head">
          <div>
            <h2>${monthName(monthly.month)} ${Number(monthly.year)}</h2>
            ${renderProgress(monthly)}
          </div>
          <button class="gamification-calendar-close" type="button" data-gamification-close="1" aria-label="Close calendar">X</button>
        </div>
        <div class="gamification-weekdays">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>
        <div class="gamification-calendar-grid">
          ${renderCalendarGrid(monthly, selectedDay, cached)}
        </div>
        <div id="gamification-reward-host">${renderRewardDetail(selectedRewards, cached)}</div>
      </div>
    `;
    lockCalendarScroll();
    document.body.appendChild(backdrop);
    backdrop.querySelectorAll(".gamification-reward-icon img").forEach((img) => {
      img.addEventListener("error", () => GamificationUI.tryRewardIcon(img));
    });
    backdrop.addEventListener("click", async (event) => {
      if (event.target === backdrop || event.target.closest("[data-gamification-close='1']")) {
        backdrop.remove();
        unlockCalendarScroll();
        return;
      }
      const rewardButton = event.target.closest("[data-reward-day]");
      if (rewardButton) {
        const day = Number(rewardButton.dataset.rewardDay);
        const rewards = rewardsForDay(monthly.rewards, day);
        selectedDay = day;
        const host = document.getElementById("gamification-reward-host");
        if (host) host.innerHTML = renderRewardDetail(rewards, cached);
        backdrop.querySelectorAll(".gamification-day.is-selected").forEach((button) => button.classList.remove("is-selected"));
        rewardButton.classList.add("is-selected");
        host?.querySelectorAll(".gamification-reward-icon img").forEach((img) => {
          img.addEventListener("error", () => GamificationUI.tryRewardIcon(img));
        });
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
          unlockCalendarScroll();
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
