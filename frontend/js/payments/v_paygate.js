window.VPayGate = window.VPayGate || {};

(function () {
  const DEFAULT_TOPUP_UZS = 50000;
  const STORAGE_KEY = "voxi_vpaygate_order";
  const POLL_LIMIT = 10;
  const TERMINAL_STATES = new Set([
    "payment_successful",
    "payment_failed",
    "payment_cancelled",
    "order_expired",
    "order_invalid",
    "order_already_paid",
    "purchase_already_fulfilled",
  ]);
  let clickScriptPromise = null;
  let state = initialState();

  function initialState() {
    return {
      product: null,
      method: null,
      status: "ready_for_payment",
      checkout: null,
      message: "",
      polling: false,
      busy: false,
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatUzs(amount) {
    const parsed = Number(amount);
    const value = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    return `${value.toLocaleString("ru-RU").replace(/\u00a0/g, " ")} UZS`;
  }

  function normalizeAmount(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TOPUP_UZS;
    return Math.max(5000, Math.floor(parsed / 5000) * 5000);
  }

  function coinsForTopup(amountUzs) {
    // Temporary bridge: Click still fulfills the existing V-Coin engine.
    // Replace this adapter when the real stored UZS wallet/order source lands.
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
      title: "Balansni to‘ldirish",
      description: "Pulli xizmatlar uchun balansingizni to‘ldiring.",
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

  function showPage() {
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
    if (state.message) return state.message;
    const map = {
      preparing_order: "Buyurtma tayyorlanmoqda...",
      ready_for_payment: "To‘lov usulini tanlang",
      payment_provider_selected: "To‘lov usulini tanlang",
      redirecting_to_provider: "To‘lov sahifasiga yo‘naltirilmoqda...",
      payment_processing: "To‘lov tekshirilmoqda...",
      payment_confirmation_pending: "To‘lov tasdiqlanishi kutilmoqda",
      payment_successful: "To‘lov muvaffaqiyatli amalga oshirildi",
      payment_failed: "To‘lov amalga oshmadi",
      payment_cancelled: "To‘lov bekor qilindi",
      order_expired: "Buyurtma muddati tugagan",
      order_invalid: "Buyurtma topilmadi",
      order_already_paid: "Bu buyurtma allaqachon to‘langan",
      purchase_already_fulfilled: "Xarid faollashtirildi",
    };
    return map[state.status] || "To‘lov usulini tanlang";
  }

  function methodTitle(method) {
    return method === "click_app" ? "Click ilovasi orqali" : "Bank kartasi orqali";
  }

  function primaryText(product) {
    if (state.busy || state.status === "preparing_order" || state.status === "redirecting_to_provider") {
      return "To‘lovga yo‘naltirilmoqda...";
    }
    if (state.status === "payment_processing") return "To‘lov tekshirilmoqda...";
    return `${formatUzs(product.amount_uzs)} to‘lash`;
  }

  function canPay() {
    const payableStatus = ["ready_for_payment", "payment_provider_selected", "payment_failed"].includes(state.status);
    return Boolean(state.method)
      && !state.busy
      && payableStatus
      && !TERMINAL_STATES.has(state.status)
      && state.status !== "payment_processing";
  }

  function shouldShowStatusAction() {
    return state.status === "payment_confirmation_pending";
  }

  function shouldShowContinueAction() {
    return ["payment_successful", "order_already_paid", "purchase_already_fulfilled"].includes(state.status);
  }

  function renderMethod(method, title, subtitle) {
    const selected = state.method === method;
    return `
      <button type="button"
        class="vpaygate-method ${selected ? "is-selected" : ""}"
        data-vpay-method="${method}"
        aria-pressed="${selected ? "true" : "false"}"
        ${state.busy ? "disabled" : ""}>
        <span class="vpaygate-method-copy">
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(subtitle)}</small>
        </span>
        <span class="vpaygate-method-mark" aria-hidden="true">${selected ? "Tanlandi" : "Tanlash"}</span>
      </button>
    `;
  }

  function render() {
    const product = state.product || defaultProduct();
    const node = showPage();
    node.innerHTML = `
      <div class="vpaygate-shell">
        <header class="vpaygate-header">
          <div>
            <div class="vpaygate-kicker">V-PayGate</div>
            <h1 class="vpaygate-title">To‘lov</h1>
            <p class="vpaygate-lead">To‘lov usulini tanlang</p>
          </div>
        </header>

        <div class="vpaygate-layout">
          <section class="vpaygate-section vpaygate-method-section" aria-labelledby="vpaygate-method-title">
            <h2 class="vpaygate-section-title" id="vpaygate-method-title">To‘lov usuli</h2>
            <div class="vpaygate-methods">
              ${renderMethod("bank_card", "Bank kartasi orqali", "Uzcard yoki Humo kartasi bilan to‘lang")}
              ${renderMethod("click_app", "Click ilovasi orqali", "Click ilovasida to‘lovni tasdiqlang")}
            </div>
          </section>

          <aside class="vpaygate-section vpaygate-summary" aria-labelledby="vpaygate-summary-title">
            <h2 class="vpaygate-section-title" id="vpaygate-summary-title">Buyurtma ma’lumotlari</h2>
            <div class="vpaygate-summary-list">
              <div class="vpaygate-summary-row">
                <span>Xizmat</span>
                <strong>${escapeHtml(product.title)}</strong>
              </div>
              <div class="vpaygate-summary-row vpaygate-summary-total">
                <span>To‘lov summasi</span>
                <strong>${escapeHtml(formatUzs(product.amount_uzs))}</strong>
              </div>
            </div>

            <div class="vpaygate-status ${statusClass()}" role="status">${escapeHtml(statusText())}</div>

            <button type="button" class="vpaygate-pay" id="vpaygate-pay" ${canPay() ? "" : "disabled"}>
              ${escapeHtml(primaryText(product))}
            </button>

            ${shouldShowStatusAction() ? `<button type="button" class="vpaygate-status-action" id="vpaygate-refresh">To‘lov holatini tekshirish</button>` : ""}
            ${shouldShowContinueAction() ? `<button type="button" class="vpaygate-status-action" id="vpaygate-continue">Davom etish</button>` : ""}
            <button type="button" class="vpaygate-cancel-link" id="vpaygate-cancel">To‘lovni bekor qilish</button>
          </aside>
        </div>
      </div>
    `;
    bind();
  }

  function bind() {
    document.getElementById("vpaygate-cancel")?.addEventListener("click", leavePage);
    document.getElementById("vpaygate-refresh")?.addEventListener("click", () => refreshStatus({ userInitiated: true }));
    document.getElementById("vpaygate-continue")?.addEventListener("click", leavePage);
    document.getElementById("vpaygate-pay")?.addEventListener("click", continuePayment);
    document.querySelectorAll("[data-vpay-method]").forEach((button) => {
      button.addEventListener("click", () => {
        state.method = button.getAttribute("data-vpay-method") || null;
        const restored = restoreStoredOrder(state.product, state.method);
        state.checkout = restored?.checkout || null;
        state.status = "payment_provider_selected";
        state.message = "To‘lov usulini tanlang";
        render();
      });
    });
  }

  function storedProductMatches(stored, product) {
    return stored?.product?.type === product?.type
      && Number(stored?.product?.amount_uzs || 0) === Number(product?.amount_uzs || 0);
  }

  function storeOrder() {
    try {
      if (!state.checkout?.order_ref || !state.method) return;
      window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify({
        method: state.method,
        product: state.product,
        checkout: state.checkout,
        saved_at: new Date().toISOString(),
      }));
    } catch (_) {}
  }

  function restoreStoredOrder(product = state.product, method = state.method) {
    try {
      const stored = JSON.parse(window.sessionStorage?.getItem(STORAGE_KEY) || "null");
      if (!stored?.checkout?.order_ref || !storedProductMatches(stored, product)) return null;
      if (method && stored.method !== method) return null;
      return stored;
    } catch (_) {
      return null;
    }
  }

  async function createCheckout() {
    const telegramId = await resolveTelegramId();
    if (!telegramId) throw new Error("telegram_required");
    return await window.apiPost("/payments/click/vcoins/checkout", {
      telegram_id: Number(telegramId),
      coins: Number(state.product?.coins || coinsForTopup(state.product?.amount_uzs)),
      promo_code: state.product?.promo_code || null,
    });
  }

  async function ensureCheckout() {
    const restored = restoreStoredOrder(state.product, state.method);
    if (restored?.checkout?.order_ref) {
      state.checkout = restored.checkout;
      return state.checkout;
    }
    state.checkout = await createCheckout();
    storeOrder();
    return state.checkout;
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

  async function refreshStatus() {
    if (!state.checkout?.order_ref) {
      state.status = "ready_for_payment";
      state.message = "To‘lov usulini tanlang";
      render();
      return null;
    }
    state.status = "payment_processing";
    state.message = "";
    render();
    try {
      const result = await fetchOrderStatus(state.checkout.order_ref);
      state.status = mapBackendStatus(result);
      state.message = "";
      if (TERMINAL_STATES.has(state.status)) clearPoll();
      render();
      return result;
    } catch (_) {
      state.status = "order_invalid";
      state.message = "";
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
        if (state.status === "payment_confirmation_pending") render();
        return;
      }
      count += 1;
      await refreshStatus();
      if (!state.polling) return;
      window.VPayGate._pollTimer = window.setTimeout(tick, 2500);
    };
    window.VPayGate._pollTimer = window.setTimeout(tick, 1800);
  }

  function loadClickCheckoutScript() {
    if (typeof window.createPaymentRequest === "function") return Promise.resolve(window.createPaymentRequest);
    if (clickScriptPromise) return clickScriptPromise;
    clickScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-click-checkout='1']");
      if (existing) {
        existing.addEventListener("load", () => {
          if (typeof window.createPaymentRequest === "function") resolve(window.createPaymentRequest);
          else reject(new Error("click_checkout_unavailable"));
        }, { once: true });
        existing.addEventListener("error", () => reject(new Error("click_checkout_load_failed")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://my.click.uz/pay/checkout.js";
      script.async = true;
      script.dataset.clickCheckout = "1";
      script.onload = () => {
        if (typeof window.createPaymentRequest === "function") resolve(window.createPaymentRequest);
        else reject(new Error("click_checkout_unavailable"));
      };
      script.onerror = () => reject(new Error("click_checkout_load_failed"));
      document.head.appendChild(script);
    }).catch((error) => {
      clickScriptPromise = null;
      throw error;
    });
    return clickScriptPromise;
  }

  function clickCardParams(checkout) {
    const params = checkout?.click_payment || {};
    if (!params.service_id || !params.merchant_id || !params.transaction_param) return null;
    return {
      service_id: params.service_id,
      merchant_id: params.merchant_id,
      amount: params.amount || checkout.amount,
      transaction_param: params.transaction_param,
      ...(params.merchant_user_id ? { merchant_user_id: params.merchant_user_id } : {}),
    };
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

  async function startCardPayment(checkout) {
    const params = clickCardParams(checkout);
    if (!params) throw new Error("missing_click_card_params");
    const createPaymentRequest = await loadClickCheckoutScript();
    state.status = "redirecting_to_provider";
    state.message = "";
    render();
    createPaymentRequest(params, async (result) => {
      const code = Number(typeof result === "object" ? result?.status : result);
      if (code === 2) {
        state.status = "payment_processing";
        state.message = "";
        render();
        await refreshStatus();
        beginPolling();
        return;
      }
      state.status = "payment_confirmation_pending";
      state.message = "";
      render();
      beginPolling();
    });
  }

  async function startClickAppPayment(checkout) {
    if (!checkout?.checkout_url) throw new Error("missing_checkout_url");
    state.status = "redirecting_to_provider";
    state.message = "";
    render();
    if (!openCheckoutUrl(checkout.checkout_url)) {
      state.status = "payment_failed";
      state.message = "To‘lov sahifasi ochilmadi";
      render();
      return;
    }
    state.status = "payment_confirmation_pending";
    state.message = "";
    render();
    beginPolling();
  }

  async function continuePayment() {
    if (!state.method || state.busy) return;
    state.busy = true;
    state.status = "preparing_order";
    state.message = "";
    render();
    try {
      const checkout = await ensureCheckout();
      if (state.method === "bank_card") {
        await startCardPayment(checkout);
      } else {
        await startClickAppPayment(checkout);
      }
    } catch (_) {
      state.status = "payment_failed";
      state.message = "";
      render();
    } finally {
      state.busy = false;
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

  function applyStoredOrder(product) {
    const restored = restoreStoredOrder(product, null);
    if (!restored) return {};
    return {
      method: restored.method || null,
      checkout: restored.checkout || null,
      status: restored.checkout?.order_ref ? "payment_confirmation_pending" : "ready_for_payment",
    };
  }

  window.VPayGate.start = function (options = {}) {
    const product = defaultProduct(options);
    const restored = applyStoredOrder(product);
    state = {
      ...initialState(),
      product,
      method: restored.method || null,
      checkout: restored.checkout || null,
      status: restored.status || "ready_for_payment",
      message: "",
    };
    updateRoute(product);
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
    const restored = applyStoredOrder(product);
    state = {
      ...initialState(),
      product,
      method: restored.method || null,
      checkout: restored.checkout || null,
      status: restored.status || "ready_for_payment",
      message: "",
    };
    render();
    if (state.checkout?.order_ref) refreshStatus();
    return true;
  };

  window.addEventListener("pagehide", clearPoll);
})();
