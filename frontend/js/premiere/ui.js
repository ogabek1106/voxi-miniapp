(function () {
  const state = { premiere: null, tick: null };

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMoney(value) {
    return `${Number(value || 0).toLocaleString("ru-RU")} UZS`;
  }

  function themeClass(premiere) {
    const raw = String(premiere?.premiere_theme || "violet_aurora")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_");
    return `premiere-theme-${raw || "violet_aurora"}`;
  }

  function countdownParts(endValue) {
    if (!endValue) return { text: "Limited release", urgent: false, expired: false };
    const diff = new Date(endValue).getTime() - Date.now();
    if (diff <= 0) return { text: "Premiere ended", urgent: true, expired: true };
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value) => String(value).padStart(2, "0");
    return {
      text: `${pad(days)}d : ${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`,
      urgent: totalSeconds <= 86400,
      expired: false,
    };
  }

  function slot() {
    const homeCards = document.querySelector("#screen-home .home-cards");
    if (!homeCards) return null;
    let node = document.getElementById("premiere-home-slot");
    if (!node) {
      node = document.createElement("div");
      node.id = "premiere-home-slot";
      node.className = "premiere-home-slot";
      homeCards.parentNode.insertBefore(node, homeCards);
    }
    return node;
  }

  function clearTick() {
    if (state.tick) clearInterval(state.tick);
    state.tick = null;
  }

  function refreshCountdown() {
    if (!state.premiere) return;
    const time = countdownParts(state.premiere.premiere_ends_at);
    if (time.expired) {
      render(null);
      closeDetails();
      return;
    }
    document.querySelectorAll("[data-premiere-countdown]").forEach((node) => {
      node.textContent = time.text;
    });
    document.querySelectorAll("[data-premiere-price]").forEach((node) => {
      node.textContent = formatMoney(state.premiere.premiere_price_uzs);
    });
    document.querySelectorAll(".premiere-home-card").forEach((node) => {
      node.classList.toggle("is-urgent", Boolean(time.urgent));
    });
  }

  function startCountdown() {
    clearTick();
    refreshCountdown();
    state.tick = setInterval(refreshCountdown, 1000);
  }

  function render(premiere) {
    state.premiere = premiere;
    const node = slot();
    clearTick();
    if (!node) return;
    if (!premiere?.premiere_is_live) {
      node.remove();
      return;
    }
    const action = premiere.has_access ? "Continue Premiere" : "Unlock Premiere";
    const time = countdownParts(premiere.premiere_ends_at);
    node.innerHTML = `
      <button class="premiere-home-card ${themeClass(premiere)} ${time.urgent ? "is-urgent" : ""}" type="button" id="premiere-home-card">
        <span>
          <span class="premiere-pill">${esc(premiere.premiere_label || "PREMIERE")}</span>
          <span class="premiere-title">${esc(premiere.title)}</span>
          <span class="premiere-subtitle">${esc(premiere.premiere_description || "New full IELTS simulation is now live")}</span>
          <span class="premiere-meta">
            <span class="premiere-countdown" data-premiere-countdown>${esc(time.text)}</span>
            <span> - </span>
            <span data-premiere-price>${esc(formatMoney(premiere.premiere_price_uzs))}</span>
          </span>
        </span>
        <span class="premiere-action">${action}</span>
      </button>
    `;
    document.getElementById("premiere-home-card")?.addEventListener("click", openDetails);
    startCountdown();
  }

  function ensureModal() {
    let modal = document.getElementById("premiere-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "premiere-modal";
    modal.className = "premiere-modal";
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeDetails();
    });
    return modal;
  }

  function openDetails() {
    const p = state.premiere;
    if (!p) return;
    const time = countdownParts(p.premiere_ends_at);
    const modal = ensureModal();
    modal.innerHTML = `
      <div class="premiere-sheet ${themeClass(p)}">
        <button class="premiere-close" type="button" data-close>&times;</button>
        <span class="premiere-pill">${esc(p.premiere_label || "PREMIERE")}</span>
        <h3>${esc(p.title)}</h3>
        <p class="premiere-subtitle">${esc(p.premiere_description || "New full IELTS simulation is now live")}</p>
        <div class="premiere-detail-list">
          <span><strong>Includes</strong><b>Listening, Reading, Writing, Speaking</b></span>
          <span><strong>Countdown</strong><b data-premiere-countdown>${esc(time.text)}</b></span>
          <span><strong>Access price</strong><b data-premiere-price>${esc(formatMoney(p.premiere_price_uzs))}</b></span>
        </div>
        <button class="premiere-primary" type="button" data-action>${p.has_access ? "Continue Premiere" : "Unlock Premiere"}</button>
        <button class="premiere-secondary" type="button" data-close>Back</button>
      </div>
    `;
    modal.classList.add("is-open");
    modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeDetails));
    modal.querySelector("[data-action]")?.addEventListener("click", () => {
      if (p.has_access) {
        closeDetails();
        continuePremiere();
      } else {
        unlockPremiere();
      }
    });
    refreshCountdown();
  }

  function closeDetails() {
    document.getElementById("premiere-modal")?.classList.remove("is-open");
  }

  async function unlockPremiere() {
    const p = state.premiere;
    const telegramId = typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
    if (!telegramId) {
      alert("Please log in before unlocking Premiere.");
      return;
    }
    try {
      const payment = await window.PremiereApi.createPaymentIntent(p.id, telegramId);
      if (payment?.bot_link) {
        window.location.assign(payment.bot_link);
      }
    } catch (error) {
      alert(error?.message || "Could not create Premiere payment.");
    }
  }

  function continuePremiere() {
    const p = state.premiere;
    if (!p) return;
    window.MockFlow?.activate?.(p.id, { premiere: true });
    if (typeof window.startListeningMock === "function") {
      window.startListeningMock(p.id, { fromFlow: true, premiere: true });
    }
  }

  async function interceptIfPremiere(packId) {
    if (!window.PremiereApi) return false;
    const telegramId = typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
    const data = await window.PremiereApi.active(telegramId);
    const active = data?.premiere;
    if (!active || Number(active.id) !== Number(packId)) return false;
    render(active);
    if (active.has_access) {
      state.premiere = active;
      continuePremiere();
      return true;
    }
    openDetails();
    return true;
  }

  window.PremiereUi = { render, openDetails, closeDetails, interceptIfPremiere };
})();
