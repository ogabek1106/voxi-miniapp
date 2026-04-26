window.MockTransitionPage = window.MockTransitionPage || {};

MockTransitionPage._active = null;
MockTransitionPage._runSeq = 0;
MockTransitionPage._readyFromInline = function () {
  const active = MockTransitionPage._active;
  if (!active || typeof active.finish !== "function") return;
  active.finish("inline_click");
};

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

    .mock-flow-transition-progress {
      width: 100%;
      height: 8px;
      border-radius: 999px;
      background: #e5e7eb;
      overflow: hidden;
      margin: 0 0 12px;
    }

    .mock-flow-transition-progress-fill {
      height: 100%;
      width: 100%;
      background: #111827;
      transition: width 0.2s linear;
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
  if (active.container && active.containerClickHandler) {
    active.container.removeEventListener("click", active.containerClickHandler);
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
  const runId = ++MockTransitionPage._runSeq;

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
        <div id="mock-flow-transition-countdown-${runId}" class="mock-flow-transition-countdown">${left}</div>
        <div class="mock-flow-transition-progress">
          <div id="mock-flow-transition-progress-fill-${runId}" class="mock-flow-transition-progress-fill"></div>
        </div>
        <button type="button" id="mock-flow-transition-ready-${runId}" class="mock-flow-transition-ready">Ready</button>
        <div id="mock-flow-transition-ready-loader-${runId}" class="mock-flow-transition-loader" style="display:none;"></div>
        ${tipHtml}
      </div>
    </div>
  `;

  const countdownNodeId = `mock-flow-transition-countdown-${runId}`;
  const progressNodeId = `mock-flow-transition-progress-fill-${runId}`;
  const readyBtnId = `mock-flow-transition-ready-${runId}`;
  const readyLoaderId = `mock-flow-transition-ready-loader-${runId}`;

  const countdownEl = document.getElementById(countdownNodeId);
  const progressFillEl = document.getElementById(progressNodeId);
  const readyBtn = document.getElementById(readyBtnId);
  const readyLoader = document.getElementById(readyLoaderId);

  if (window.MockDebug?.log) {
    window.MockDebug.log("Transition.show.nodes", {
      runId,
      hasCountdown: !!countdownEl,
      hasReadyBtn: !!readyBtn,
      hasReadyLoader: !!readyLoader
    });
  }

  const finishWithLoading = function (source = "unknown") {
    if (window.MockDebug?.log) {
      window.MockDebug.log("Transition.finishWithLoading.called", {
        done,
        nextPart,
        source,
        runId
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
      window.MockDebug.log("Transition.ready.nativeClick", {
        runId,
        currentText: countdownEl?.textContent || null
      });
    }
    finishWithLoading("native_click");
  };

  const containerClickHandler = function (event) {
    const btn = event.target?.closest?.(".mock-flow-transition-ready");
    if (!btn) return;
    if (window.MockDebug?.log) {
      window.MockDebug.log("Transition.ready.delegatedClick", {
        runId,
        currentText: countdownEl?.textContent || null
      });
    }
    finishWithLoading("delegated_click");
  };

  const endAtMs = Date.now() + durationSeconds * 1000;
  let lastLoggedLeft = null;
  MockTransitionPage._active = {
    runId,
    intervalId: null,
    tickTimeoutId: null,
    readyBtn,
    readyHandler,
    container,
    containerClickHandler,
    finish: finishWithLoading
  };

  if (readyBtn) {
    readyBtn.addEventListener("click", readyHandler);
  }
  container.addEventListener("click", containerClickHandler);

  const updateCountdown = function () {
    const active = MockTransitionPage._active;
    if (!active || active.runId !== runId || done) return;

    left = Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000));
    const value = String(left);
    const ratio = Math.max(0, Math.min(1, left / durationSeconds));
    const width = `${Math.round(ratio * 100)}%`;

    // Update by id first (fast path).
    const liveCountdownEl = document.getElementById(countdownNodeId) || countdownEl;
    const liveProgressEl = document.getElementById(progressNodeId) || progressFillEl;
    if (liveCountdownEl) {
      liveCountdownEl.textContent = value;
      liveCountdownEl.innerText = value;
      liveCountdownEl.setAttribute("data-left", value);
    }
    if (liveProgressEl) {
      liveProgressEl.style.width = width;
    }

    // Also update all visible transition nodes in the active container.
    // This protects against Telegram/WebView DOM swaps where the old id node
    // is replaced but the visible class node remains.
    if (active.container) {
      const countdownNodes = active.container.querySelectorAll(".mock-flow-transition-countdown");
      for (const node of countdownNodes) {
        node.textContent = value;
        node.innerText = value;
        node.setAttribute("data-left", value);
      }
      const progressNodes = active.container.querySelectorAll(".mock-flow-transition-progress-fill");
      for (const node of progressNodes) {
        node.style.width = width;
      }
    }
    if (window.MockDebug?.log) {
      if (left !== lastLoggedLeft) {
        window.MockDebug.log("Transition.tick", { runId, left, nextPart });
        lastLoggedLeft = left;
      }
    }
    if (left <= 0) {
      if (window.MockDebug?.log) {
        window.MockDebug.log("Transition.tick.reachedZero", { runId });
      }
      finishWithLoading("timeout_zero");
    }
  };
  updateCountdown();
  const intervalId = setInterval(updateCountdown, 250);
  if (MockTransitionPage._active) {
    MockTransitionPage._active.intervalId = intervalId;
  }
};
