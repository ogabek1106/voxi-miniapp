window.MockTransitionPage = window.MockTransitionPage || {};

MockTransitionPage._active = null;

MockTransitionPage.ensureStyles = function () {
  if (document.getElementById("mock-flow-transition-styles")) return;

  const style = document.createElement("style");
  style.id = "mock-flow-transition-styles";
  style.textContent = `
    .mock-flow-transition-wrap {
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
    }

    .mock-flow-transition-card {
      width: 100%;
      max-width: 560px;
      background: var(--card-bg, #f4f4f6);
      border-radius: 16px;
      padding: 22px 16px 18px;
      box-sizing: border-box;
      text-align: center;
      color: #111827;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    }

    .mock-flow-transition-title {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.3;
      margin-bottom: 10px;
    }

    .mock-flow-transition-text {
      font-size: 14px;
      line-height: 1.55;
      color: #374151;
      margin-bottom: 10px;
    }

    .mock-flow-transition-countdown {
      font-size: 36px;
      line-height: 1;
      font-weight: 800;
      margin: 14px 0 8px;
      color: #111827;
    }

    .mock-flow-transition-ready {
      width: 100%;
      height: 44px;
      border: 0;
      border-radius: 10px;
      background: #111827;
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 6px;
    }

    .mock-flow-transition-ready[disabled] {
      opacity: 0.75;
      cursor: not-allowed;
    }

    .mock-flow-transition-loader {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      border: 3px solid #d1d5db;
      border-top-color: #111827;
      margin: 10px auto 2px;
      animation: mock-flow-spin 0.8s linear infinite;
    }

    .mock-flow-transition-tip {
      margin-top: 10px;
      font-size: 12px;
      line-height: 1.45;
      color: #4b5563;
    }

    @keyframes mock-flow-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
};

MockTransitionPage.cleanup = function () {
  if (window.MockDebug?.log) {
    window.MockDebug.log("Transition.cleanup.enter", {
      hasActive: !!MockTransitionPage._active
    });
  }
  const active = MockTransitionPage._active;
  if (!active) return;

  if (active.intervalId) {
    clearInterval(active.intervalId);
  }
  if (active.tickTimeoutId) {
    clearTimeout(active.tickTimeoutId);
  }
  if (active.timeoutId) {
    clearTimeout(active.timeoutId);
  }
  if (active.readyBtn && active.readyHandler) {
    active.readyBtn.removeEventListener("click", active.readyHandler);
  }
  MockTransitionPage._active = null;
  if (window.MockDebug?.log) {
    window.MockDebug.log("Transition.cleanup.done");
  }
};

MockTransitionPage.show = function (config = {}) {
  if (window.MockDebug?.log) {
    window.MockDebug.log("Transition.show.enter", {
      currentPart: config?.currentPart,
      nextPart: config?.nextPart,
      durationSeconds: config?.durationSeconds,
      isFinal: !!config?.isFinal
    });
  }
  MockTransitionPage.cleanup();
  MockTransitionPage.ensureStyles();

  const container = config.container || document.getElementById("screen-reading");
  if (!container) return;

  const isFinal = !!config.isFinal;
  const currentPart = String(config.currentPart || "").trim() || "this part";
  const nextPart = String(config.nextPart || "").trim() || "the next part";
  const durationSeconds = Math.max(1, Number(config.durationSeconds || 60));
  const onReady = typeof config.onReady === "function" ? config.onReady : function () {};
  const tipTitle = String(config.tipTitle || "").trim();
  const tipText = String(config.tipText || "").trim();
  const tips = Array.isArray(config.tips) ? config.tips.filter(Boolean) : [];

  let left = durationSeconds;
  let done = false;

  function finish() {
    if (done) return;
    done = true;
    MockTransitionPage.cleanup();
    onReady();
  }

  const tipHtml = tips.length
    ? `<div class="mock-flow-transition-tip">${tips.join("<br>")}</div>`
    : (tipTitle || tipText)
      ? `<div class="mock-flow-transition-tip">${tipTitle ? `<strong>${tipTitle}</strong><br>` : ""}${tipText}</div>`
      : "";

  if (isFinal) {
    if (window.MockDebug?.log) {
      window.MockDebug.log("Transition.show.final.rendered", { durationSeconds });
    }
    container.innerHTML = `
      <div class="mock-flow-transition-wrap">
        <div class="mock-flow-transition-card">
          <div class="mock-flow-transition-title">You finished Speaking</div>
          <div class="mock-flow-transition-text">Your full mock test is complete.</div>
          <div class="mock-flow-transition-text">Your final result is being prepared.</div>
          <div class="mock-flow-transition-loader"></div>
          ${tipHtml}
        </div>
      </div>
    `;

    const timeoutId = setTimeout(finish, durationSeconds * 1000);
    MockTransitionPage._active = { timeoutId };
    return;
  }

  container.innerHTML = `
    <div class="mock-flow-transition-wrap">
      <div class="mock-flow-transition-card">
        <div class="mock-flow-transition-title">You finished ${currentPart}</div>
        <div class="mock-flow-transition-text">Now you will be redirected to the next part: ${nextPart}</div>
        <div class="mock-flow-transition-text">You have ${durationSeconds} seconds to prepare.</div>
        <div id="mock-flow-transition-countdown" class="mock-flow-transition-countdown">${left}</div>
        <button type="button" id="mock-flow-transition-ready" class="mock-flow-transition-ready">Ready</button>
        <div id="mock-flow-transition-ready-loader" class="mock-flow-transition-loader" style="display:none;"></div>
        ${tipHtml}
      </div>
    </div>
  `;

  const countdownEl = document.getElementById("mock-flow-transition-countdown");
  const readyBtn = document.getElementById("mock-flow-transition-ready");
  const readyLoader = document.getElementById("mock-flow-transition-ready-loader");
  const finishWithLoading = function () {
    if (window.MockDebug?.log) {
      window.MockDebug.log("Transition.finishWithLoading.called", {
        done,
        nextPart
      });
    }
    if (done) return;
    done = true;

    if (readyBtn) {
      readyBtn.disabled = true;
      readyBtn.textContent = `Opening ${nextPart}...`;
    }
    if (readyLoader) {
      readyLoader.style.display = "block";
    }

    MockTransitionPage.cleanup();
    if (window.MockDebug?.log) {
      window.MockDebug.log("Transition.finishWithLoading.onReady");
    }
    onReady();
  };

  const readyHandler = function () {
    if (window.MockDebug?.log) {
      window.MockDebug.log("Transition.ready.clicked", {
        currentText: countdownEl?.textContent || null
      });
    }
    finishWithLoading();
  };
  if (readyBtn) {
    readyBtn.addEventListener("click", readyHandler);
  }

  const endAtMs = Date.now() + durationSeconds * 1000;
  let lastLoggedLeft = null;
  MockTransitionPage._active = {
    intervalId: null,
    tickTimeoutId: null,
    readyBtn,
    readyHandler
  };

  const updateCountdown = function () {
    if (done) return;
    left = Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000));
    if (countdownEl) {
      countdownEl.textContent = String(left);
    }
    if (window.MockDebug?.log && left !== lastLoggedLeft) {
      if (left === durationSeconds || left % 5 === 0 || left <= 5) {
        window.MockDebug.log("Transition.tick", { left, nextPart });
      }
      lastLoggedLeft = left;
    }
    if (left <= 0) {
      if (window.MockDebug?.log) {
        window.MockDebug.log("Transition.tick.reachedZero");
      }
      finishWithLoading();
      return;
    }

    const tickTimeoutId = setTimeout(updateCountdown, 200);
    if (MockTransitionPage._active) {
      MockTransitionPage._active.tickTimeoutId = tickTimeoutId;
    }
  };
  updateCountdown();
};
