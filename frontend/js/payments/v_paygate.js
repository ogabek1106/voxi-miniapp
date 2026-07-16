window.VPayGate = window.VPayGate || {};

(function () {
  const DEFAULT_TOPUP_UZS = 50000;
  const STORAGE_KEY = "voxi_vpaygate_order";
  const POLL_LIMIT = 8;
  let state = {
    product: null,
    provider: "click",
    status: "preparing_order",
    checkout: null,
    message: "Preparing checkout...",
    polling: false,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatUzs(amount) {
    return window.UzsBalance?.formatUzs?.(amount) || `${Number(amount || 0).toLocaleString("en-US")} UZS`;
  }

  function normalizeAmount(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TOPUP_UZS;
    return Math.max(5000, Math.floor(parsed / 5000) * 5000);
  }

  function coinsForTopup(amountUzs) {
    // Temporary bridge: payment providers still fulfill the existing V-Coin engine.
    // Change this adapter when the real stored UZS wallet/order source is implemented.
    const rate = Number(window.UzsBalance?.convertVCoinsToUzs?.(1) || 5000);
    return Math.max(1, Math.floor(normalizeAmount(amountUzs) / rate));
  }

  function topupAmountForCoins(coins) {
    return window.UzsBalance?.convertVCoinsToUzs?.(coins) || (Number(coins || 0) * 5000);
  }

  function defaultProduct(overrides = {}) {
    const amountUzs = normalizeAmount(overrides.amount_uzs ?? overrides.amountUzs ?? DEFAULT_TOPUP_UZS);
    const coins = coinsForTopup(amountUzs);
    return {
      type: "wallet_topup",
      title: "Wallet top-up",
      description: "Add balance for paid platform features.",
      amount_uzs: topupAmountForCoins(coins),
      coins,
      promo_code: overrides.promo_code || null,
      origin: overrides.origin || "wallet",
      return_page: overrides.return_page || "",
    };
  }

  function currentTelegramId() {
    const direct = typeof window.getTelegramId === "function" ? Number(window.getTelegramId() || 0) : 0;
    if (direct > 0) return direct;
    const websiteId = Number(window.WebsiteAuthState?.getUser?.()?.telegram_id || 0);
    return websiteId > 0 ? websiteId : null;
  }

  async function resolveTelegramId() {
    let id = currentTelegramId();
    if (id || !window.AppViewMode?.isWebsite?.() || !window.WebsiteAuthState?.load) return id;
    try {
      const user = await window.WebsiteAuthState.load();
      id = Number(user?.telegram_id || 0);
      return id > 0 ? id : null;
    } catch (_) {
      return null;
    }
  }

  function host() {
    let node = document.getElementById("screen-v-paygate");
    if (node) return node;
    node = document.createElement("main");
    node.id = "screen-v-paygate";
    node.className = "vpaygate-screen";
    const app = document.querySelector(".app") || document.body;
    app.appendChild(node);
    return node;
  }

  function hideNormalScreens() {
    window.hideAllScreens?.();
    document.body.classList.add("vpaygate-active");
    document.documentElement.classList.add("vpaygate-active");
    const node = host();
    node.style.display = "block";
    return node;
  }

  function leavePage() {
    clearPoll();
    document.body.classList.remove("vpaygate-active");
    document.documentElement.classList.remove("vpaygate-active");
    const node = document.getElementById("screen-v-paygate");
    if (node) node.style.display = "none";
    const returnPage = state.product?.return_page || "";
    if (returnPage && window.navigateToFeature) {
      window.navigateToFeature(returnPage);
      return;
    }
    window.navigateToHome?.();
  }

  function statusClass() {
    if (["payment_successful", "order_already_paid", "purchase_already_fulfilled"].includes(state.status)) return "is-success";
    if (["payment_failed", "payment_cancelled", "order_expired", "order_invalid"].includes(state.status)) return "is-error";
    return "";
  }

  function statusText() {
    const map = {
      preparing_order: "Preparing checkout...",
      ready_for_payment: "Choose a payment method to continue.",
      payment_provider_selected: "Payment method selected. Continue when ready.",
      redirecting_to_provider: "Redirecting to the payment provider...",
      payment_processing: "Payment is processing.",
      payment_confirmation_pending: "Payment confirmation is pending. You can refresh this page safely.",
      payment_successful: "Payment successful.",
      payment_failed: "Payment failed. You can try again.",
      payment_cancelled: "Payment was cancelled.",
      order_expired: "This order expired. Start a new checkout when you are ready.",
      order_invalid: "This checkout is invalid or unavailable.",
      order_already_paid: "This order is already paid.",
      purchase_already_fulfilled: "Purchase already fulfilled.",
    };
    return state.message || map[state.status] || "Checkout is ready.";
  }

  function render() {
    const product = state.product || defaultProduct();
    const selected = state.provider;
    const disabled = ["redirecting_to_provider", "payment_processing"].includes(state.status);
    const canPay = Boolean(selected) && !disabled && !["payment_successful", "purchase_already_fulfilled", "order_expired", "order_invalid"].includes(state.status);
    const node = hideNormalScreens();
    node.innerHTML = `
      <div class="vpaygate-shell">
        <div class="vpaygate-top">
          <div class="vpaygate-brand">
            <div class="vpaygate-kicker">V-PayGate</div>
            <h1 class="vpaygate-title">Payment checkout</h1>
          </div>
          <button type="button" class="vpaygate-cancel" id="vpaygate-cancel">Cancel</button>
        </div>

        <section class="vpaygate-panel" aria-label="V-PayGate checkout">
          <div class="vpaygate-product">
            <div>
              <p class="vpaygate-section-title">You are buying</p>
              <h2>${escapeHtml(product.title)}</h2>
              <p>${escapeHtml(product.description)}</p>
            </div>
            <div class="vpaygate-price">${escapeHtml(formatUzs(product.amount_uzs))}</div>
          </div>

          <div class="vpaygate-details">
            <div class="vpaygate-row"><span>Order type</span><strong>${escapeHtml(product.title)}</strong></div>
            <div class="vpaygate-row"><span>Amount</span><strong>${escapeHtml(formatUzs(product.amount_uzs))}</strong></div>
            <div class="vpaygate-row"><span>Currency</span><strong>UZS</strong></div>
            ${state.checkout?.order_ref ? `<div class="vpaygate-row"><span>Order</span><strong>${escapeHtml(state.checkout.order_ref)}</strong></div>` : ""}
          </div>

          <div>
            <p class="vpaygate-section-title">Payment method</p>
            <div class="vpaygate-methods">
              <button type="button" class="vpaygate-method ${selected === "click" ? "is-selected" : ""}" data-vpay-provider="click" ${disabled ? "disabled" : ""}>
                <strong>Click<span>Pay through Click</span></strong>
                <span aria-hidden="true">→</span>
              </button>
              <button type="button" class="vpaygate-method ${selected === "payme" ? "is-selected" : ""}" data-vpay-provider="payme" ${disabled ? "disabled" : ""}>
                <strong>Payme<span>Pay through Payme</span></strong>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div class="vpaygate-status ${statusClass()}" role="status">${escapeHtml(statusText())}</div>

          <div class="vpaygate-actions">
            <button type="button" class="vpaygate-pay" id="vpaygate-pay" ${canPay ? "" : "disabled"}>${state.checkout?.checkout_url ? "Open payment" : "Continue to payment"}</button>
            <button type="button" class="vpaygate-secondary" id="vpaygate-refresh">Refresh status</button>
          </div>
        </section>
      </div>
    `;
    bind();
  }

  function bind() {
    document.getElementById("vpaygate-cancel")?.addEventListener("click", leavePage);
    document.getElementById("vpaygate-refresh")?.addEventListener("click", () => refreshStatus({ userInitiated: true }));
    document.getElementById("vpaygate-pay")?.addEventListener("click", continuePayment);
    document.querySelectorAll("[data-vpay-provider]").forEach((button) => {
      button.addEventListener("click", () => {
        state.provider = button.getAttribute("data-vpay-provider") || "click";
        state.checkout = restoreStoredOrder(state.product, state.provider);
        state.status = "payment_provider_selected";
        state.message = `${state.provider === "payme" ? "Payme" : "Click"} selected. Continue when ready.`;
        render();
      });
    });
  }

  function storeOrder() {
    try {
      if (!state.checkout?.order_ref) return;
      window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify({
        provider: state.provider,
        product: state.product,
        checkout: state.checkout,
        saved_at: new Date().toISOString(),
      }));
    } catch (_) {}
  }

  function restoreStoredOrder(product = state.product, provider = state.provider) {
    try {
      const stored = JSON.parse(window.sessionStorage?.getItem(STORAGE_KEY) || "null");
      if (!stored?.checkout?.order_ref) return null;
      if (stored.provider !== provider) return null;
      if (stored.product?.type !== product?.type) return null;
      if (Number(stored.product?.amount_uzs || 0) !== Number(product?.amount_uzs || 0)) return null;
      return stored.checkout;
    } catch (_) {
      return null;
    }
  }

  function clearStoredOrder() {
    try {
      window.sessionStorage?.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  async function createCheckout(provider) {
    const telegramId = await resolveTelegramId();
    if (!telegramId) throw new Error("Please log in with Telegram before payment.");
    const body = {
      telegram_id: Number(telegramId),
      coins: Number(state.product?.coins || coinsForTopup(state.product?.amount_uzs)),
      promo_code: state.product?.promo_code || null,
    };
    if (provider === "payme") {
      return await window.apiPost("/payments/payme/vcoins/checkout", body);
    }
    return await window.apiPost("/payments/click/vcoins/checkout", body);
  }

  async function fetchOrderStatus(orderRef) {
    const telegramId = await resolveTelegramId();
    if (!telegramId || !orderRef) return null;
    return await window.apiGet(`/payments/orders/${encodeURIComponent(orderRef)}/status?telegram_id=${encodeURIComponent(telegramId)}`);
  }

  function mapBackendStatus(status) {
    if (!status) return "order_invalid";
    if (status.status === "fulfilled" && status.fulfillment_status === "fulfilled") return "purchase_already_fulfilled";
    if (status.status === "paid") return "order_already_paid";
    if (status.status === "cancelled") return "payment_cancelled";
    if (status.status === "expired") return "order_expired";
    if (status.status === "fulfillment_failed" || status.fulfillment_status === "failed") return "payment_failed";
    return "payment_confirmation_pending";
  }

  async function refreshStatus({ userInitiated = false } = {}) {
    if (!state.checkout?.order_ref) {
      state.status = userInitiated ? "ready_for_payment" : state.status;
      state.message = userInitiated ? "No payment order has been started yet." : state.message;
      render();
      return null;
    }
    try {
      const result = await fetchOrderStatus(state.checkout.order_ref);
      state.status = mapBackendStatus(result);
      state.message = "";
      if (["purchase_already_fulfilled", "order_already_paid", "payment_cancelled", "order_expired", "payment_failed"].includes(state.status)) {
        clearPoll();
      }
      render();
      return result;
    } catch (error) {
      state.status = "order_invalid";
      state.message = "Could not load the real payment state for this order.";
      render();
      return null;
    }
  }

  function clearPoll() {
    state.polling = false;
    if (window.VPayGate._pollTimer) {
      window.clearTimeout(window.VPayGate._pollTimer);
      window.VPayGate._pollTimer = null;
    }
  }

  function beginPolling() {
    clearPoll();
    state.polling = true;
    let count = 0;
    const tick = async () => {
      if (!state.polling || count >= POLL_LIMIT) {
        state.polling = false;
        return;
      }
      count += 1;
      await refreshStatus();
      if (!state.polling) return;
      window.VPayGate._pollTimer = window.setTimeout(tick, 2500);
    };
    window.VPayGate._pollTimer = window.setTimeout(tick, 1800);
  }

  function openCheckoutUrl(url) {
    const tg = window.Telegram?.WebApp;
    if (window.AppViewMode?.isMiniApp?.() && typeof tg?.openLink === "function") {
      tg.openLink(url, { try_instant_view: false });
      return true;
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    return Boolean(opened);
  }

  async function continuePayment() {
    if (!state.provider) return;
    try {
      state.status = state.checkout?.checkout_url ? "redirecting_to_provider" : "preparing_order";
      state.message = state.checkout?.checkout_url ? "Opening existing payment order..." : "Creating payment order...";
      render();
      if (!state.checkout?.checkout_url) {
        const restored = restoreStoredOrder(state.product, state.provider);
        state.checkout = restored || await createCheckout(state.provider);
        storeOrder();
      }
      if (!state.checkout?.checkout_url) throw new Error("Payment provider did not return a checkout URL.");
      state.status = "redirecting_to_provider";
      state.message = "Redirecting to the payment provider...";
      render();
      const opened = openCheckoutUrl(state.checkout.checkout_url);
      if (!opened) {
        state.status = "payment_provider_selected";
        state.message = "Popup was blocked. Use Open payment again or allow popups for this site.";
        render();
        return;
      }
      state.status = "payment_confirmation_pending";
      state.message = "Payment opened. Return here after paying; this page will check the real order status.";
      render();
      beginPolling();
    } catch (error) {
      state.status = "payment_failed";
      state.message = error?.data?.detail || error?.message || "Could not start payment.";
      render();
    }
  }

  function updateRoute(product) {
    const url = new URL(window.location.href);
    url.pathname = "/";
    url.searchParams.set("page", "v-paygate");
    url.searchParams.set("product", product.type);
    url.searchParams.set("amount", String(product.amount_uzs));
    if (product.origin) url.searchParams.set("origin", product.origin);
    history.pushState({ page: "v-paygate" }, "", `${url.pathname}?${url.searchParams.toString()}`);
  }

  window.VPayGate.start = function (options = {}) {
    state = {
      product: defaultProduct(options),
      provider: options.provider || "click",
      status: "ready_for_payment",
      checkout: null,
      message: "Choose a payment method to continue.",
      polling: false,
    };
    state.checkout = restoreStoredOrder(state.product, state.provider);
    updateRoute(state.product);
    render();
    if (state.checkout?.order_ref) refreshStatus();
  };

  window.VPayGate.openFromRoute = function () {
    const params = new URLSearchParams(window.location.search);
    const product = defaultProduct({
      amount_uzs: params.get("amount"),
      origin: params.get("origin") || "route",
      return_page: params.get("return") || "",
    });
    state = {
      product,
      provider: params.get("provider") || "click",
      status: "ready_for_payment",
      checkout: null,
      message: "Choose a payment method to continue.",
      polling: false,
    };
    state.checkout = restoreStoredOrder(state.product, state.provider);
    render();
    if (state.checkout?.order_ref) refreshStatus();
    return true;
  };

  window.addEventListener("pagehide", clearPoll);
})();
