window.UserSpeakingUI = window.UserSpeakingUI || {};

UserSpeakingUI.renderHeader = function () {
  return `
    <div id="speaking-header" style="
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
        <div id="speaking-header-timer" style="
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
          <div id="speaking-timer-fill" style="
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 100%;
            background: #0ea5e9;
            transition: width 1s linear;
          "></div>
          <span id="speaking-timer-text" style="
            position: relative;
            z-index: 2;
            color: #fff;
          ">18:00</span>
        </div>
      </div>

      <button
        type="button"
        id="speaking-back-btn"
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

UserSpeakingUI.mixColor = function (fromRgb, toRgb, ratio) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const r = Math.round(fromRgb[0] + (toRgb[0] - fromRgb[0]) * clamped);
  const g = Math.round(fromRgb[1] + (toRgb[1] - fromRgb[1]) * clamped);
  const b = Math.round(fromRgb[2] + (toRgb[2] - fromRgb[2]) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
};

UserSpeakingUI.initTimer = function (timer, onExpire) {
  const text = document.getElementById("speaking-timer-text");
  const fill = document.getElementById("speaking-timer-fill");
  if (!text || !fill) return;

  const state = UserSpeakingState.get();
  if (state.intervals.globalTimer) {
    clearInterval(state.intervals.globalTimer);
  }

  const duration = Number(timer?.durationSeconds || 18 * 60);
  const endsAt = Number(timer?.endsAt || (Date.now() + duration * 1000));

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
    fill.style.background = UserSpeakingUI.mixColor([34, 197, 94], [220, 38, 38], elapsedRatio);
    text.style.color = leftRatio > 0.35 ? "#ffffff" : "#111111";

    if (leftSec <= 0) {
      const latest = UserSpeakingState.get();
      if (latest.intervals.globalTimer) {
        clearInterval(latest.intervals.globalTimer);
      }
      UserSpeakingState.set({
        intervals: {
          ...latest.intervals,
          globalTimer: null
        }
      });

      if (typeof onExpire === "function") {
        onExpire();
      }
    }
  };

  tick();
  const interval = setInterval(tick, 1000);
  UserSpeakingState.set({
    intervals: {
      ...state.intervals,
      globalTimer: interval
    }
  });
};
