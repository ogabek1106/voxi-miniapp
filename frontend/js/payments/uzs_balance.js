window.UzsBalance = window.UzsBalance || {};

(function () {
  const VCOIN_TO_UZS_RATE = 5000;

  function normalizeVCoins(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }

  function rawVcoinBalance(me) {
    return normalizeVCoins(
      me?.v_coins ?? me?.v_coin_balance ?? me?.vcoin_balance ?? me?.v_coin ?? me?.balance ?? 0
    );
  }

  window.UzsBalance.convertVCoinsToUzs = function (vcoins) {
    return normalizeVCoins(vcoins) * VCOIN_TO_UZS_RATE;
  };

  window.UzsBalance.formatUzs = function (amount) {
    const parsed = Number(amount);
    const normalized = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    return `${normalized.toLocaleString("en-US")} UZS`;
  };

  window.UzsBalance.fromUser = function (me) {
    // TODO: Replace this display-only conversion with the real UZS wallet/order balance source.
    return window.UzsBalance.convertVCoinsToUzs(rawVcoinBalance(me));
  };

  window.UzsBalance.formatFromUser = function (me) {
    return window.UzsBalance.formatUzs(window.UzsBalance.fromUser(me));
  };

  window.UzsBalance.walletIconMarkup = function (className = "wallet-balance-icon") {
    return `
      <svg class="${className}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4.5 7.5h13.8c1.2 0 2.2 1 2.2 2.2v7.1c0 1.2-1 2.2-2.2 2.2H5.7A2.7 2.7 0 0 1 3 16.3V7.7c0-1.5 1.2-2.7 2.7-2.7h11.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M16.8 13.2h3.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        <path d="M6 7.5 16.8 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      </svg>
    `;
  };

  window.UzsBalance.showGatewayPlaceholder = function () {
    if (window.VPayGate?.start) {
      window.VPayGate.start({
        product: "wallet_topup",
        amount_uzs: 50000,
        origin: "wallet",
      });
      return;
    }
    alert("V-PayGate is not available yet");
  };
})();
