(function () {
  const STORAGE_KEY = "voxi:premiere:last-payment";
  const DEFAULT_DESCRIPTION = "Test your skills in our most advanced IELTS simulation";
  const state = {
    premiere: null,
    tick: null,
    paymentPoll: null,
    currentPayment: null,
    paymentResolving: false,
    lastIdentityKey: null,
    appliedPromo: "",
    promoQuote: null,
  };

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

  function premiereDescription(premiere) {
    const saved = String(premiere?.premiere_description || "").trim();
    return saved && saved !== "New full IELTS simulation is now live" ? saved : DEFAULT_DESCRIPTION;
  }

  function accessPrice() {
    return Number(state.promoQuote?.final_amount ?? state.premiere?.premiere_price_uzs ?? 0);
  }

  function formatAvailableUntil(endValue) {
    if (!endValue) return { text: "Available for a limited time", urgent: false, expired: false };
    const date = new Date(endValue);
    const diff = date.getTime() - Date.now();
    if (Number.isNaN(date.getTime())) return { text: "Available for a limited time", urgent: false, expired: false };
    if (diff <= 0) return { text: "Premiere ended", urgent: true, expired: true };
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-GB", { month: "short" });
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return {
      text: `Available until ${day} ${month}, ${hour}:${minute}`,
      urgent: diff <= 86400000,
      expired: false,
    };
  }

  function liveCountdownParts(endValue) {
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

  function themeClass(premiere) {
    const raw = String(premiere?.premiere_theme || "violet_aurora")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_");
    return `premiere-theme-${raw || "violet_aurora"}`;
  }

  function isAdminUser() {
    return Boolean(window.__isAdmin || window.WebsiteAuthState?.getUser?.()?.is_admin);
  }

  function currentPaymentForPremiere(premiere) {
    const payment = state.currentPayment;
    if (isAdminUser() && !payment?.__current_session) return null;
    if (!payment || !premiere) return null;
    return Number(payment.mock_pack_id || 0) === Number(premiere.id || 0) ? payment : null;
  }

  function keepCurrentSessionPayment(payment) {
    if (!payment) return payment;
    const previous = state.currentPayment;
    const sameToken = previous?.payment_token && previous.payment_token === payment.payment_token;
    if (isAdminUser() && (previous?.__current_session || sameToken)) {
      return { ...payment, __current_session: true };
    }
    return payment;
  }

  function paymentFlowKey(payment) {
    const status = paymentStatusKey(payment?.status);
    if (status === "pending") {
      return payment?.receipt_submitted ? "under_review" : "continue_payment";
    }
    return status;
  }

  function actionLabel(premiere) {
    if (isAdminUser()) return "Unlock Premiere";
    const payment = currentPaymentForPremiere(premiere);
    const flow = paymentFlowKey(payment);
    if (flow === "continue_payment") return "Continue Payment";
    if (flow === "under_review") return "Waiting for confirmation";
    if (flow === "approved") return "Start Premiere Mock";
    if (flow === "rejected") return "Try Again";
    if (flow === "expired") return "Create New Payment";
    return premiere?.has_access ? "Continue Premiere" : "Unlock Premiere";
  }

  function starValue(seed, min, max) {
    const x = Math.sin(seed * 91.713) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  }

  function renderStars(layer, count, options = {}) {
    const stars = [];
    const shapes = options.shapes || ["point"];
    for (let i = 0; i < count; i += 1) {
      const seed = (i + 1) * (options.seed || 1);
      const x = starValue(seed, options.minX ?? 6, options.maxX ?? 98);
      const y = starValue(seed + 3.7, options.minY ?? 6, options.maxY ?? 94);
      const size = starValue(seed + 8.1, options.minSize ?? 1, options.maxSize ?? 2);
      const opacity = starValue(seed + 12.4, options.minOpacity ?? 0.2, options.maxOpacity ?? 0.7);
      const delay = starValue(seed + 15.8, -1 * (options.maxDelay ?? 7), 0);
      const duration = starValue(seed + 18.2, options.minDuration ?? 5, options.maxDuration ?? 10);
      const blur = starValue(seed + 21.6, options.minBlur ?? 0, options.maxBlur ?? 0.2);
      const glow = starValue(seed + 24.9, options.minGlow ?? 3, options.maxGlow ?? 9);
      const ray = starValue(seed + 28.3, options.minRay ?? 5, options.maxRay ?? 13);
      const rayOpacity = starValue(seed + 31.7, options.minRayOpacity ?? 0.28, options.maxRayOpacity ?? 0.72);
      const shape = shapes[Math.floor(starValue(seed + 35.1, 0, shapes.length))] || shapes[0];
      stars.push(
        `<span class="premiere-star premiere-star--${shape}" style="--x:${x.toFixed(2)}%;--y:${y.toFixed(2)}%;--size:${size.toFixed(2)}px;--opacity:${opacity.toFixed(2)};--delay:${delay.toFixed(2)}s;--duration:${duration.toFixed(2)}s;--blur:${blur.toFixed(2)}px;--glow:${glow.toFixed(2)}px;--ray:${ray.toFixed(2)}px;--ray-opacity:${rayOpacity.toFixed(2)};"><span class="premiere-star-core"></span></span>`
      );
    }
    return `<span class="premiere-star-layer premiere-star-layer--${layer}" aria-hidden="true">${stars.join("")}</span>`;
  }

  function renderStarfield() {
    return `
      <span class="premiere-starfield" aria-hidden="true">
        ${renderStars("micro", 96, { seed: 1.7, shapes: ["point", "point", "diamond"], minX: 0, maxX: 98, minSize: 0.8, maxSize: 1.25, minOpacity: 0.22, maxOpacity: 0.52, minDuration: 2.4, maxDuration: 5.2, maxDelay: 5.5, minBlur: 0, maxBlur: 0.08, minGlow: 2, maxGlow: 6, minRay: 3, maxRay: 6, minRayOpacity: 0.12, maxRayOpacity: 0.28 })}
        ${renderStars("medium", 58, { seed: 3.3, shapes: ["point", "cross", "glint", "diamond"], minX: 4, maxX: 97, minSize: 1.4, maxSize: 2.35, minOpacity: 0.46, maxOpacity: 0.82, minDuration: 2.1, maxDuration: 5.5, maxDelay: 6, minBlur: 0, maxBlur: 0.06, minGlow: 5, maxGlow: 12, minRay: 7, maxRay: 16, minRayOpacity: 0.34, maxRayOpacity: 0.74 })}
        ${renderStars("bright", 24, { seed: 5.9, shapes: ["cross", "glint", "diamond", "starburst"], minX: 12, maxX: 95, minSize: 2.5, maxSize: 3.8, minOpacity: 0.72, maxOpacity: 1, minDuration: 1.8, maxDuration: 4.8, maxDelay: 7, minBlur: 0, maxBlur: 0.03, minGlow: 12, maxGlow: 24, minRay: 13, maxRay: 26, minRayOpacity: 0.62, maxRayOpacity: 1 })}
        ${renderStars("glow", 14, { seed: 8.4, shapes: ["glow"], minX: 8, maxX: 98, minY: 8, maxY: 92, minSize: 10, maxSize: 20, minOpacity: 0.07, maxOpacity: 0.18, minDuration: 3.8, maxDuration: 8, maxDelay: 8, minBlur: 5, maxBlur: 10, minGlow: 18, maxGlow: 34, minRay: 18, maxRay: 34, minRayOpacity: 0.08, maxRayOpacity: 0.18 })}
      </span>
    `;
  }

  async function resolveIdentity() {
    const rawValue = typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
    const rawText = String(rawValue ?? "").trim().toLowerCase();
    const rawId = rawText && rawText !== "null" && rawText !== "undefined" ? rawValue : null;
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

  function identityKey(identity) {
    if (!identity) return "guest";
    if (identity.telegram_id) return `tg:${identity.telegram_id}`;
    if (identity.user_id) return `u:${identity.user_id}`;
    if (identity.email) return `email:${String(identity.email).trim().toLowerCase()}`;
    return "guest";
  }

  function rememberedMatchesIdentity(remembered, identity) {
    if (!remembered || !identity || !identity.is_authenticated) return false;
    if (identity.telegram_id && remembered.telegram_id && Number(identity.telegram_id) === Number(remembered.telegram_id)) return true;
    if (identity.user_id && remembered.user_id && Number(identity.user_id) === Number(remembered.user_id)) return true;
    const rememberedEmail = remembered.email ? String(remembered.email).trim().toLowerCase() : "";
    const currentEmail = identity.email ? String(identity.email).trim().toLowerCase() : "";
    return Boolean(currentEmail && rememberedEmail && currentEmail === rememberedEmail);
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
    state.currentPayment = null;
    updateActionControls();
  }

  function updateActionControls() {
    const p = state.premiere;
    const label = state.paymentResolving ? "Checking..." : actionLabel(p);
    const payment = currentPaymentForPremiere(p);
    const flow = paymentFlowKey(payment);
    const hasPaymentState = ["continue_payment", "under_review", "approved", "rejected", "expired"].includes(flow);
    document.querySelectorAll(".premiere-action").forEach((node) => {
      node.textContent = label;
      node.classList.toggle("is-waiting", flow === "under_review");
    });
    const action = document.querySelector("#premiere-modal [data-action]");
    if (action) {
      action.textContent = label;
      action.hidden = state.paymentResolving || hasPaymentState;
      action.disabled = state.paymentResolving || hasPaymentState || flow === "under_review";
      action.classList.toggle("is-disabled", state.paymentResolving || flow === "under_review");
    }
  }

  function setPaymentResolving(value) {
    state.paymentResolving = Boolean(value);
    updateActionControls();
  }

  function refreshCountdown() {
    if (!state.premiere) return;
    const time = liveCountdownParts(state.premiere.premiere_ends_at);
    if (time.expired) {
      render(null);
      closeDetails();
      return;
    }
    document.querySelectorAll("[data-premiere-home-countdown]").forEach((node) => {
      node.textContent = time.text;
    });
    document.querySelectorAll("[data-premiere-availability]").forEach((node) => {
      node.textContent = formatAvailableUntil(state.premiere.premiere_ends_at).text;
    });
    document.querySelectorAll("[data-premiere-price]").forEach((node) => {
      node.textContent = formatMoney(accessPrice());
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

  function render(premiere, payment = null) {
    state.premiere = premiere;
    if (payment) state.currentPayment = payment;
    state.appliedPromo = "";
    state.promoQuote = null;
    const node = slot();
    clearTick();
    if (!node) return;
    if (!premiere?.premiere_is_live) {
      node.remove();
      return;
    }
    const action = actionLabel(premiere);
    const time = liveCountdownParts(premiere.premiere_ends_at);
    node.innerHTML = `
      <button class="premiere-home-card ${themeClass(premiere)} ${time.urgent ? "is-urgent" : ""}" type="button" id="premiere-home-card">
        <span class="premiere-content">
          <span class="premiere-pill">${esc(premiere.premiere_label || "PREMIERE")}</span>
          <span class="premiere-title">${esc(premiere.title)}</span>
          <span class="premiere-subtitle">${esc(premiereDescription(premiere))}</span>
          <span class="premiere-meta">
            <span class="premiere-countdown" data-premiere-home-countdown>${esc(time.text)}</span>
            <span> - </span>
            <span data-premiere-price>${esc(formatMoney(accessPrice()))}</span>
          </span>
        </span>
        ${renderStarfield()}
        <span class="premiere-action">${action}</span>
      </button>
    `;
    document.getElementById("premiere-home-card")?.addEventListener("click", handleHomeCardClick);
    startCountdown();
    updateActionControls();
  }

  function handleHomeCardClick() {
    const p = state.premiere;
    if (!p) return;
    const payment = currentPaymentForPremiere(p);
    const flow = paymentFlowKey(payment);
    if (!isAdminUser() && (p.has_access || flow === "approved")) {
      continuePremiere();
      return;
    }
    openDetails();
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
    const time = formatAvailableUntil(p.premiere_ends_at);
    const modal = ensureModal();
    modal.innerHTML = `
      <div class="premiere-sheet ${themeClass(p)}">
        <button class="premiere-close" type="button" data-close>&times;</button>
        <span class="premiere-pill">${esc(p.premiere_label || "PREMIERE")}</span>
        <h3>${esc(p.title)}</h3>
        <p class="premiere-subtitle">${esc(premiereDescription(p))}</p>
        <div class="premiere-detail-list">
          <span><strong>Includes</strong><b>Listening, Reading, Writing, Speaking</b></span>
          <span><strong>Availability</strong><b data-premiere-availability>${esc(time.text)}</b></span>
          <span><strong>Access price</strong><b data-premiere-price>${esc(formatMoney(accessPrice()))}</b></span>
        </div>
        <div class="premiere-promo">
          <button class="premiere-promo-toggle" type="button" data-premiere-promo-toggle>Have a promo code?</button>
          <div class="premiere-promo-line" data-premiere-promo-line>
            <input class="premiere-promo-input" type="text" placeholder="Promo code" data-premiere-promo-code>
            <button class="premiere-promo-apply" type="button" data-premiere-promo-apply>Apply</button>
          </div>
          <div class="premiere-promo-message" data-premiere-promo-message></div>
        </div>
        <div data-premiere-return-state></div>
        <div class="premiere-inline-message" data-premiere-message></div>
        <button class="premiere-primary" type="button" data-action>${actionLabel(p)}</button>
        <button class="premiere-secondary" type="button" data-close>Back</button>
      </div>
    `;
    modal.classList.add("is-open");
    modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeDetails));
    bindPromoControls(modal);
    modal.querySelector("[data-action]")?.addEventListener("click", () => {
      const payment = currentPaymentForPremiere(p);
      const flow = paymentFlowKey(payment);
      if (flow === "under_review") {
        renderPaymentState("pending", payment);
        return;
      }
      if (flow === "continue_payment") {
        continuePayment(payment);
        return;
      }
      if ((flow === "approved" || p.has_access) && !isAdminUser()) {
        closeDetails();
        continuePremiere();
      } else if (flow === "rejected" || flow === "expired") {
        forgetPayment();
        unlockPremiere();
      } else {
        unlockPremiere();
      }
    });
    const existingPayment = currentPaymentForPremiere(p);
    if (existingPayment) {
      renderPaymentState(paymentFlowKey(existingPayment), existingPayment);
    } else if (readRememberedPayment()?.token) {
      renderPaymentLoading();
    }
    refreshCountdown();
    checkStoredPaymentStatus({ showLoading: true });
    updateActionControls();
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

  function showPromoMessage(text, type = "error") {
    const node = document.querySelector("#premiere-modal [data-premiere-promo-message]");
    if (!node) return;
    node.textContent = text || "";
    node.className = `premiere-promo-message is-${type}`;
  }

  function renderPromoQuote() {
    refreshCountdown();
    if (!state.promoQuote?.promo_code) return;
    const discount = Number(state.promoQuote.discount_amount || 0);
    const percent = Number(state.promoQuote.discount_percent || 0);
    showPromoMessage(`Promo applied: ${percent}% off (-${formatMoney(discount)})`, "success");
  }

  function bindPromoControls(root) {
    const toggle = root.querySelector("[data-premiere-promo-toggle]");
    const line = root.querySelector("[data-premiere-promo-line]");
    const input = root.querySelector("[data-premiere-promo-code]");
    const apply = root.querySelector("[data-premiere-promo-apply]");
    toggle?.addEventListener("click", (event) => {
      event.stopPropagation();
      line?.classList.add("is-visible");
      toggle.hidden = true;
      input?.focus();
    });
    apply?.addEventListener("click", async (event) => {
      event.stopPropagation();
      const code = String(input?.value || "").trim().toUpperCase();
      if (!code) {
        state.appliedPromo = "";
        state.promoQuote = null;
        refreshCountdown();
        showPromoMessage("Enter a Premiere promo code.");
        return;
      }
      apply.disabled = true;
      showPromoMessage("Checking promo...", "info");
      try {
        const data = await window.PremiereApi.quote(state.premiere.id, code);
        state.appliedPromo = data?.quote?.promo_code || code;
        state.promoQuote = data?.quote || null;
        renderPromoQuote();
      } catch (error) {
        state.appliedPromo = "";
        state.promoQuote = null;
        refreshCountdown();
        showPromoMessage("Premiere promo code could not be applied.");
      } finally {
        apply.disabled = false;
      }
    });
  }

  function renderPaymentLoading() {
    const node = document.querySelector("#premiere-modal [data-premiere-return-state]");
    if (!node) return;
    node.innerHTML = `
      <div class="premiere-payment-state is-loading">
        <strong>Checking Premiere status</strong>
        <p>Please wait a moment while we restore the correct payment state.</p>
      </div>
    `;
    setPaymentResolving(true);
  }

  function clearPaymentReturnState() {
    const node = document.querySelector("#premiere-modal [data-premiere-return-state]");
    if (node) node.innerHTML = "";
  }

  function paymentStatusKey(status) {
    if (status == null || status === "") return "none";
    const raw = String(status || "pending").toLowerCase();
    if (raw === "admin_confirmed" || raw === "confirmed" || raw === "approved") return "approved";
    if (raw === "admin_rejected" || raw === "rejected") return "rejected";
    if (raw === "expired") return "expired";
    return "pending";
  }

  function continuePayment(payment) {
    const p = state.premiere;
    const rememberedIdentity = {
      telegram_id: payment?.telegram_id || null,
      user_id: payment?.user_id || null,
      email: payment?.email || null,
    };
    rememberPayment(payment, rememberedIdentity, p?.id || payment?.mock_pack_id);
    renderPaymentState("continue_payment", payment);
    updateActionControls();
    if (payment?.bot_link) {
      window.open(payment.bot_link, "_blank", "noopener");
    }
  }

  function renderPaymentState(status, payment) {
    const node = document.querySelector("#premiere-modal [data-premiere-return-state]");
    if (!node) return;
    if (payment) {
      payment = keepCurrentSessionPayment(payment);
      state.currentPayment = payment;
      updateActionControls();
    }
    const flowKey = status === "continue_payment" ? "continue_payment" : paymentFlowKey({ ...payment, status });
    const key = flowKey === "under_review" ? "pending" : flowKey;
    const token = payment?.payment_token ? `<span class="premiere-payment-token">${esc(payment.payment_token)}</span>` : "";
    const copy = {
      continue_payment: {
        title: "Continue your Premiere payment",
        text: "Your payment request is ready. Open Telegram and send the receipt for this payment ID.",
        action: `<button class="premiere-primary" type="button" data-premiere-continue-payment>Continue Payment</button>`,
      },
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
    node.querySelector("[data-premiere-continue-payment]")?.addEventListener("click", () => continuePayment(payment));
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
        render(data.premiere, data?.active_payment || state.currentPayment);
      }
      return data?.premiere || null;
    } catch (error) {
      console.warn("Could not refresh Premiere:", error);
      return null;
    }
  }

  async function checkStoredPaymentStatus(options = {}) {
    const remembered = readRememberedPayment();
    if (!remembered?.token || !window.PremiereApi?.paymentIntent) {
      setPaymentResolving(false);
      if (!state.currentPayment) {
        clearPaymentReturnState();
      }
      return null;
    }
    const identity = await resolveIdentity();
    if (!rememberedMatchesIdentity(remembered, identity)) {
      state.currentPayment = null;
      setPaymentResolving(false);
      clearPaymentReturnState();
      updateActionControls();
      return null;
    }
    if (options.showLoading && document.getElementById("premiere-modal")?.classList.contains("is-open")) {
      renderPaymentLoading();
    }
    if (state.premiere && Number(remembered.pack_id || 0) === Number(state.premiere.id || 0)) {
      state.currentPayment = {
        mock_pack_id: remembered.pack_id,
        payment_token: remembered.token,
        status: "pending",
      };
      updateActionControls();
    }
    const lookupIdentity = {
      telegram_id: identity.telegram_id || null,
      user_id: identity.user_id || null,
      email: identity.email || null,
    };
    if (!lookupIdentity.telegram_id && !lookupIdentity.user_id && !lookupIdentity.email) {
      setPaymentResolving(false);
      clearPaymentReturnState();
      return null;
    }
    try {
      const result = await window.PremiereApi.paymentIntent(remembered.token, lookupIdentity);
      const payment = keepCurrentSessionPayment(result?.payment || result);
      if (result?.premiere) {
        state.premiere = result.premiere;
      }
      const status = paymentFlowKey(payment);
      if (document.getElementById("premiere-modal")?.classList.contains("is-open")) {
        renderPaymentState(status === "continue_payment" ? "continue_payment" : payment?.status, payment);
      }
      if (status === "approved") {
        state.currentPayment = payment;
        await refreshActivePremiere();
        if (document.getElementById("premiere-modal")?.classList.contains("is-open")) {
          renderPaymentState(status, payment);
        }
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      } else if (status === "rejected" || status === "expired") {
        state.currentPayment = payment;
        updateActionControls();
        clearPaymentPoll();
      } else if (status === "continue_payment") {
        state.currentPayment = payment;
        updateActionControls();
        clearPaymentPoll();
      } else {
        state.currentPayment = payment;
        updateActionControls();
        startPaymentPolling();
      }
      setPaymentResolving(false);
      return payment;
    } catch (error) {
      const detail = error?.data?.detail || error?.message || "";
      if (String(detail).includes("not_found") || String(detail).includes("identity_mismatch")) {
        forgetPayment();
      }
      setPaymentResolving(false);
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
      const payment = await window.PremiereApi.createPaymentIntent(p.id, identity, state.appliedPromo);
      state.currentPayment = { ...payment, __current_session: true };
      rememberPayment(payment, identity, p.id);
      const flow = paymentFlowKey(state.currentPayment);
      if (flow === "under_review") {
        showMessage("Your receipt is already waiting for confirmation.", "info");
        renderPaymentState("pending", state.currentPayment);
        updateActionControls();
        startPaymentPolling();
        return;
      }
      showMessage(
        identity.is_google_only
          ? "You logged in with Google. The Telegram bot may ask you to confirm your email to continue payment."
          : "Telegram payment opened. After sending your receipt, return here for the Premiere status.",
        "info",
      );
      renderPaymentState("continue_payment", state.currentPayment);
      updateActionControls();
      if (payment?.bot_link) {
        window.open(payment.bot_link, "_blank", "noopener");
      }
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
    render(active, data?.active_payment || null);
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

  window.WebsiteAuthState?.subscribe?.((user) => {
    const key = identityKey({
      telegram_id: user?.telegram_id || null,
      user_id: user?.id || null,
      email: user?.email || null,
      is_authenticated: Boolean(user),
    });
    if (state.lastIdentityKey === null) {
      state.lastIdentityKey = key;
      return;
    }
    if (state.lastIdentityKey === key) return;
    state.lastIdentityKey = key;
    state.currentPayment = null;
    setPaymentResolving(false);
    if (document.getElementById("premiere-modal")?.classList.contains("is-open")) {
      closeDetails();
    }
    if (state.premiere) {
      render(state.premiere, null);
    }
    window.PremiereLoader?.load?.();
  });

  window.PremiereUi = { render, openDetails, closeDetails, interceptIfPremiere, checkStoredPaymentStatus };
})();
