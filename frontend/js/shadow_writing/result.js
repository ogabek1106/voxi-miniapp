window.ShadowWritingResult = window.ShadowWritingResult || {};

(function () {
  function formatTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safe / 60);
    const sec = String(safe % 60).padStart(2, "0");
    return `${minutes}:${sec}`;
  }

  function formatNumber(value, decimals = 0) {
    const safe = Number(value) || 0;
    return decimals > 0 ? safe.toFixed(decimals) : String(Math.round(safe));
  }

  function statItems(result) {
    const speed = Number(result?.wpm || 0);
    const accuracy = Number(result?.accuracy || 0);
    return [
      { key: "time", label: "Time", value: Number(result?.time_seconds || 0), type: "time", unit: "", decimals: 0 },
      { key: "speed", label: "Speed", value: speed, type: "number", unit: "WPM", decimals: Number.isInteger(speed) ? 0 : 1 },
      { key: "accuracy", label: "Accuracy", value: accuracy, type: "number", unit: "%", decimals: Number.isInteger(accuracy) ? 0 : 1 },
      { key: "mistakes", label: "Mistakes", value: Number(result?.mistakes_count || 0), type: "number", unit: "", decimals: 0 },
      { key: "typed", label: "Typed", value: Number(result?.typed_chars || 0), type: "number", unit: "", decimals: 0 },
    ];
  }

  function renderStatCard(item, animated) {
    const initialValue = item.type === "time" ? formatTime(0) : formatNumber(0, item.decimals);
    const finalValue = item.type === "time" ? formatTime(item.value) : formatNumber(item.value, item.decimals);
    const unit = item.unit ? `<small class="shadow-result-unit">${item.unit}</small>` : `<small class="shadow-result-unit" aria-hidden="true"></small>`;
    return `
      <div
        class="shadow-result-card ${animated ? "shadow-result-card--pending" : "shadow-result-card--ready"}"
        data-shadow-stat="${item.key}"
        data-shadow-type="${item.type}"
        data-shadow-value="${item.value}"
        data-shadow-decimals="${item.decimals}"
      >
        <span class="shadow-result-label">${item.label}</span>
        <strong class="shadow-result-value">${animated ? initialValue : finalValue}</strong>
        ${unit}
      </div>
    `;
  }

  ShadowWritingResult.renderStats = function (result, options = {}) {
    const animated = Boolean(options.animated);
    return `
      <div class="shadow-result-grid ${animated ? "shadow-result-grid--animated" : ""}">
        ${statItems(result).map((item) => renderStatCard(item, animated)).join("")}
      </div>
    `;
  };

  ShadowWritingResult.renderActions = function () {
    return `
      <button class="shadow-primary-btn" onclick="ShadowWritingLoader.start()">Next essay</button>
      <button class="shadow-secondary-btn" onclick="ShadowWritingHistory.show()">History</button>
      <button class="shadow-secondary-btn" onclick="goHome()">Back</button>
    `;
  };

  ShadowWritingResult.renderCompletion = function (result, options = {}) {
    const isGuest = Boolean(options.isGuest);
    const signedActions = `
      <button class="shadow-primary-btn" onclick="ShadowWritingLoader.start()">Next Essay</button>
      <button class="shadow-secondary-btn" onclick="ShadowWritingHistory.show()">History</button>
      <button class="shadow-secondary-btn" onclick="ShadowWritingLoader.exit()">Exit</button>
    `;
    const guestActions = `
      <button class="shadow-primary-btn" onclick="ShadowWritingLoader.start()">Next Essay</button>
      <button class="shadow-secondary-btn" onclick="window.WebsiteAuthModal?.open('signup')">Create Account</button>
      <button class="shadow-secondary-btn" onclick="window.WebsiteAuthModal?.open('login')">Log In</button>
    `;

    return `
      <section class="shadow-completion-panel">
        <div class="shadow-completion-head">
          <span class="shadow-completion-check" aria-hidden="true">&#10003;</span>
          <div>
            <h3>Shadow Writing Completed</h3>
          </div>
        </div>
        ${ShadowWritingResult.renderStats(result, { animated: true })}
        <div class="shadow-writing-result-actions shadow-writing-result-actions--hidden">
          ${isGuest ? guestActions : signedActions}
        </div>
      </section>
    `;
  };

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateValue(element, finalValue, options = {}) {
    const duration = options.duration || 900;
    const type = options.type || "number";
    const decimals = Number(options.decimals || 0);
    const start = performance.now();

    return new Promise((resolve) => {
      function step(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = easeOutCubic(progress);
        const current = finalValue * eased;
        element.textContent = type === "time"
          ? formatTime(Math.round(current))
          : formatNumber(current, decimals);
        if (progress < 1) {
          requestAnimationFrame(step);
          return;
        }
        element.textContent = type === "time"
          ? formatTime(finalValue)
          : formatNumber(finalValue, decimals);
        resolve();
      }
      requestAnimationFrame(step);
    });
  }

  ShadowWritingResult.revealCompletion = async function (root) {
    const panel = root?.querySelector?.(".shadow-completion-panel") || root;
    if (!panel) return;
    await sleep(200);
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    panel.classList.add("shadow-completion-panel--revealed");
    await sleep(260);

    const cards = Array.from(panel.querySelectorAll(".shadow-result-card"));
    for (const card of cards) {
      const label = card.querySelector(".shadow-result-label");
      const value = card.querySelector(".shadow-result-value");
      const unit = card.querySelector(".shadow-result-unit");
      const finalValue = Number(card.dataset.shadowValue || 0);
      const type = card.dataset.shadowType || "number";
      const decimals = Number(card.dataset.shadowDecimals || 0);
      card.classList.remove("shadow-result-card--pending");
      card.classList.add("shadow-result-card--active");
      label?.classList.add("shadow-result-label--visible");
      await sleep(240);
      if (value) await animateValue(value, finalValue, { type, decimals, duration: 900 });
      unit?.classList.add("shadow-result-unit--visible");
      card.classList.add("shadow-result-card--complete");
      await sleep(140);
    }

    panel.querySelector(".shadow-writing-result-actions")?.classList.remove("shadow-writing-result-actions--hidden");
  };

  ShadowWritingResult.render = function (result) {
    return ShadowWritingResult.renderStats(result);
  };

  ShadowWritingResult.formatTime = formatTime;
})();
