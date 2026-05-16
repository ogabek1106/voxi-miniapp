window.ExamExitGuard = window.ExamExitGuard || {};

ExamExitGuard.ensureStyles = function () {
  if (document.getElementById("exam-exit-guard-styles")) return;

  const style = document.createElement("style");
  style.id = "exam-exit-guard-styles";
  style.textContent = `
    .exam-exit-guard-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(15, 23, 42, 0.48);
      box-sizing: border-box;
    }

    .exam-exit-guard-card {
      width: min(380px, 100%);
      border-radius: 20px;
      background: #ffffff;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
      padding: 20px 18px 16px;
      box-sizing: border-box;
      text-align: left;
    }

    .exam-exit-guard-title {
      font-size: 20px;
      line-height: 1.2;
      font-weight: 900;
      color: #111827;
      margin-bottom: 10px;
    }

    .exam-exit-guard-text {
      font-size: 14px;
      line-height: 1.5;
      color: #4b5563;
      margin-bottom: 16px;
    }

    .exam-exit-guard-actions {
      display: grid;
      grid-template-columns: 1fr 0.78fr;
      gap: 10px;
    }

    .exam-exit-guard-back,
    .exam-exit-guard-exit {
      min-height: 46px;
      border: 0;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 900;
      cursor: pointer;
    }

    .exam-exit-guard-back {
      color: #ffffff;
      background: #00baff;
      box-shadow: 0 12px 28px rgba(0, 186, 255, 0.3);
      animation: exam-exit-guard-flash 1.05s ease-in-out infinite;
    }

    .exam-exit-guard-exit {
      color: #991b1b;
      background: #fee2e2;
    }

    @keyframes exam-exit-guard-flash {
      0%, 100% {
        transform: translateY(0);
        filter: brightness(1);
      }
      50% {
        transform: translateY(-1px);
        filter: brightness(1.12);
      }
    }
  `;
  document.head.appendChild(style);
};

ExamExitGuard.confirmExit = function (onExit) {
  ExamExitGuard.ensureStyles();

  const existing = document.getElementById("exam-exit-guard");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "exam-exit-guard";
  overlay.className = "exam-exit-guard-overlay";
  overlay.innerHTML = `
    <div class="exam-exit-guard-card" role="dialog" aria-modal="true" aria-labelledby="exam-exit-guard-title">
      <div id="exam-exit-guard-title" class="exam-exit-guard-title">Leaving is prohibited during the exam</div>
      <div class="exam-exit-guard-text">
        If you leave now, your current answers will be submitted immediately. You cannot continue this attempt and your V-Coins will not be refunded.
      </div>
      <div class="exam-exit-guard-actions">
        <button type="button" class="exam-exit-guard-back">Back to the test</button>
        <button type="button" class="exam-exit-guard-exit">Exit</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const backBtn = overlay.querySelector(".exam-exit-guard-back");
  const exitBtn = overlay.querySelector(".exam-exit-guard-exit");

  const close = function () {
    overlay.remove();
  };

  if (backBtn) {
    backBtn.onclick = close;
  }

  if (exitBtn) {
    exitBtn.onclick = function () {
      close();
      if (typeof onExit === "function") onExit();
    };
  }
};

ExamExitGuard.goHome = function () {
  if (typeof window.goHome === "function") {
    window.goHome();
  }
};

ExamExitGuard.isVisible = function (selector) {
  const el = document.querySelector(selector);
  return !!el && getComputedStyle(el).display !== "none";
};

ExamExitGuard.goHomeWithGuard = function () {
  const activePart = String(window.__activeExamPart || "").toLowerCase();

  if (activePart === "listening" && ExamExitGuard.isVisible("#screen-reading") && !window.UserListening?.__isSubmitted) {
    window.UserListening?.goBack?.();
    return;
  }

  if (activePart === "reading" && ExamExitGuard.isVisible("#screen-reading") && !window.UserReading?.__isSubmitted) {
    window.UserReading?.goBack?.();
    return;
  }

  if (activePart === "writing" && ExamExitGuard.isVisible("#screen-writing") && !window.UserWritingState?.get?.().isSubmitted) {
    window.UserWritingLoader?.requestExitToHome?.();
    return;
  }

  if (activePart === "speaking" && ExamExitGuard.isVisible("#screen-speaking") && !window.UserSpeakingState?.get?.().isSubmitted) {
    window.UserSpeakingLoader?.requestExitToHome?.();
    return;
  }

  if (window.MockFlow?.active && window.ExamExitGuard?.confirmExit) {
    window.ExamExitGuard.confirmExit(function () {
      window.MockFlow?.deactivate?.();
      window.__activeExamPart = null;
      ExamExitGuard.goHome();
    });
    return;
  }

  ExamExitGuard.goHome();
};
