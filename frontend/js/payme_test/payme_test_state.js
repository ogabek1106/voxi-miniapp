window.PaymeTestState = window.PaymeTestState || {};

(function () {
  const QUERY_FLAG = "payme_test";
  const STORAGE_FLAG = "voxi:payme:test-mode";

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

  // TEMPORARY TEST FLAG. Disable before using real Payme production credentials.
  window.PAYME_TEST_MODE = window.PAYME_TEST_MODE === true || readQueryFlag() || readStorageFlag();

  function nowMs() {
    return Date.now();
  }

  function generatePaymeTransactionId() {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = new Uint8Array(24);
    window.crypto?.getRandomValues?.(bytes);
    if (!bytes.some(Boolean)) {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  }

  function createSession({ checkout, telegramId, balanceBefore }) {
    return {
      orderRef: checkout.order_ref,
      amountTiyin: Number(checkout.amount_tiyin || 0),
      checkoutUrl: checkout.checkout_url,
      expiresAt: checkout.expires_at,
      telegramId: Number(telegramId || 0),
      balanceBefore: Number(balanceBefore || 0),
      balanceAfter: null,
      duplicateBalanceAfter: null,
      transactionId: generatePaymeTransactionId(),
      paymeTimeMs: nowMs(),
      merchantTransaction: null,
      state: "new",
      scenario: "normal",
      message: "Ready for fake Payme test flow.",
      busy: false,
      requests: [],
      responses: []
    };
  }

  window.PaymeTestState = {
    createSession,
    nowMs
  };
})();
