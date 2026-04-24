window.UserWritingUI = window.UserWritingUI || {};

UserWritingUI.renderHeader = function () {
  return `
    <div id="writing-header" style="
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--bg-color, #fff);
      padding: 4px 8px;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 6px;
        height: 30px;
      ">
        <div id="writing-header-timer" style="
          flex: 1;
          position: relative;
          height: 100%;
          border-radius: 6px;
          background: #e5e5ea;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
        ">
          <div id="writing-timer-fill" style="
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 100%;
            background: #0ea5e9;
            transition: width 1s linear;
          "></div>
          <span id="writing-timer-text" style="
            position: relative;
            z-index: 2;
            color: #fff;
          ">60:00</span>
        </div>
      </div>

      <button
        type="button"
        id="writing-back-btn"
        aria-label="Back"
        style="
          position: fixed;
          left: 10px;
          bottom: 20px;
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 50%;
          background: #f4f4f6;
          color: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 5px 14px rgba(0,0,0,0.16);
          cursor: pointer;
          z-index: 140;
        "
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M9 5L3.5 11L9 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M4.5 11H17.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path>
        </svg>
      </button>
    </div>
  `;
};

UserWritingUI.mixColor = function (fromRgb, toRgb, ratio) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const r = Math.round(fromRgb[0] + (toRgb[0] - fromRgb[0]) * clamped);
  const g = Math.round(fromRgb[1] + (toRgb[1] - fromRgb[1]) * clamped);
  const b = Math.round(fromRgb[2] + (toRgb[2] - fromRgb[2]) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
};

UserWritingUI.initTimer = function (timer, data = {}) {
  const text = document.getElementById("writing-timer-text");
  const fill = document.getElementById("writing-timer-fill");
  if (!text || !fill) return;

  const state = UserWritingState.get();
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }

  const configuredMinutes = Number(data?.time_limit_minutes || 60);
  const expectedDuration = Math.max(1, configuredMinutes) * 60;
  const serverDuration = Number(timer?.duration_seconds || 0);
  const duration = serverDuration > 0 ? serverDuration : expectedDuration;
  const serverEndsAt = timer?.ends_at ? new Date(timer.ends_at).getTime() : NaN;
  const endsAt = Number.isFinite(serverEndsAt) ? serverEndsAt : Date.now() + duration * 1000;

  const tick = function () {
    const rawLeftSec = (endsAt - Date.now()) / 1000;
    const leftSec = Math.max(0, Math.min(duration, Math.ceil(rawLeftSec)));
    const minutes = String(Math.floor(leftSec / 60)).padStart(2, "0");
    const seconds = String(leftSec % 60).padStart(2, "0");
    const leftRatio = duration > 0 ? Math.max(0, Math.min(1, leftSec / duration)) : 0;
    const percent = leftRatio * 100;
    const elapsedRatio = 1 - leftRatio;

    text.textContent = `${minutes}:${seconds}`;
    fill.style.width = `${percent}%`;
    fill.style.background = UserWritingUI.mixColor([34, 197, 94], [220, 38, 38], elapsedRatio);
    text.style.color = leftRatio > 0.35 ? "#ffffff" : "#111111";

    if (leftSec <= 0) {
      const next = UserWritingState.get();
      if (next.timerInterval) {
        clearInterval(next.timerInterval);
      }
      UserWritingState.set({ timerInterval: null });

      if (!UserWritingState.get().isSubmitted) {
        UserWritingLoader.submit("auto");
      }
    }
  };

  tick();
  const interval = setInterval(tick, 1000);
  UserWritingState.set({ timerInterval: interval });
};

UserWritingUI.showAutosaveBadge = function (text = "Saved!") {
  const header = document.getElementById("writing-header");
  if (!header) return;

  let badge = document.getElementById("writing-autosave-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "writing-autosave-badge";
    badge.style.position = "absolute";
    badge.style.top = "36px";
    badge.style.left = "50%";
    badge.style.transform = "translateX(-50%)";
    badge.style.padding = "4px 8px";
    badge.style.borderRadius = "999px";
    badge.style.fontSize = "11px";
    badge.style.fontWeight = "700";
    badge.style.color = "#ffffff";
    badge.style.background = "#16a34a";
    badge.style.boxShadow = "0 6px 14px rgba(0,0,0,0.16)";
    badge.style.opacity = "0";
    badge.style.pointerEvents = "none";
    badge.style.transition = "opacity 0.2s ease";
    badge.style.zIndex = "160";
    header.appendChild(badge);
  }

  badge.textContent = text;
  badge.style.opacity = "1";
  if (UserWritingUI.__badgeTimer) clearTimeout(UserWritingUI.__badgeTimer);
  UserWritingUI.__badgeTimer = setTimeout(() => {
    badge.style.opacity = "0";
  }, 1200);
};
