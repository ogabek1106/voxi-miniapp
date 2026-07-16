const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function runBrowserScript(relativePath, context) {
  const code = fs.readFileSync(path.join(root, relativePath), "utf8");
  vm.runInNewContext(code, context, { filename: relativePath });
}

function createContext(overrides = {}) {
  const listeners = {};
  const context = {
    console,
    performance: { now: () => 0 },
    window: {},
    document: {
      addEventListener: (name, callback) => {
        listeners[name] = callback;
      },
      getElementById: () => null,
      querySelector: () => null,
      createElement: () => ({ style: {}, set textContent(value) { this._text = value; } }),
      head: { appendChild: () => {} },
      body: { classList: { add: () => {}, remove: () => {} } }
    },
    ...overrides
  };
  context.window = {
    console,
    performance: context.performance,
    document: context.document,
    addEventListener: () => {},
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    requestAnimationFrame: (callback) => {
      callback(2000);
      return 1;
    },
    cancelAnimationFrame: () => {},
    matchMedia: () => ({ matches: false }),
    AppConfig: {
      isVcoinEnabled: () => false
    },
    ...overrides.window
  };
  context.globalThis = context;
  return { context, listeners };
}

function testUzsFormatterAndConversion() {
  const { context } = createContext();
  runBrowserScript("js/payments/uzs_balance.js", context);

  assert.equal(context.window.UzsBalance.convertVCoinsToUzs(0), 0);
  assert.equal(context.window.UzsBalance.convertVCoinsToUzs(1), 5000);
  assert.equal(context.window.UzsBalance.convertVCoinsToUzs(1050), 5250000);
  assert.equal(context.window.UzsBalance.formatUzs(0), "0 UZS");
  assert.equal(context.window.UzsBalance.formatUzs(5000), "5,000 UZS");
  assert.equal(context.window.UzsBalance.formatUzs(5250000), "5,250,000 UZS");
}

function testCountUpReachesFinalAmount() {
  const target = { textContent: "" };
  const { context } = createContext();
  runBrowserScript("js/shared/ui/count_up.js", context);

  context.window.CountUpUI.animateInteger({
    elements: [target],
    fromValue: 0,
    toValue: 1250000,
    formatter: (value) => `${value} UZS`
  });

  assert.equal(target.textContent, "1250000 UZS");
}

function testCountUpReducedMotionSkipsAnimation() {
  let frameCalled = false;
  const target = { textContent: "" };
  const { context } = createContext({
    window: {
      requestAnimationFrame: () => {
        frameCalled = true;
        return 1;
      },
      matchMedia: () => ({ matches: true })
    }
  });
  runBrowserScript("js/shared/ui/count_up.js", context);

  context.window.CountUpUI.animateInteger({
    elements: [target],
    fromValue: 0,
    toValue: 10000,
    formatter: (value) => `${value} UZS`
  });

  assert.equal(target.textContent, "10000 UZS");
  assert.equal(frameCalled, false);
}

function testVcoinModalGuardWhenDisabled() {
  let created = false;
  const { context } = createContext({
    window: {
      AppConfig: { isVcoinEnabled: () => false }
    },
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      createElement: () => {
        created = true;
        return {};
      },
      head: { appendChild: () => {} },
      body: { classList: { add: () => {}, remove: () => {} } }
    }
  });

  runBrowserScript("js/vcoins_ui.js", context);
  context.window.VCoinUI.openBalanceSheet();
  assert.equal(created, false);
}

async function testUzsBalanceSheetShowsConvertedHistory() {
  const ids = {};
  let appended = null;
  const { context } = createContext({
    apiGet: async (url) => {
      if (url.startsWith("/vcoins/balance")) return { v_coins: 3 };
      if (url.startsWith("/vcoins/ledger")) {
        return {
          items: [
            { reason: "payment_confirmed", delta: 3, created_at: "2026-07-16T10:00:00Z" },
            { reason: "separate_block_spend", delta: -1, created_at: "2026-07-16T11:00:00Z" }
          ]
        };
      }
      return {};
    },
    document: {
      addEventListener: () => {},
      getElementById: (id) => ids[id] || null,
      querySelector: () => null,
      createElement: (tag) => {
        const element = {
          tagName: tag.toUpperCase(),
          style: {},
          classList: { add: () => {}, remove: () => {} },
          addEventListener: () => {},
          querySelector: () => null,
          remove: () => {},
          set innerHTML(value) { this._innerHTML = value; },
          get innerHTML() { return this._innerHTML || ""; }
        };
        if (tag === "style") ids["vcoin-ui-styles"] = element;
        return element;
      },
      head: { appendChild: () => {} },
      body: {
        classList: { add: () => {}, remove: () => {} },
        appendChild: (element) => {
          appended = element;
          ids["uzs-sheet-balance-value"] = { textContent: "" };
          ids["uzs-ledger-list"] = { innerHTML: "" };
          ids["vcoin-close-btn"] = {};
          ids["uzs-open-payment-gateway-btn"] = {};
        }
      }
    },
    window: {
      AppConfig: { isVcoinEnabled: () => false },
      getTelegramId: () => 1001
    }
  });

  runBrowserScript("js/payments/uzs_balance.js", context);
  runBrowserScript("js/vcoins_ui.js", context);

  await context.window.UzsBalance.openBalanceSheet();

  assert.ok(appended.innerHTML.includes("Wallet"));
  assert.equal(ids["uzs-sheet-balance-value"].textContent, "15,000 UZS");
  assert.ok(ids["uzs-ledger-list"].innerHTML.includes("+15,000 UZS"));
  assert.ok(ids["uzs-ledger-list"].innerHTML.includes("-5,000 UZS"));
  assert.ok(!ids["uzs-ledger-list"].innerHTML.includes("V-Coin"));
}

testUzsFormatterAndConversion();
testCountUpReachesFinalAmount();
testCountUpReducedMotionSkipsAnimation();
testVcoinModalGuardWhenDisabled();
testUzsBalanceSheetShowsConvertedHistory().then(() => {
  console.log("payment_ui tests passed");
});
