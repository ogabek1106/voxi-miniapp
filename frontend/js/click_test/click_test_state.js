window.ClickTestState = window.ClickTestState || {};

(function () {
  const QUERY_FLAG = "click_test";
  const STORAGE_FLAG = "voxi:click:test-mode";

  function readQueryFlag() {
    try {
      return new URLSearchParams(window.location.search).get(QUERY_FLAG) === "1";
    } catch (_) {
      return false;
    }
  }

  function readStorageFlag() {
    try {
      return window.localStorage?.getItem(STORAGE_FLAG) === "1";
    } catch (_) {
      return false;
    }
  }

  // TEMPORARY TEST FLAG. Backend CLICK_TEST_MODE must also be enabled.
  window.CLICK_TEST_MODE = window.CLICK_TEST_MODE === true || readQueryFlag() || readStorageFlag();

  function randomInt(min, max) {
    const span = max - min + 1;
    const bytes = new Uint32Array(1);
    window.crypto?.getRandomValues?.(bytes);
    const raw = bytes[0] || Math.floor(Math.random() * span);
    return min + (raw % span);
  }

  function amountToTiyin(checkout) {
    if (checkout?.amount_tiyin !== undefined) return Number(checkout.amount_tiyin || 0);
    return Math.round(Number(checkout?.amount || 0) * 100);
  }

  function createSession({ checkout, telegramId, balanceBefore }) {
    return {
      orderRef: checkout.order_ref,
      amount: String(checkout.amount || ""),
      amountTiyin: amountToTiyin(checkout),
      checkoutUrl: checkout.checkout_url,
      expiresAt: checkout.expires_at,
      telegramId: Number(telegramId || 0),
      balanceBefore: Number(balanceBefore || 0),
      balanceAfter: null,
      duplicateBalanceAfter: null,
      clickTransId: randomInt(100000000, 999999999),
      clickPaydocId: randomInt(100000000, 999999999),
      merchantPrepareId: null,
      merchantConfirmId: null,
      state: "new",
      scenario: "full_success",
      message: "Ready for fake Click test flow.",
      busy: false,
      requests: [],
      responses: []
    };
  }

  window.ClickTestState = {
    createSession
  };
})();
