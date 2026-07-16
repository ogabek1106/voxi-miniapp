window.VCoinUI = window.VCoinUI || {};

(function () {
  const COSTS = {
    full_mock: 10,
    separate_block: 3
  };
  const DEFAULT_PURCHASE_AMOUNT = 10;

  function isVcoinEnabled() {
    return window.AppConfig?.isVcoinEnabled?.() === true;
  }

  function normalizeTelegramId(value) {
    const id = Number(value || 0);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  function telegramId() {
    const id = typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
    if (id) return normalizeTelegramId(id);

    if (window.AppViewMode?.isWebsite?.()) {
      return normalizeTelegramId(window.WebsiteAuthState?.getUser?.()?.telegram_id);
    }

    return null;
  }

  async function resolveTelegramId() {
    let id = telegramId();
    if (id || !window.AppViewMode?.isWebsite?.() || !window.WebsiteAuthState?.load) {
      return id;
    }

    try {
      const user = await window.WebsiteAuthState.load();
      id = normalizeTelegramId(user?.telegram_id);
    } catch (_) {
      id = null;
    }

    return id;
  }

  function ensureStyles() {
    if (document.getElementById("vcoin-ui-styles")) return;
    const style = document.createElement("style");
    style.id = "vcoin-ui-styles";
    style.textContent = `
      #screen-home .home-balance,
      [data-vcoin-open="1"] {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .vcoin-sheet-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10004;
        background: rgba(17,24,39,0.28);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        box-sizing: border-box;
        padding: 0 12px calc(18px + env(safe-area-inset-bottom, 0px));
      }

      .vcoin-sheet {
        width: min(100%, 420px);
        max-height: 78vh;
        height: min(620px, 78vh);
        overflow: hidden;
        box-sizing: border-box;
        border-radius: 24px;
        background: #ffffff;
        color: #17212B;
        padding: 16px 16px 20px;
        box-shadow: 0 -14px 40px rgba(20,40,60,0.20);
        display: grid;
        grid-template-rows: auto auto auto auto minmax(0, 1fr) auto;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      }

      .vcoin-sheet.uzs-wallet-sheet {
        display: flex;
        flex-direction: column;
      }

      .uzs-wallet-sheet .vcoin-sheet-title {
        margin-top: 4px;
      }

      .uzs-wallet-sheet .vcoin-sheet-balance {
        flex: 0 0 auto;
        min-height: 104px;
        margin-top: 14px;
        padding: 16px 18px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
      }

      .uzs-wallet-sheet .vcoin-sheet-balance-label {
        display: grid;
        grid-template-columns: 30px minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        margin-top: 8px;
      }

      .uzs-wallet-sheet .wallet-balance-icon {
        width: 28px;
        height: 28px;
      }

      .uzs-wallet-sheet #uzs-sheet-balance-value {
        min-width: 0;
        font-size: clamp(26px, 6.2vw, 34px);
        line-height: 1.05;
        white-space: nowrap;
      }

      .uzs-wallet-sheet .uzs-wallet-currency {
        align-self: center;
        padding-left: 12px;
      }

      @media (min-width: 700px) {
        .vcoin-sheet-backdrop {
          align-items: flex-end;
          padding-bottom: max(160px, 18vh);
        }

        .vcoin-sheet {
          height: min(720px, 76vh);
          max-height: min(720px, 76vh);
        }
      }

      .vcoin-sheet-handle {
        width: 42px;
        height: 22px;
        flex: 0 0 auto;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        cursor: grab;
        touch-action: none;
        user-select: none;
        margin: 0 auto 2px;
      }

      .vcoin-sheet-handle::before {
        content: "";
        width: 42px;
        height: 4px;
        border-radius: 999px;
        background: rgba(20,40,60,0.18);
      }

      .vcoin-sheet-title {
        flex: 0 0 auto;
        margin: 0;
        font-size: 20px;
        font-weight: 900;
      }

      .vcoin-sheet-balance {
        flex: 0 0 auto;
        margin-top: 10px;
        padding: 14px;
        border-radius: 18px;
        background: #F5F9FC;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .vcoin-sheet-balance strong {
        font-size: 28px;
        line-height: 1;
      }

      .vcoin-sheet-balance-label,
      .vcoin-price-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .vcoin-sheet .vcoin-icon {
        width: 24px;
        height: 24px;
      }

      .vcoin-price-grid {
        flex: 0 0 auto;
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }

      .vcoin-purchase-box {
        margin-top: 12px;
        padding: 12px;
        border-radius: 18px;
        background: #f8fbfd;
        border: 1px solid rgba(0,186,255,0.12);
        display: grid;
        gap: 10px;
      }

      .vcoin-purchase-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .vcoin-amount-input,
      .vcoin-promo-input {
        width: 118px;
        height: 42px;
        border-radius: 12px;
        border: 1px solid rgba(20,40,60,0.14);
        background: #fff;
        padding: 0 12px;
        font-weight: 900;
        color: #17212B;
        box-sizing: border-box;
      }

      .vcoin-promo-input {
        width: 100%;
      }

      .vcoin-promo-toggle {
        border: 0;
        background: transparent;
        color: #00a6e2;
        padding: 0;
        height: auto;
        min-height: 0 !important;
        width: max-content;
        justify-self: center;
        font-size: 12px !important;
        font-weight: 900;
        text-align: center;
        cursor: pointer;
        box-shadow: none !important;
      }

      .vcoin-promo-line {
        display: none;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: center;
      }

      .vcoin-promo-line.is-visible {
        display: grid;
      }

      .vcoin-apply-promo-btn {
        width: 74px;
        height: 42px !important;
        border-radius: 12px !important;
        background: #eef8ff !important;
        color: #008fc4 !important;
      }

      .vcoin-total-line {
        padding-top: 8px;
        border-top: 1px solid rgba(20,40,60,0.08);
      }

      .vcoin-total-line strong {
        font-size: 18px;
      }

      .vcoin-price-row,
      .vcoin-ledger-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 64px;
        padding: 10px 0;
        box-sizing: border-box;
        border-bottom: 1px solid rgba(20,40,60,0.08);
        text-align: left;
      }

      .vcoin-history-list {
        height: 100%;
        min-height: 0;
        max-height: none;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding-right: 2px;
        padding-bottom: 4px;
      }

      .vcoin-history-empty {
        min-height: 100%;
        display: flex;
        align-items: center;
      }

      .vcoin-history-skeleton {
        height: 64px;
        border-bottom: 1px solid rgba(20,40,60,0.08);
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 8px;
      }

      .vcoin-skeleton-line {
        height: 12px;
        border-radius: 999px;
        background: linear-gradient(90deg, #eef2f7 0%, #f8fafc 48%, #eef2f7 100%);
        background-size: 200% 100%;
        animation: vcoinSkeleton 1s ease-in-out infinite;
      }

      .vcoin-skeleton-line.short {
        width: 48%;
      }

      .vcoin-skeleton-line.long {
        width: 72%;
      }

      @keyframes vcoinSkeleton {
        0% { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }

      .vcoin-muted {
        color: #607080;
        font-size: 13px;
        font-weight: 700;
      }

      .vcoin-delta-plus {
        color: #059669;
        font-weight: 900;
      }

      .vcoin-delta-minus {
        color: #dc2626;
        font-weight: 900;
      }

      .vcoin-sheet-actions {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
        margin-top: 14px;
        padding-top: 12px;
        padding-bottom: calc(4px + env(safe-area-inset-bottom, 0px));
        background: #ffffff;
        z-index: 2;
      }

      .vcoin-sheet-actions.uzs-wallet-actions {
        grid-template-columns: 1fr 1fr;
      }

      .vcoin-history-section {
        min-height: 0;
        overflow: hidden;
        margin-top: 14px;
      }

      .uzs-wallet-sheet .vcoin-history-section {
        flex: 1 1 auto;
        min-height: 0;
        margin-top: 18px;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
      }

      .uzs-wallet-history-title {
        font-size: 15px;
        font-weight: 900;
        margin: 0 0 8px;
        line-height: 1.25;
      }

      @media (max-width: 380px) {
        .vcoin-sheet-actions {
          grid-template-columns: 1fr;
        }
      }

      .vcoin-sheet button,
      .vcoin-sheet .vcoin-buy-btn {
        height: 48px;
        border-radius: 14px;
        border: none;
        font-size: 15px;
        font-weight: 900;
        margin: 0;
      }

      .vcoin-buy-btn {
        background: #00BAFF !important;
        color: #ffffff !important;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .vcoin-click-btn {
        background: #eef8ff !important;
        color: #008fc4 !important;
      }

      .vcoin-payment-fallback {
        display: grid;
        gap: 8px;
      }

      .vcoin-click-choice {
        display: grid;
        gap: 8px;
        padding: 10px;
        border-radius: 14px;
        background: #fff;
        border: 1px solid rgba(20,40,60,0.10);
      }

      .vcoin-click-choice strong {
        font-size: 14px;
      }

      .vcoin-click-choice-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .vcoin-click-option {
        height: auto !important;
        min-height: 58px !important;
        padding: 8px !important;
        display: grid !important;
        gap: 3px;
        align-content: center;
        background: #eef8ff !important;
        color: #008fc4 !important;
      }

      .vcoin-click-option span {
        color: #607080;
        font-size: 11px;
        line-height: 1.25;
      }

      .vcoin-payment-status {
        color: #008fc4;
        font-size: 13px;
        font-weight: 800;
        line-height: 1.35;
        text-align: center;
      }

      .vcoin-payment-fallback-message {
        color: #dc2626;
        font-size: 13px;
        font-weight: 800;
        line-height: 1.35;
        text-align: center;
      }

      .vcoin-cancel-btn {
        background: #eef2f7 !important;
        color: #17212B !important;
      }
    `;
    document.head.appendChild(style);
  }

  function closeSheet() {
    document.getElementById("vcoin-sheet-backdrop")?.remove();
    document.body.classList.remove("reward-vcoin-open");
  }

  function bindSheetDragToClose(sheet, canClose) {
    const handle = sheet?.querySelector(".vcoin-sheet-handle");
    if (!handle) return;

    let startY = 0;
    let dragging = false;

    handle.addEventListener("pointerdown", (event) => {
      dragging = true;
      startY = event.clientY;
      handle.setPointerCapture?.(event.pointerId);
    });

    handle.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const deltaY = Math.max(0, event.clientY - startY);
      sheet.style.transform = `translateY(${Math.min(deltaY, 90)}px)`;
    });

    function endDrag(event) {
      if (!dragging) return;
      dragging = false;
      const deltaY = event.clientY - startY;
      sheet.style.transform = "";
      if (deltaY > 44) {
        if (typeof canClose === "function" && !canClose()) return;
        closeSheet();
      }
    }

    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
  }

  function formatReason(reason) {
    const labels = {
      payment_confirmed: "V-Coin top-up",
      full_mock_spend: "Full Mock spent",
      separate_block_spend: "Single block spent",
      refund: "Refund",
      admin_adjustment: "Admin adjustment"
    };
    return labels[reason] || String(reason || "Balance update").replaceAll("_", " ");
  }

  function formatLedgerTime(value) {
    if (!value) return "Time unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Time unavailable";

    const pad = (part) => String(part).padStart(2, "0");
    return [
      `${pad(date.getHours())}:${pad(date.getMinutes())}`,
      `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
    ].join(", ");
  }

  function renderLedger(items) {
    if (!items.length) {
      return `<div class="vcoin-history-empty vcoin-muted">No balance actions yet.</div>`;
    }

    return items.map((item) => {
      const delta = Number(item?.delta || 0);
      const sign = delta > 0 ? "+" : "";
      const klass = delta >= 0 ? "vcoin-delta-plus" : "vcoin-delta-minus";
      return `
        <div class="vcoin-ledger-row">
          <div>
            <div style="font-weight:800;">${formatReason(item?.reason)}</div>
            <div class="vcoin-muted">${formatLedgerTime(item?.created_at)}</div>
          </div>
          <div class="${klass}">${sign}${delta}</div>
        </div>
      `;
    }).join("");
  }

  function formatUzsReason(reason) {
    const labels = {
      payment_confirmed: "Wallet top-up",
      full_mock_spend: "Full Mock spent",
      separate_block_spend: "Single section spent",
      refund: "Refund",
      admin_adjustment: "Admin adjustment"
    };
    return labels[reason] || String(reason || "Balance update").replaceAll("_", " ");
  }

  function renderUzsLedger(items) {
    if (!items.length) {
      return `<div class="vcoin-history-empty vcoin-muted">No balance actions yet.</div>`;
    }

    return items.map((item) => {
      const delta = Number(item?.delta || 0);
      const amount = window.UzsBalance?.convertVCoinsToUzs?.(Math.abs(delta)) || 0;
      const sign = delta > 0 ? "+" : (delta < 0 ? "-" : "");
      const klass = delta >= 0 ? "vcoin-delta-plus" : "vcoin-delta-minus";
      return `
        <div class="vcoin-ledger-row">
          <div>
            <div style="font-weight:800;">${formatUzsReason(item?.reason)}</div>
            <div class="vcoin-muted">${formatLedgerTime(item?.created_at)}</div>
          </div>
          <div class="${klass}">${sign}${window.UzsBalance?.formatUzs?.(amount) || "0 UZS"}</div>
        </div>
      `;
    }).join("");
  }

  function renderHistorySkeleton() {
    return `
      <div class="vcoin-history-skeleton">
        <div class="vcoin-skeleton-line long"></div>
        <div class="vcoin-skeleton-line short"></div>
      </div>
      <div class="vcoin-history-skeleton">
        <div class="vcoin-skeleton-line long"></div>
        <div class="vcoin-skeleton-line short"></div>
      </div>
      <div class="vcoin-history-skeleton">
        <div class="vcoin-skeleton-line long"></div>
        <div class="vcoin-skeleton-line short"></div>
      </div>
    `;
  }

  async function fetchBalance() {
    const id = telegramId();
    if (!id && window.AppViewMode?.isWebsite?.()) {
      const user = window.WebsiteAuthState?.getUser?.();
      return Number(user?.v_coins || 0);
    }
    if (!id) return 0;
    const data = await apiGet(`/vcoins/balance?telegram_id=${id}`);
    return Number(data?.v_coins || 0);
  }

  async function fetchLedger() {
    const id = telegramId();
    if (!id && window.AppViewMode?.isWebsite?.()) {
      const user = window.WebsiteAuthState?.getUser?.();
      const websiteTelegramId = Number(user?.telegram_id || 0);
      if (!websiteTelegramId) return [];
      const data = await apiGet(`/vcoins/ledger?telegram_id=${websiteTelegramId}`);
      return Array.isArray(data?.items) ? data.items : [];
    }
    if (!id) return [];
    const data = await apiGet(`/vcoins/ledger?telegram_id=${id}`);
    return Array.isArray(data?.items) ? data.items : [];
  }

  async function fetchSettings() {
    try {
      const data = await apiGet("/vcoins/settings");
      return { exchange_rate_uzs: Number(data?.exchange_rate_uzs || 5000) };
    } catch (_) {
      return { exchange_rate_uzs: 5000 };
    }
  }

  function formatMoney(amount) {
    return `${Number(amount || 0).toLocaleString("uz-UZ")} UZS`;
  }

  async function quotePurchase(coins, promoCode) {
    const data = await apiPost("/vcoins/quote", {
      coins: Number(coins || 0),
      promo_code: promoCode || null
    });
    return data?.quote || null;
  }

  async function createPaymentIntent(telegramId, coins, promoCode) {
    const data = await apiPost("/vcoins/payment-intents", {
      telegram_id: Number(telegramId),
      coins: Number(coins || 0),
      promo_code: promoCode || null
    });
    return data?.payment || null;
  }

  async function createPaymeCheckout(telegramId, coins, promoCode) {
    return await apiPost("/payments/payme/vcoins/checkout", {
      telegram_id: Number(telegramId),
      coins: Number(coins || 0),
      promo_code: promoCode || null
    });
  }

  async function createClickCheckout(telegramId, coins, promoCode) {
    return await apiPost("/payments/click/vcoins/checkout", {
      telegram_id: Number(telegramId),
      coins: Number(coins || 0),
      promo_code: promoCode || null
    });
  }

  async function fetchOrderStatus(orderRef, telegramId) {
    return await apiGet(`/payments/orders/${encodeURIComponent(orderRef)}/status?telegram_id=${encodeURIComponent(Number(telegramId || 0))}`);
  }

  function isTelegramMiniApp() {
    return Boolean(window.AppViewMode?.isMiniApp?.() && window.Telegram?.WebApp);
  }

  let clickCheckoutScriptPromise = null;
  const CLICK_CARD_ATTEMPT_STORAGE_KEY = "voxi_click_card_attempt";
  const CLICK_CARD_PENDING_STATES = new Set(["creating_order", "widget_open", "pending_confirmation"]);
  let activeClickCardAttempt = null;
  let clickCardPollTimer = null;
  let clickCardPollToken = 0;

  function isClickCardAttemptPending(attempt = activeClickCardAttempt) {
    return Boolean(attempt?.order_ref && CLICK_CARD_PENDING_STATES.has(attempt.state));
  }

  function safeClickPaymentParams(params, cardType) {
    if (!params?.service_id || !params?.merchant_id || !params?.transaction_param) return null;
    return {
      service_id: params.service_id,
      merchant_id: params.merchant_id,
      amount: params.amount,
      transaction_param: params.transaction_param,
      ...(params.merchant_user_id ? { merchant_user_id: params.merchant_user_id } : {}),
      card_type: cardType
    };
  }

  function persistClickCardAttempt() {
    try {
      if (!activeClickCardAttempt?.order_ref) {
        window.sessionStorage?.removeItem(CLICK_CARD_ATTEMPT_STORAGE_KEY);
        return;
      }
      const stored = {
        order_ref: activeClickCardAttempt.order_ref,
        amount: activeClickCardAttempt.amount,
        card_type: activeClickCardAttempt.card_type,
        created_at: activeClickCardAttempt.created_at,
        click_payment: activeClickCardAttempt.click_payment
      };
      window.sessionStorage?.setItem(CLICK_CARD_ATTEMPT_STORAGE_KEY, JSON.stringify(stored));
    } catch (_) {}
  }

  function clearClickCardAttempt() {
    activeClickCardAttempt = null;
    stopClickCardPolling();
    try {
      window.sessionStorage?.removeItem(CLICK_CARD_ATTEMPT_STORAGE_KEY);
    } catch (_) {}
  }

  function restoreClickCardAttempt() {
    try {
      const stored = JSON.parse(window.sessionStorage?.getItem(CLICK_CARD_ATTEMPT_STORAGE_KEY) || "null");
      if (!stored?.order_ref || (stored.card_type !== "uzcard" && stored.card_type !== "humo")) return null;
      if (!stored.click_payment?.service_id || !stored.click_payment?.merchant_id || !stored.click_payment?.transaction_param) return null;
      activeClickCardAttempt = {
        order_ref: stored.order_ref,
        amount: stored.amount,
        card_type: stored.card_type,
        created_at: stored.created_at || new Date().toISOString(),
        click_payment: stored.click_payment,
        state: "pending_confirmation",
        widget_open: false,
        latest_status: null
      };
      return activeClickCardAttempt;
    } catch (_) {
      return null;
    }
  }

  function stopClickCardPolling() {
    clickCardPollToken += 1;
    if (clickCardPollTimer) {
      window.clearTimeout(clickCardPollTimer);
      clickCardPollTimer = null;
    }
  }

  window.addEventListener("pagehide", stopClickCardPolling);

  function loadClickCheckoutScript() {
    if (typeof window.createPaymentRequest === "function") return Promise.resolve(window.createPaymentRequest);
    if (clickCheckoutScriptPromise) return clickCheckoutScriptPromise;
    clickCheckoutScriptPromise = new Promise((resolve, reject) => {
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
      clickCheckoutScriptPromise = null;
      throw error;
    });
    return clickCheckoutScriptPromise;
  }

  function openPaymentPlaceholder(providerName) {
    const paymentWindow = window.open("", "_blank");
    if (!paymentWindow) return null;

    try {
      paymentWindow.document.open();
      paymentWindow.document.write(`<!doctype html>
        <html>
          <head>
            <title>Opening ${providerName} payment</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                font: 700 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                color: #17212B;
                background: #F5F9FC;
              }
            </style>
          </head>
          <body>Opening ${providerName} payment&hellip;</body>
        </html>`);
      paymentWindow.document.close();
    } catch (_) {
      // Some browsers restrict placeholder access, but the reserved window can still be redirected.
    }

    return paymentWindow;
  }

  function openExternalCheckoutUrl(checkoutUrl, paymentWindow) {
    if (!checkoutUrl) throw new Error("missing_checkout_url");

    const tg = window.Telegram?.WebApp;
    if (isTelegramMiniApp() && typeof tg?.openLink === "function") {
      closePaymentWindow(paymentWindow);
      tg.openLink(checkoutUrl, { try_instant_view: false });
      return true;
    }

    if (paymentWindow && !paymentWindow.closed) {
      paymentWindow.location.replace(checkoutUrl);
      return true;
    }

    return false;
  }

  function closePaymentWindow(paymentWindow) {
    try {
      if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
    } catch (_) {}
  }

  function backendErrorMessage(error, fallback) {
    const detail = error?.data?.detail ?? parseApiError(error)?.detail;
    if (typeof detail === "string" && detail) return detail;
    if (detail && typeof detail === "object") return JSON.stringify(detail);
    if (error?.message) return error.message;
    return fallback;
  }

  function showPaymentFallback(providerName, checkoutUrl) {
    const fallback = document.getElementById("vcoin-payment-fallback");
    if (!fallback || !checkoutUrl) return;
    fallback.innerHTML = `
      <div class="vcoin-payment-fallback-message">${providerName} popup was blocked. Open it manually to continue.</div>
      <button type="button" class="vcoin-buy-btn" id="vcoin-open-blocked-payment-btn">Open ${providerName} payment</button>
    `;
    document.getElementById("vcoin-open-blocked-payment-btn")?.addEventListener("click", () => {
      if (isTelegramMiniApp() && typeof window.Telegram?.WebApp?.openLink === "function") {
        window.Telegram.WebApp.openLink(checkoutUrl, { try_instant_view: false });
        return;
      }
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    });
  }

  function clearPaymentFallback() {
    const fallback = document.getElementById("vcoin-payment-fallback");
    if (fallback) fallback.innerHTML = "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showPaymentStatus(message, isError = false) {
    const fallback = document.getElementById("vcoin-payment-fallback");
    if (!fallback) return;
    fallback.innerHTML = `<div class="${isError ? "vcoin-payment-fallback-message" : "vcoin-payment-status"}">${escapeHtml(message)}</div>`;
  }

  async function refreshBalanceAfterPayment() {
    if (typeof window.refreshVcoinBalance === "function") {
      await window.refreshVcoinBalance({ animate: true });
    }
    try {
      const balance = await fetchBalance();
      const balanceEl = document.getElementById("vcoin-sheet-balance-value");
      if (balanceEl) balanceEl.textContent = String(balance);
    } catch (_) {}
  }

  async function waitForFulfillment(orderRef, telegramId) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const status = await fetchOrderStatus(orderRef, telegramId);
      if (status?.status === "fulfilled" && status?.fulfillment_status === "fulfilled") return status;
      if (status?.status === "cancelled" || status?.status === "expired" || status?.fulfillment_status === "failed") return status;
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
    return await fetchOrderStatus(orderRef, telegramId);
  }

  function isOrderFulfilled(status) {
    return status?.status === "fulfilled" && status?.fulfillment_status === "fulfilled";
  }

  function isOrderTerminal(status) {
    return isOrderFulfilled(status)
      || status?.status === "cancelled"
      || status?.status === "expired"
      || status?.status === "failed"
      || status?.fulfillment_status === "failed";
  }

  function renderQuote(quote, fallbackRate) {
    const rate = Number(quote?.exchange_rate_uzs || fallbackRate || 5000);
    const coins = Number(quote?.coins || DEFAULT_PURCHASE_AMOUNT);
    const subtotal = Number(quote?.subtotal_amount || (coins * rate));
    const discount = Number(quote?.discount_amount || 0);
    const total = Number(quote?.final_amount ?? (subtotal - discount));
    return `
      <div class="vcoin-purchase-row"><span class="vcoin-muted">Rate</span><strong>1 = ${formatMoney(rate)}</strong></div>
      <div class="vcoin-purchase-row"><span class="vcoin-muted">Subtotal</span><strong>${formatMoney(subtotal)}</strong></div>
      ${discount > 0 ? `<div class="vcoin-purchase-row"><span class="vcoin-muted">Promo discount</span><strong class="vcoin-delta-plus">-${formatMoney(discount)}</strong></div>` : ""}
      <div class="vcoin-purchase-row vcoin-total-line"><span class="vcoin-muted">Total to pay</span><strong>${formatMoney(total)}</strong></div>
    `;
  }

  window.VCoinUI.openPurchaseSheet = async function () {
    if (!isVcoinEnabled()) return;
    ensureStyles();
    closeSheet();
    document.body.classList.add("reward-vcoin-open");

    const backdrop = document.createElement("div");
    backdrop.id = "vcoin-sheet-backdrop";
    backdrop.className = "vcoin-sheet-backdrop";
    backdrop.innerHTML = `
      <div class="vcoin-sheet" role="dialog" aria-modal="true">
        <div class="vcoin-sheet-handle"></div>
        <h3 class="vcoin-sheet-title">Buy V-Coin</h3>

        <div class="vcoin-purchase-box">
          <div class="vcoin-purchase-row">
            <div>
              <div style="font-weight:900;">Custom amount</div>
              <div class="vcoin-muted">Choose how many V-Coins you need.</div>
            </div>
            <input class="vcoin-amount-input" id="vcoin-buy-amount" type="number" min="1" step="1" value="${DEFAULT_PURCHASE_AMOUNT}">
          </div>
          <button type="button" class="vcoin-promo-toggle" id="vcoin-promo-toggle">Have a promo code?</button>
          <div class="vcoin-promo-line" id="vcoin-promo-line">
            <input class="vcoin-promo-input" id="vcoin-promo-code" placeholder="Promo code">
            <button type="button" class="vcoin-apply-promo-btn" id="vcoin-apply-promo">Apply</button>
          </div>
          <div id="vcoin-quote-box">${renderQuote(null, 5000)}</div>
          <div class="vcoin-payment-fallback" id="vcoin-payment-fallback"></div>
        </div>

        <div class="vcoin-history-section"></div>

        <div class="vcoin-sheet-actions">
          <button class="vcoin-buy-btn" id="vcoin-create-payment-btn">Pay with Payme</button>
          <button class="vcoin-buy-btn vcoin-click-btn" id="vcoin-create-click-payment-btn">Pay with Click</button>
          <button class="vcoin-cancel-btn" id="vcoin-back-to-wallet-btn">Back</button>
        </div>
      </div>
    `;

    backdrop.addEventListener("click", (event) => {
      if (event.target !== backdrop) return;
      if (isClickCardAttemptPending()) {
        event.preventDefault();
        event.stopPropagation();
        renderClickPendingPanel("Payment is still pending. You can resume or check again.");
        return;
      }
      closeSheet();
    });
    document.body.appendChild(backdrop);
    bindSheetDragToClose(backdrop.querySelector(".vcoin-sheet"), () => {
      if (!isClickCardAttemptPending()) return true;
      renderClickPendingPanel("Payment is still pending. You can resume or check again.");
      return false;
    });

    let appliedPromo = "";
    let currentQuote = null;
    let currentRate = 5000;
    let paymeCheckoutPending = false;
    let clickCheckoutPending = false;
    const amountInput = document.getElementById("vcoin-buy-amount");
    const quoteBox = document.getElementById("vcoin-quote-box");

    function renderClickPendingPanel(message) {
      const fallback = document.getElementById("vcoin-payment-fallback");
      if (!fallback || !activeClickCardAttempt?.order_ref) return;
      const cardLabel = activeClickCardAttempt.card_type === "humo" ? "Humo" : "Uzcard";
      fallback.innerHTML = `
        <div class="vcoin-click-choice">
          <strong>Payment is still pending</strong>
          <div class="vcoin-payment-status">${escapeHtml(message || "You can resume this Click payment or check its status.")}</div>
          <div class="vcoin-muted">Order ${escapeHtml(activeClickCardAttempt.order_ref)} · ${escapeHtml(cardLabel)}</div>
          <div class="vcoin-click-choice-row">
            <button type="button" class="vcoin-click-option" id="vcoin-click-resume-btn">Resume payment<span>Reopen the same Click payment.</span></button>
            <button type="button" class="vcoin-click-option" id="vcoin-click-check-btn">Check payment status<span>Ask the backend for confirmation.</span></button>
            <button type="button" class="vcoin-click-option" id="vcoin-click-new-attempt-btn">Start a new payment attempt<span>The old order may remain pending until expiry.</span></button>
          </div>
        </div>
      `;
      clickCheckoutPending = false;
      setClickChoiceDisabled(false);
      document.getElementById("vcoin-click-resume-btn")?.addEventListener("click", resumeActiveClickCardPayment);
      document.getElementById("vcoin-click-check-btn")?.addEventListener("click", checkActiveClickCardPayment);
      document.getElementById("vcoin-click-new-attempt-btn")?.addEventListener("click", () => {
        clearClickCardAttempt();
        clickCheckoutPending = false;
        setClickChoiceDisabled(false);
        showClickChoice();
      });
    }

    async function handleClickStatusResult(status, messageWhenPending) {
      if (isOrderFulfilled(status)) {
        await refreshBalanceAfterPayment();
        clearClickCardAttempt();
        clickCheckoutPending = false;
        setClickChoiceDisabled(false);
        showPaymentStatus("V-Coins added successfully.");
        window.setTimeout(closeSheet, 900);
        return true;
      }
      if (isOrderTerminal(status)) {
        const label = status?.status === "expired" ? "expired" : "was not completed";
        clearClickCardAttempt();
        clickCheckoutPending = false;
        setClickChoiceDisabled(false);
        showPaymentStatus(`Click payment ${label}. Please start a new attempt.`, true);
        return true;
      }
      if (activeClickCardAttempt) {
        activeClickCardAttempt.state = "pending_confirmation";
        activeClickCardAttempt.widget_open = false;
        persistClickCardAttempt();
      }
      renderClickPendingPanel(messageWhenPending || "Payment is still pending. You can resume or check again.");
      return false;
    }

    function beginClickCardPolling(telegramId, timeoutMs = 45000) {
      if (!activeClickCardAttempt?.order_ref || clickCardPollTimer) return;
      const token = ++clickCardPollToken;
      const startedAt = Date.now();
      const poll = async () => {
        if (token !== clickCardPollToken || !activeClickCardAttempt?.order_ref) return;
        try {
          const status = await fetchOrderStatus(activeClickCardAttempt.order_ref, telegramId);
          if (isOrderTerminal(status)) {
            if (await handleClickStatusResult(status, "Payment is still pending. You can resume or check again.")) return;
          } else if (!activeClickCardAttempt?.widget_open) {
            await handleClickStatusResult(status, "Payment is still pending. You can resume or check again.");
          }
        } catch (_) {
          if (!activeClickCardAttempt?.widget_open) {
            renderClickPendingPanel("Could not check payment status. You can resume or try again.");
          }
        }
        if (Date.now() - startedAt >= timeoutMs) {
          clickCardPollTimer = null;
          renderClickPendingPanel("Payment is still pending. You can resume or check again.");
          return;
        }
        clickCardPollTimer = window.setTimeout(poll, 3000);
      };
      clickCardPollTimer = window.setTimeout(poll, 2000);
    }

    function markClickWidgetClosed(telegramId) {
      if (!activeClickCardAttempt?.widget_open) return;
      activeClickCardAttempt.state = "pending_confirmation";
      activeClickCardAttempt.widget_open = false;
      persistClickCardAttempt();
      clickCheckoutPending = false;
      setClickChoiceDisabled(false);
      renderClickPendingPanel("Payment is still pending. You can resume or check again.");
      beginClickCardPolling(telegramId);
    }

    function watchClickWidgetClose(telegramId) {
      window.setTimeout(() => {
        if (!activeClickCardAttempt?.widget_open) return;
        if (!document.querySelector(".payment_app")) {
          markClickWidgetClosed(telegramId);
          return;
        }
        const observer = new MutationObserver(() => {
          if (activeClickCardAttempt?.widget_open && !document.querySelector(".payment_app")) {
            observer.disconnect();
            markClickWidgetClosed(telegramId);
          }
        });
        observer.observe(document.body, { childList: true });
      }, 250);
    }

    async function openClickCardWidgetForAttempt(telegramId) {
      if (!activeClickCardAttempt?.click_payment) throw new Error("missing_click_payment_params");
      clickCheckoutPending = true;
      setClickChoiceDisabled(true);
      activeClickCardAttempt.state = "widget_open";
      activeClickCardAttempt.widget_open = true;
      persistClickCardAttempt();
      const createPaymentRequest = await loadClickCheckoutScript();
      showPaymentStatus("Opening Click card payment...");
      createPaymentRequest(activeClickCardAttempt.click_payment, async (result) => {
        if (!activeClickCardAttempt?.order_ref) return;
        const orderRef = activeClickCardAttempt.order_ref;
        const status = Number(typeof result === "object" ? result?.status : result);
        activeClickCardAttempt.widget_open = false;
        clickCheckoutPending = false;
        setClickChoiceDisabled(false);
        if (status < 0) {
          activeClickCardAttempt.state = "pending_confirmation";
          persistClickCardAttempt();
          renderClickPendingPanel("Click payment was not completed. You can resume or start a new attempt.");
          beginClickCardPolling(telegramId, 15000);
          return;
        }
        if (status === 2) {
          activeClickCardAttempt.state = "pending_confirmation";
          persistClickCardAttempt();
          showPaymentStatus("Payment successful. Confirming V-Coin fulfillment...");
          const finalStatus = await waitForFulfillment(orderRef, telegramId);
          await handleClickStatusResult(finalStatus, "Payment received. V-Coin fulfillment is still processing.");
          return;
        }
        activeClickCardAttempt.state = "pending_confirmation";
        persistClickCardAttempt();
        renderClickPendingPanel(status === 1 ? "Payment is being processed." : "Payment created. Waiting for confirmation.");
        beginClickCardPolling(telegramId);
      });
      watchClickWidgetClose(telegramId);
      beginClickCardPolling(telegramId);
    }

    async function resumeActiveClickCardPayment() {
      if (clickCheckoutPending || !activeClickCardAttempt?.order_ref) return;
      try {
        const id = await resolveTelegramId();
        if (!id) {
          alert("Please log in with Telegram before buying V-Coins.");
          return;
        }
        const status = await fetchOrderStatus(activeClickCardAttempt.order_ref, id);
        if (await handleClickStatusResult(status, "Payment is still pending. You can resume or check again.")) return;
        await openClickCardWidgetForAttempt(id);
      } catch (error) {
        clickCheckoutPending = false;
        setClickChoiceDisabled(false);
        renderClickPendingPanel(`Could not resume Click payment: ${backendErrorMessage(error, "Please try again.")}`);
      }
    }

    async function checkActiveClickCardPayment() {
      if (!activeClickCardAttempt?.order_ref) return;
      try {
        const id = await resolveTelegramId();
        if (!id) {
          alert("Please log in with Telegram before buying V-Coins.");
          return;
        }
        showPaymentStatus("Checking Click payment status...");
        const status = await fetchOrderStatus(activeClickCardAttempt.order_ref, id);
        await handleClickStatusResult(status, "Payment is still pending. You can resume or check again.");
      } catch (error) {
        renderClickPendingPanel(`Could not check payment status: ${backendErrorMessage(error, "Please try again.")}`);
      }
    }

    async function restorePendingClickCardAttemptForUser() {
      const attempt = restoreClickCardAttempt();
      if (!attempt) return;
      try {
        const id = await resolveTelegramId();
        if (!id) {
          renderClickPendingPanel("Payment is still pending. Log in with Telegram to resume or check status.");
          return;
        }
        const status = await fetchOrderStatus(attempt.order_ref, id);
        if (!(await handleClickStatusResult(status, "Payment is still pending. You can resume or check again."))) {
          beginClickCardPolling(id, 15000);
        }
      } catch (_) {
        renderClickPendingPanel("Payment is still pending. You can resume or check again.");
      }
    }

    async function refreshQuote() {
      const coins = Math.max(1, Number(amountInput?.value || DEFAULT_PURCHASE_AMOUNT));
      if (amountInput) amountInput.value = String(coins);
      quoteBox.innerHTML = `<div class="vcoin-muted">Calculating...</div>`;
      try {
        currentQuote = await quotePurchase(coins, appliedPromo);
        quoteBox.innerHTML = renderQuote(currentQuote, currentRate);
      } catch (error) {
        appliedPromo = "";
        currentQuote = await quotePurchase(coins, null);
        quoteBox.innerHTML = `${renderQuote(currentQuote, currentRate)}<div class="vcoin-muted" style="color:#dc2626;">Promo code could not be applied.</div>`;
      }
    }

    amountInput?.addEventListener("change", refreshQuote);
    amountInput?.addEventListener("input", () => {
      window.clearTimeout(window.__vcoinQuoteTimer);
      window.__vcoinQuoteTimer = window.setTimeout(refreshQuote, 350);
    });
    document.getElementById("vcoin-promo-toggle")?.addEventListener("click", () => {
      document.getElementById("vcoin-promo-line")?.classList.add("is-visible");
      document.getElementById("vcoin-promo-toggle")?.setAttribute("hidden", "hidden");
      document.getElementById("vcoin-promo-code")?.focus();
    });
    document.getElementById("vcoin-apply-promo")?.addEventListener("click", async () => {
      appliedPromo = String(document.getElementById("vcoin-promo-code")?.value || "").trim().toUpperCase();
      await refreshQuote();
    });
    document.getElementById("vcoin-back-to-wallet-btn")?.addEventListener("click", () => {
      if (isClickCardAttemptPending()) {
        renderClickPendingPanel("Payment is still pending. You can resume or check again.");
        return;
      }
      window.VCoinUI.openBalanceSheet();
    });
    document.getElementById("vcoin-create-payment-btn")?.addEventListener("click", async () => {
      if (paymeCheckoutPending) return;
      clearPaymentFallback();
      const button = document.getElementById("vcoin-create-payment-btn");
      const useTestWindow = Boolean(window.PAYME_TEST_MODE && window.PaymeTestUI?.open);
      const paymentWindow = useTestWindow || isTelegramMiniApp() ? null : openPaymentPlaceholder("Payme");
      paymeCheckoutPending = true;
      if (button) button.disabled = true;
      try {
        const id = await resolveTelegramId();
        if (!id) {
          closePaymentWindow(paymentWindow);
          alert("Please log in with Telegram before buying V-Coins.");
          return;
        }
        const coins = Number(amountInput?.value || DEFAULT_PURCHASE_AMOUNT);
        const checkout = await createPaymeCheckout(id, coins, appliedPromo);
        if (!checkout?.checkout_url) throw new Error("missing_checkout_url");
        if (useTestWindow) {
          await window.PaymeTestUI.open({ checkout, telegramId: id });
          return;
        }
        if (!openExternalCheckoutUrl(checkout.checkout_url, paymentWindow)) {
          showPaymentFallback("Payme", checkout.checkout_url);
        }
      } catch (error) {
        closePaymentWindow(paymentWindow);
        alert(`Could not create payment: ${backendErrorMessage(error, "Please try again.")}`);
      } finally {
        paymeCheckoutPending = false;
        if (button) button.disabled = false;
      }
    });
    document.getElementById("vcoin-create-click-payment-btn")?.addEventListener("click", async () => {
      if (clickCheckoutPending) return;
      if (isClickCardAttemptPending()) {
        renderClickPendingPanel("Payment is still pending. You can resume or check again.");
        return;
      }
      clearPaymentFallback();
      const button = document.getElementById("vcoin-create-click-payment-btn");
      const useTestWindow = Boolean(window.CLICK_TEST_MODE && window.ClickTestUI?.open);
      if (useTestWindow) {
        clickCheckoutPending = true;
        if (button) button.disabled = true;
        try {
          const id = await resolveTelegramId();
          if (!id) {
            alert("Please log in with Telegram before buying V-Coins.");
            return;
          }
          const coins = Number(amountInput?.value || DEFAULT_PURCHASE_AMOUNT);
          const checkout = await createClickCheckout(id, coins, appliedPromo);
          await window.ClickTestUI.open({ checkout, telegramId: id });
        } catch (error) {
          alert(`Could not create Click payment: ${backendErrorMessage(error, "Please try again.")}`);
        } finally {
          clickCheckoutPending = false;
          if (button) button.disabled = false;
        }
        return;
      }

      showClickChoice();
    });

    function showClickChoice() {
      const fallback = document.getElementById("vcoin-payment-fallback");
      if (!fallback) return;
      fallback.innerHTML = `
        <div class="vcoin-click-choice">
          <strong>Pay with Click</strong>
          <div class="vcoin-click-choice-row">
            <button type="button" class="vcoin-click-option" id="vcoin-click-uzcard-btn">Pay by Uzcard<span>Pay with Uzcard in the browser.</span></button>
            <button type="button" class="vcoin-click-option" id="vcoin-click-humo-btn">Pay by Humo<span>Pay with Humo in the browser.</span></button>
            <button type="button" class="vcoin-click-option" id="vcoin-click-app-btn">Open Click app<span>Continue in the Click application.</span></button>
          </div>
        </div>
      `;
      document.getElementById("vcoin-click-uzcard-btn")?.addEventListener("click", () => startClickCardPayment("uzcard"));
      document.getElementById("vcoin-click-humo-btn")?.addEventListener("click", () => startClickCardPayment("humo"));
      document.getElementById("vcoin-click-app-btn")?.addEventListener("click", startClickAppPayment);
    }

    async function startClickAppPayment() {
      if (clickCheckoutPending) return;
      const paymentWindow = isTelegramMiniApp() ? null : openPaymentPlaceholder("Click");
      clickCheckoutPending = true;
      setClickChoiceDisabled(true);
      try {
        const id = await resolveTelegramId();
        if (!id) {
          closePaymentWindow(paymentWindow);
          alert("Please log in with Telegram before buying V-Coins.");
          return;
        }
        const coins = Number(amountInput?.value || DEFAULT_PURCHASE_AMOUNT);
        const checkout = await createClickCheckout(id, coins, appliedPromo);
        if (!checkout?.checkout_url) throw new Error("missing_checkout_url");
        if (!openExternalCheckoutUrl(checkout.checkout_url, paymentWindow)) {
          showPaymentFallback("Click", checkout.checkout_url);
        }
      } catch (error) {
        closePaymentWindow(paymentWindow);
        showPaymentStatus(`Could not create Click payment: ${backendErrorMessage(error, "Please try again.")}`, true);
      } finally {
        clickCheckoutPending = false;
        setClickChoiceDisabled(false);
      }
    }

    async function startClickCardPayment(cardType) {
      if (clickCheckoutPending) return;
      if (cardType !== "uzcard" && cardType !== "humo") {
        showPaymentStatus("Please choose Uzcard or Humo for browser payment.", true);
        return;
      }
      clickCheckoutPending = true;
      setClickChoiceDisabled(true);
      showPaymentStatus("Creating Click payment...");
      try {
        const id = await resolveTelegramId();
        if (!id) {
          alert("Please log in with Telegram before buying V-Coins.");
          clickCheckoutPending = false;
          setClickChoiceDisabled(false);
          return;
        }
        const coins = Number(amountInput?.value || DEFAULT_PURCHASE_AMOUNT);
        const checkout = await createClickCheckout(id, coins, appliedPromo);
        const params = checkout?.click_payment;
        if (!params?.service_id || !params?.merchant_id || !params?.transaction_param) throw new Error("missing_click_payment_params");
        const clickPayment = safeClickPaymentParams(params, cardType);
        if (!clickPayment) throw new Error("missing_click_payment_params");
        activeClickCardAttempt = {
          order_ref: checkout.order_ref,
          amount: params.amount || checkout.amount,
          card_type: cardType,
          created_at: new Date().toISOString(),
          click_payment: clickPayment,
          state: "creating_order",
          widget_open: false,
          latest_status: null
        };
        persistClickCardAttempt();
        await openClickCardWidgetForAttempt(id);
      } catch (error) {
        clickCheckoutPending = false;
        setClickChoiceDisabled(false);
        if (activeClickCardAttempt?.order_ref) {
          activeClickCardAttempt.state = "pending_confirmation";
          activeClickCardAttempt.widget_open = false;
          persistClickCardAttempt();
          renderClickPendingPanel(`Could not open Click card payment: ${backendErrorMessage(error, "Please try again.")}`);
        } else {
          showPaymentStatus(`Could not open Click card payment: ${backendErrorMessage(error, "Please try again.")}`, true);
        }
      }
    }

    function setClickChoiceDisabled(disabled) {
      document.getElementById("vcoin-click-uzcard-btn")?.toggleAttribute("disabled", disabled);
      document.getElementById("vcoin-click-humo-btn")?.toggleAttribute("disabled", disabled);
      document.getElementById("vcoin-click-app-btn")?.toggleAttribute("disabled", disabled);
      document.getElementById("vcoin-click-resume-btn")?.toggleAttribute("disabled", disabled);
      document.getElementById("vcoin-click-check-btn")?.toggleAttribute("disabled", disabled);
      document.getElementById("vcoin-click-new-attempt-btn")?.toggleAttribute("disabled", disabled);
      document.getElementById("vcoin-create-click-payment-btn")?.toggleAttribute("disabled", disabled);
    }

    try {
      const settings = await fetchSettings();
      currentRate = Number(settings?.exchange_rate_uzs || 5000);
    } catch (_) {
      currentRate = 5000;
    }
    await refreshQuote();
    await restorePendingClickCardAttemptForUser();
  };

  window.VCoinUI.openBalanceSheet = async function () {
    // V-Coin UI is intentionally retained for future restoration, but dormant while disabled.
    if (!isVcoinEnabled()) return;
    ensureStyles();
    closeSheet();
    document.body.classList.add("reward-vcoin-open");

    const backdrop = document.createElement("div");
    backdrop.id = "vcoin-sheet-backdrop";
    backdrop.className = "vcoin-sheet-backdrop";
    backdrop.innerHTML = `
      <div class="vcoin-sheet" role="dialog" aria-modal="true">
        <div class="vcoin-sheet-handle"></div>
        <h3 class="vcoin-sheet-title">V-Coin balance</h3>
        <div class="vcoin-sheet-balance">
          <div>
            <div class="vcoin-muted">You have</div>
            <div class="vcoin-sheet-balance-label">
              <img class="vcoin-icon" src="./assets/vcoin.png" alt="" aria-hidden="true">
              <strong id="vcoin-sheet-balance-value">...</strong>
            </div>
          </div>
          <div class="vcoin-muted">V-Coins</div>
        </div>

        <div class="vcoin-price-grid">
          <div class="vcoin-price-row"><span>Full Mock Test</span><strong class="vcoin-price-label">10 <img class="vcoin-icon" src="./assets/vcoin.png" alt="" aria-hidden="true"></strong></div>
          <div class="vcoin-price-row"><span>Single section</span><strong class="vcoin-price-label">3 <img class="vcoin-icon" src="./assets/vcoin.png" alt="" aria-hidden="true"></strong></div>
        </div>

        <div class="vcoin-history-section">
          <div style="font-size:15px; font-weight:900; margin-bottom:2px;">Balance history</div>
          <div class="vcoin-history-list" id="vcoin-ledger-list">${renderHistorySkeleton()}</div>
        </div>

        <div class="vcoin-sheet-actions">
          <button class="vcoin-buy-btn" id="vcoin-open-purchase-btn">Buy V-Coin</button>
          <button class="vcoin-cancel-btn" id="vcoin-close-btn">Close</button>
        </div>
      </div>
    `;

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeSheet();
    });
    document.body.appendChild(backdrop);
    bindSheetDragToClose(backdrop.querySelector(".vcoin-sheet"));

    document.getElementById("vcoin-close-btn").onclick = closeSheet;
    document.getElementById("vcoin-open-purchase-btn").onclick = window.VCoinUI.openPurchaseSheet;

    try {
      const [balance, ledger] = await Promise.all([fetchBalance(), fetchLedger()]);
      const balanceEl = document.getElementById("vcoin-sheet-balance-value");
      const ledgerEl = document.getElementById("vcoin-ledger-list");
      if (balanceEl) balanceEl.textContent = String(balance);
      if (ledgerEl) ledgerEl.innerHTML = renderLedger(ledger);
    } catch (error) {
      const ledgerEl = document.getElementById("vcoin-ledger-list");
      if (ledgerEl) ledgerEl.innerHTML = `<div class="vcoin-muted" style="padding:10px 0;">Could not load balance details.</div>`;
    }
  };

  function parseApiError(error) {
    try {
      const parsed = JSON.parse(error?.message || "{}");
      return parsed?.detail || parsed;
    } catch (_) {
      return {};
    }
  }

  function formatUzsSpaces(amount) {
    const value = Math.max(0, Math.floor(Number(amount || 0)));
    return `${value.toLocaleString("ru-RU").replace(/\u00a0/g, " ")} UZS`;
  }

  function uzsFromCoins(coins) {
    const amount = window.UzsBalance?.convertVCoinsToUzs?.(Number(coins || 0));
    return Number.isFinite(Number(amount)) ? Number(amount) : Number(coins || 0) * 5000;
  }

  function showWalletInsufficient({ required, balance, contentType, referenceId, serviceName }) {
    ensureStyles();
    closeSheet();
    document.body.classList.add("reward-vcoin-open");

    const requiredCoins = Math.max(0, Number(required || COSTS[contentType] || 0));
    const balanceCoins = Math.max(0, Number(balance || 0));
    const missingCoins = Math.max(0, requiredCoins - balanceCoins);
    const requiredUzs = uzsFromCoins(requiredCoins);
    const balanceUzs = uzsFromCoins(balanceCoins);
    const missingUzs = uzsFromCoins(missingCoins);

    const backdrop = document.createElement("div");
    backdrop.id = "vcoin-sheet-backdrop";
    backdrop.className = "vcoin-sheet-backdrop";
    backdrop.innerHTML = `
      <div class="vcoin-sheet uzs-wallet-sheet" role="dialog" aria-modal="true" aria-labelledby="uzs-insufficient-title">
        <div class="vcoin-sheet-handle"></div>
        <h3 class="vcoin-sheet-title" id="uzs-insufficient-title">Hisobda mablag' yetarli emas</h3>
        <p class="vcoin-muted" style="font-size:15px; line-height:1.45; margin:10px 0 14px;">
          Ushbu testni boshlash uchun hisobingizda yetarli mablag' mavjud emas.
        </p>
        <div style="display:grid; gap:10px; margin:2px 0 16px;">
          <div class="vcoin-price-row" style="min-height:44px; padding:8px 0;">
            <span>Test narxi</span>
            <strong>${formatUzsSpaces(requiredUzs)}</strong>
          </div>
          <div class="vcoin-price-row" style="min-height:44px; padding:8px 0;">
            <span>Hisobingizda</span>
            <strong>${formatUzsSpaces(balanceUzs)}</strong>
          </div>
          <div class="vcoin-price-row" style="min-height:44px; padding:8px 0; border-bottom:0;">
            <span>Yetishmayotgan summa</span>
            <strong>${formatUzsSpaces(missingUzs)}</strong>
          </div>
        </div>
        <div class="vcoin-sheet-actions uzs-wallet-actions" style="margin-top:auto;">
          <button class="vcoin-buy-btn" id="uzs-top-up-missing-btn">Hisobni to'ldirish</button>
          <button class="vcoin-cancel-btn" id="vcoin-close-btn">Bekor qilish</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    bindSheetDragToClose(backdrop.querySelector(".vcoin-sheet"));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeSheet();
    });
    document.getElementById("vcoin-close-btn").onclick = closeSheet;
    document.getElementById("uzs-top-up-missing-btn").onclick = () => {
      closeSheet();
      window.VPayGate?.start?.({
        product: "wallet_topup",
        amount_uzs: missingUzs,
        origin: contentType || "paid_content",
        service: {
          content_type: contentType || "",
          reference_id: String(referenceId ?? ""),
          service_name: serviceName || "",
        },
      });
    };
  }

  window.VCoinUI.showInsufficient = function ({ required, balance, serviceName }) {
    if (!isVcoinEnabled()) return;
    ensureStyles();
    closeSheet();
    document.body.classList.add("reward-vcoin-open");

    const backdrop = document.createElement("div");
    backdrop.id = "vcoin-sheet-backdrop";
    backdrop.className = "vcoin-sheet-backdrop";
    backdrop.innerHTML = `
      <div class="vcoin-sheet" role="dialog" aria-modal="true">
        <div class="vcoin-sheet-handle"></div>
        <h3 class="vcoin-sheet-title">Not enough V-Coins</h3>
        <p class="vcoin-muted" style="line-height:1.45;">
          ${serviceName} costs ${required} V-Coins. Your balance is ${balance} V-Coins.
        </p>
        <div class="vcoin-sheet-actions">
          <button class="vcoin-buy-btn" id="vcoin-open-wallet-buy">Buy V-Coin</button>
          <button class="vcoin-cancel-btn" id="vcoin-close-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    bindSheetDragToClose(backdrop.querySelector(".vcoin-sheet"));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeSheet();
    });
    document.getElementById("vcoin-close-btn").onclick = closeSheet;
    document.getElementById("vcoin-open-wallet-buy").onclick = window.VCoinUI.openPurchaseSheet;
  };

  window.UzsBalance = window.UzsBalance || {};
  window.UzsBalance.formatUzsSpaces = formatUzsSpaces;
  window.UzsBalance.showInsufficientFunds = showWalletInsufficient;

  window.UzsBalance.openBalanceSheet = async function () {
    ensureStyles();
    closeSheet();
    document.body.classList.add("reward-vcoin-open");

    const backdrop = document.createElement("div");
    backdrop.id = "vcoin-sheet-backdrop";
    backdrop.className = "vcoin-sheet-backdrop";
    backdrop.innerHTML = `
      <div class="vcoin-sheet uzs-wallet-sheet" role="dialog" aria-modal="true">
        <div class="vcoin-sheet-handle"></div>
        <h3 class="vcoin-sheet-title">Wallet</h3>
        <div class="vcoin-sheet-balance">
          <div>
            <div class="vcoin-muted">Available balance</div>
            <div class="vcoin-sheet-balance-label">
              ${window.UzsBalance?.walletIconMarkup?.("wallet-balance-icon") || ""}
              <strong id="uzs-sheet-balance-value">...</strong>
            </div>
          </div>
          <div class="vcoin-muted uzs-wallet-currency">UZS</div>
        </div>

        <div class="vcoin-history-section">
          <div class="uzs-wallet-history-title">Balance history</div>
          <div class="vcoin-history-list" id="uzs-ledger-list">${renderHistorySkeleton()}</div>
        </div>

        <div class="vcoin-sheet-actions uzs-wallet-actions">
          <button class="vcoin-buy-btn" id="uzs-open-payment-gateway-btn">Open V-PayGate</button>
          <button class="vcoin-cancel-btn" id="vcoin-close-btn">Close</button>
        </div>
      </div>
    `;

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeSheet();
    });
    document.body.appendChild(backdrop);
    bindSheetDragToClose(backdrop.querySelector(".vcoin-sheet"));

    document.getElementById("vcoin-close-btn").onclick = closeSheet;
    document.getElementById("uzs-open-payment-gateway-btn").onclick = () => {
      closeSheet();
      window.UzsBalance.showGatewayPlaceholder();
    };

    try {
      const [balance, ledger] = await Promise.all([fetchBalance(), fetchLedger()]);
      const balanceEl = document.getElementById("uzs-sheet-balance-value");
      const ledgerEl = document.getElementById("uzs-ledger-list");
      const uzsBalance = window.UzsBalance?.convertVCoinsToUzs?.(balance) || 0;
      if (balanceEl) balanceEl.textContent = window.UzsBalance?.formatUzs?.(uzsBalance) || "0 UZS";
      if (ledgerEl) ledgerEl.innerHTML = renderUzsLedger(ledger);
    } catch (error) {
      const ledgerEl = document.getElementById("uzs-ledger-list");
      if (ledgerEl) ledgerEl.innerHTML = `<div class="vcoin-muted" style="padding:10px 0;">Could not load balance details.</div>`;
    }
  };

  window.VCoinUI.ensureAccess = async function ({ contentType, referenceId, serviceName }) {
    const id = await resolveTelegramId();
    if (!id) {
      if (window.AppViewMode?.isWebsite?.()) {
        alert(isVcoinEnabled() ? "Please log in with Telegram to use V-Coin paid content." : "Iltimos, avval Telegram orqali kiring.");
      } else {
        alert("Open this mini app inside Telegram.");
      }
      return false;
    }

    try {
      const result = await apiPost("/vcoins/spend", {
        telegram_id: id,
        content_type: contentType,
        reference_id: String(referenceId)
      });
      if (typeof window.refreshVcoinBalance === "function") {
        window.refreshVcoinBalance({ animate: true });
      }
      return !!result?.ok;
    } catch (error) {
      const detail = parseApiError(error);
      if (detail?.error === "insufficient_vcoins") {
        const payload = {
          required: Number(detail.required || COSTS[contentType] || 0),
          balance: Number(detail.balance || 0),
          contentType,
          referenceId,
          serviceName
        };
        if (isVcoinEnabled()) {
          window.VCoinUI.showInsufficient(payload);
        } else {
          showWalletInsufficient(payload);
        }
        return false;
      }
      alert(isVcoinEnabled() ? "Could not check V-Coin balance. Please try again." : "Balansni tekshirib bo'lmadi. Iltimos, qayta urinib ko'ring.");
      return false;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("click", (event) => {
      if (!isVcoinEnabled()) return;
      const opener = event.target.closest("#screen-home .home-balance, [data-vcoin-open='1']");
      if (!opener) return;
      event.preventDefault();
      window.VCoinUI.openBalanceSheet();
    });
  });
})();
