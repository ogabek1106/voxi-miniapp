window.VCoinUI = window.VCoinUI || {};

(function () {
  const COSTS = {
    full_mock: 10,
    separate_block: 3
  };
  const BUY_VCOIN_BOT_URL = "https://t.me/voxi_aibot?start=buy_vcoin";

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
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 14px;
        padding-top: 12px;
        padding-bottom: calc(4px + env(safe-area-inset-bottom, 0px));
        background: #ffffff;
        z-index: 2;
      }

      .vcoin-history-section {
        min-height: 0;
        overflow: hidden;
        margin-top: 14px;
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

      .vcoin-cancel-btn {
        background: #eef2f7 !important;
        color: #17212B !important;
      }
    `;
    document.head.appendChild(style);
  }

  function closeSheet() {
    document.getElementById("vcoin-sheet-backdrop")?.remove();
  }

  function bindSheetDragToClose(sheet) {
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

  window.VCoinUI.openBalanceSheet = async function () {
    ensureStyles();
    closeSheet();

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
          <a class="vcoin-buy-btn" href="${BUY_VCOIN_BOT_URL}" target="_blank" rel="noopener">Buy V-Coin</a>
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

  window.VCoinUI.showInsufficient = function ({ required, balance, serviceName }) {
    ensureStyles();
    closeSheet();

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
          <a class="vcoin-buy-btn" href="${BUY_VCOIN_BOT_URL}" target="_blank" rel="noopener">Buy V-Coin</a>
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
  };

  window.VCoinUI.ensureAccess = async function ({ contentType, referenceId, serviceName }) {
    const id = await resolveTelegramId();
    if (!id) {
      if (window.AppViewMode?.isWebsite?.()) {
        alert("Please log in with Telegram to use V-Coin paid content.");
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
        window.refreshVcoinBalance({ animate: false });
      }
      return !!result?.ok;
    } catch (error) {
      const detail = parseApiError(error);
      if (detail?.error === "insufficient_vcoins") {
        window.VCoinUI.showInsufficient({
          required: Number(detail.required || COSTS[contentType] || 0),
          balance: Number(detail.balance || 0),
          serviceName
        });
        return false;
      }
      alert("Could not check V-Coin balance. Please try again.");
      return false;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    ensureStyles();
    document.addEventListener("click", (event) => {
      const opener = event.target.closest("#screen-home .home-balance, [data-vcoin-open='1']");
      if (!opener) return;
      event.preventDefault();
      window.VCoinUI.openBalanceSheet();
    });
  });
})();
