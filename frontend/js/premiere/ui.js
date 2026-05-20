(function () {
  const STORAGE_KEY = "voxi:premiere:last-payment";
  const state = { premiere: null, tick: null, paymentPoll: null };

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

  function isAdminUser() {
    return Boolean(window.__isAdmin || window.WebsiteAuthState?.getUser?.()?.is_admin);
  }

  function actionLabel(premiere) {
    if (isAdminUser()) return "Unlock Premiere";
    return premiere?.has_access ? "Continue Premiere" : "Unlock Premiere";
  }

  async function resolveIdentity() {
    const rawId = typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
    let user = window.WebsiteAuthState?.getUser?.() || null;
    if (!user && window.WebsiteAuthState?.load) {
      user = await window.WebsiteAuthState.load();
    }
    const telegramId = Number(rawId || user?.telegram_id || 0);
    const userId = Number(user?.id || 0);
    return {
      telegram_id: Number.isFinite(telegramId) && telegramId > 0 ? telegramId : null,
      user_id: Number.isFinite(userId) && userId > 0 ? userId : null,
      email: user?.email || null,
      is_authenticated: Boolean(rawId || user),
      is_google_only: Boolean(user?.email && !rawId && !user?.telegram_id),
    };
  }

  async function resolveTelegramId() {
    return (await resolveIdentity()).telegram_id;
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

  function clearPaymentPoll() {
    if (state.paymentPoll) clearInterval(state.paymentPoll);
    state.paymentPoll = null;
  }

  function rememberPayment(payment, identity, packId) {
    if (!payment?.payment_token) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        token: payment.payment_token,
        pack_id: packId || payment.mock_pack_id || state.premiere?.id || null,
        telegram_id: identity?.telegram_id || null,
        user_id: identity?.user_id || null,
        email: identity?.email || null,
        created_at: Date.now(),
      }));
    } catch (error) {
      console.warn("Could not remember Premiere payment:", error);
    }
  }

  function readRememberedPayment() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function forgetPayment() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
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
    const action = actionLabel(premiere);
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
        <div data-premiere-return-state></div>
        <div class="premiere-inline-message" data-premiere-message></div>
        <button class="premiere-primary" type="button" data-action>${actionLabel(p)}</button>
        <button class="premiere-secondary" type="button" data-close>Back</button>
      </div>
    `;
    modal.classList.add("is-open");
    modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeDetails));
    modal.querySelector("[data-action]")?.addEventListener("click", () => {
      if (p.has_access && !isAdminUser()) {
        closeDetails();
        continuePremiere();
      } else {
        unlockPremiere();
      }
    });
    refreshCountdown();
    checkStoredPaymentStatus();
  }

  function closeDetails() {
    document.getElementById("premiere-modal")?.classList.remove("is-open");
  }

  function showMessage(text, type = "error") {
    const node = document.querySelector("#premiere-modal [data-premiere-message]");
    if (!node) return;
    node.textContent = text || "";
    node.className = `premiere-inline-message is-${type}`;
  }

  function paymentStatusKey(status) {
    const raw = String(status || "pending").toLowerCase();
    if (raw === "admin_confirmed" || raw === "confirmed" || raw === "approved") return "approved";
    if (raw === "admin_rejected" || raw === "rejected") return "rejected";
    if (raw === "expired") return "expired";
    return "pending";
  }

  function renderPaymentState(status, payment) {
    const node = document.querySelector("#premiere-modal [data-premiere-return-state]");
    if (!node) return;
    const key = paymentStatusKey(status);
    const token = payment?.payment_token ? `<span class="premiere-payment-token">${esc(payment.payment_token)}</span>` : "";
    const copy = {
      pending: {
        title: "Payment is being reviewed",
        text: "We'll unlock your Premiere access after confirmation.",
        action: "",
      },
      approved: {
        title: "Premiere unlocked 🎉",
        text: "Your access is ready. Start the mock now.",
        action: `<button class="premiere-primary" type="button" data-premiere-start>Start Premiere Mock</button>`,
      },
      rejected: {
        title: "Payment was not approved",
        text: payment?.reject_reason || "Please check your receipt or try again.",
        action: `<button class="premiere-primary" type="button" data-premiere-retry>Try Again</button>`,
      },
      expired: {
        title: "Premiere payment expired",
        text: "Create a new payment request to unlock this Premiere.",
        action: `<button class="premiere-primary" type="button" data-premiere-retry>Create New Payment</button>`,
      },
    }[key];
    node.innerHTML = `
      <div class="premiere-payment-state is-${key}">
        <strong>${esc(copy.title)}</strong>
        <p>${esc(copy.text)}</p>
        ${token}
        ${copy.action}
      </div>
    `;
    node.querySelector("[data-premiere-start]")?.addEventListener("click", () => {
      forgetPayment();
      closeDetails();
      continuePremiere();
    });
    node.querySelector("[data-premiere-retry]")?.addEventListener("click", () => {
      forgetPayment();
      unlockPremiere();
    });
  }

  async function refreshActivePremiere() {
    try {
      const identity = await resolveIdentity();
      const data = await window.PremiereApi.active(identity);
      if (data?.premiere) {
        render(data.premiere);
      }
      return data?.premiere || null;
    } catch (error) {
      console.warn("Could not refresh Premiere:", error);
      return null;
    }
  }

  async function checkStoredPaymentStatus() {
    const remembered = readRememberedPayment();
    if (!remembered?.token || !window.PremiereApi?.paymentIntent) return null;
    const identity = await resolveIdentity();
    const lookupIdentity = {
      telegram_id: identity.telegram_id || remembered.telegram_id || null,
      user_id: identity.user_id || remembered.user_id || null,
      email: identity.email || remembered.email || null,
    };
    if (!lookupIdentity.telegram_id && !lookupIdentity.user_id && !lookupIdentity.email) return null;
    try {
      const result = await window.PremiereApi.paymentIntent(remembered.token, lookupIdentity);
      const payment = result?.payment || result;
      if (result?.premiere) {
        state.premiere = result.premiere;
      }
      const status = paymentStatusKey(payment?.status);
      if (document.getElementById("premiere-modal")?.classList.contains("is-open")) {
        renderPaymentState(status, payment);
      }
      if (status === "approved") {
        await refreshActivePremiere();
        if (document.getElementById("premiere-modal")?.classList.contains("is-open")) {
          renderPaymentState(status, payment);
        }
        forgetPayment();
      } else if (status === "rejected" || status === "expired") {
        clearPaymentPoll();
      } else {
        startPaymentPolling();
      }
      return payment;
    } catch (error) {
      const detail = error?.data?.detail || error?.message || "";
      if (String(detail).includes("not_found") || String(detail).includes("identity_mismatch")) {
        forgetPayment();
      }
      return null;
    }
  }

  function startPaymentPolling() {
    if (state.paymentPoll) return;
    state.paymentPoll = setInterval(() => {
      if (document.hidden) return;
      checkStoredPaymentStatus();
    }, 10000);
  }

  async function unlockPremiere() {
    const p = state.premiere;
    const identity = await resolveIdentity();
    if (!identity.is_authenticated) {
      showMessage("Please log in before unlocking Premiere.");
      return;
    }
    try {
      const payment = await window.PremiereApi.createPaymentIntent(p.id, identity);
      rememberPayment(payment, identity, p.id);
      if (identity.is_google_only) {
        showMessage("You logged in with Google. The Telegram bot may ask you to confirm your email to continue payment.", "info");
      } else {
        showMessage("Telegram payment opened. After sending your receipt, return here for the Premiere status.", "info");
      }
      renderPaymentState("pending", payment);
      if (payment?.bot_link) {
        window.open(payment.bot_link, "_blank", "noopener");
      }
      startPaymentPolling();
    } catch (error) {
      const detail = error?.data?.detail || error?.message || "";
      if (detail === "premiere_already_unlocked" || String(detail).includes("premiere_already_unlocked")) {
        showMessage("You already unlocked this Premiere. You can continue it from this card.", "success");
        await refreshActivePremiere();
        return;
      }
      if (detail === "premiere_login_required" || String(detail).includes("premiere_login_required")) {
        showMessage("Please log in before unlocking Premiere.");
        return;
      }
      showMessage("Could not create Premiere payment. Please try again.");
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
    const identity = await resolveIdentity();
    const data = await window.PremiereApi.active(identity);
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

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkStoredPaymentStatus();
  });
  window.addEventListener("focus", () => checkStoredPaymentStatus());

  window.PremiereUi = { render, openDetails, closeDetails, interceptIfPremiere, checkStoredPaymentStatus };
})();
