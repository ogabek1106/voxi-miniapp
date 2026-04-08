// frontend/js/user_reading/ui/header.js

window.UserReading = window.UserReading || {};

/**
 * Renders NEW header (no legacy, no back button)
 */
UserReading.renderHeader = function () {
  return `
    <div id="reading-header" style="
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--bg-color, #fff);
      padding: 6px 8px;
    ">
      
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        height: 40px;
      ">

        <!-- TIMER -->
        <div id="header-timer" style="
          flex: 1;
          position: relative;
          height: 100%;
          border-radius: 8px;
          background: #e5e5ea;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
        ">
          <div id="timer-fill" style="
            position: absolute;
            right: 0;
            top: 0;
            height: 100%;
            width: 100%;
            background: #4f46e5;
            transition: width 1s linear;
          "></div>

          <span id="timer-text" style="
            position: relative;
            z-index: 2;
            color: white;
          ">60:00</span>
        </div>

        <!-- PASSAGE -->
        <div id="header-passage" style="
          flex: 1;
          height: 100%;
          border-radius: 8px;
          background: #f4f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        ">
          Passage 1
        </div>

        <!-- QUESTION COUNTER -->
        <div id="header-questions" style="
          flex: 1;
          position: relative;
          height: 100%;
          border-radius: 8px;
          background: #e5e5ea;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
        ">
          <div id="questions-fill" style="
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 0%;
            background: red;
            transition: width 0.3s ease, background 0.3s ease;
          "></div>

          <span id="questions-text" style="
            position: relative;
            z-index: 2;
          ">0/0</span>
        </div>

      </div>
    </div>
  `;
};
