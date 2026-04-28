window.VCoinUI = window.VCoinUI || {};

(function () {
  const COSTS = {
    full_mock: 10,
    separate_block: 3
  };

  function telegramId() {
    return typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
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
        z-index: 9998;
        background: rgba(17,24,39,0.28);
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }

      .vcoin-sheet {
        width: min(100%, 420px);
        max-height: 78vh;
        overflow-y: auto;
        box-sizing: border-box;
        border-radius: 24px 24px 0 0;
        background: #ffffff;
        color: #17212B;
        padding: 16px;
        box-shadow: 0 -14px 40px rgba(20,40,60,0.20);
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      }

      .vcoin-sheet-handle {
        width: 42px;
        height: 4px;
        border-radius: 999px;
        background: rgba(20,40,60,0.18);
        margin: 0 auto 14px;
      }

      .vcoin-sheet-title {
        margin: 0;
        font-size: 20px;
        font-weight: 900;
      }

      .vcoin-sheet-balance {
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

      .vcoin-price-grid {
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
        padding: 10px 0;
        border-bottom: 1px solid rgba(20,40,60,0.08);
        text-align: left;
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
      }

      .vcoin-sheet button {
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

  function renderLedger(items) {
    if (!items.length) {
      return `<div class="vcoin-muted" style="padding:10px 0;">No balance actions yet.</div>`;
    }

    return items.map((item) => {
      const delta = Number(item?.delta || 0);
      const sign = delta > 0 ? "+" : "";
      const klass = delta >= 0 ? "vcoin-delta-plus" : "vcoin-delta-minus";
      return `
        <div class="vcoin-ledger-row">
          <div>
            <div style="font-weight:800;">${formatReason(item?.reason)}</div>
            <div class="vcoin-muted">Balance after: ${Number(item?.balance_after || 0)} V-Coins</div>
          </div>
          <div class="${klass}">${sign}${delta}</div>
        </div>
      `;
    }).join("");
  }

  async function fetchBalance() {
    const id = telegramId();
    if (!id) return 0;
    const data = await apiGet(`/vcoins/balance?telegram_id=${id}`);
    return Number(data?.v_coins || 0);
  }

  async function fetchLedger() {
    const id = telegramId();
    if (!id) return [];
    const data = await apiGet(`/vcoins/ledger?telegram_id=${id}&limit=4`);
    return Array.isArray(data?.items) ? data.items : [];
  }

  window.VCoinUI.openBuyVcoinBot = async function () {
    try {
      const data = await apiGet("/vcoins/buy-link");
      const url = String(data?.url || "").trim();
      if (!url) {
        alert("Buy V-Coin bot link is not configured yet.");
        return;
      }

      const tg = window.Telegram?.WebApp;
      if (tg && typeof tg.openTelegramLink === "function") {
        tg.openTelegramLink(url);
        return;
      }

      window.location.href = url;
    } catch (error) {
      console.error("Failed to open V-Coin bot link", error);
      alert("Could not open Buy V-Coin bot. Please try again.");
    }
  };

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
            <strong id="vcoin-sheet-balance-value">...</strong>
          </div>
          <div class="vcoin-muted">V-Coins</div>
        </div>

        <div class="vcoin-price-grid">
          <div class="vcoin-price-row"><span>Full Mock Test</span><strong>10 V-Coins</strong></div>
          <div class="vcoin-price-row"><span>Single section</span><strong>3 V-Coins</strong></div>
        </div>

        <div style="margin-top:14px;">
          <div style="font-size:15px; font-weight:900; margin-bottom:2px;">Last balance actions</div>
          <div id="vcoin-ledger-list"><div class="vcoin-muted" style="padding:10px 0;">Loading...</div></div>
        </div>

        <div class="vcoin-sheet-actions">
          <button class="vcoin-buy-btn" id="vcoin-buy-btn">Buy V-Coin</button>
          <button class="vcoin-cancel-btn" id="vcoin-close-btn">Close</button>
        </div>
      </div>
    `;

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeSheet();
    });
    document.body.appendChild(backdrop);

    document.getElementById("vcoin-close-btn").onclick = closeSheet;
    document.getElementById("vcoin-buy-btn").onclick = window.VCoinUI.openBuyVcoinBot;

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
          <button class="vcoin-buy-btn" id="vcoin-buy-btn">Buy V-Coin</button>
          <button class="vcoin-cancel-btn" id="vcoin-close-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeSheet();
    });
    document.getElementById("vcoin-close-btn").onclick = closeSheet;
    document.getElementById("vcoin-buy-btn").onclick = window.VCoinUI.openBuyVcoinBot;
  };

  window.VCoinUI.ensureAccess = async function ({ contentType, referenceId, serviceName }) {
    const id = telegramId();
    if (!id) {
      alert("Open this mini app inside Telegram.");
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
