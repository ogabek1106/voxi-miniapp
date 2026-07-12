window.PaymeTestUI = window.PaymeTestUI || {};

(function () {
  let session = null;

  const SCENARIOS = [
    ["normal", "Normal successful payment"],
    ["wrong_amount", "Wrong amount"],
    ["missing_order", "Order not found"],
    ["invalid_auth", "Invalid Basic Auth"],
    ["unknown_method", "Unknown method"],
    ["duplicate_create", "Duplicate CreateTransaction"],
    ["duplicate_perform", "Duplicate PerformTransaction"],
    ["cancel_before_perform", "Cancel before perform"],
    ["cancel_after_fulfilled", "Cancel after fulfilled"],
    ["insufficient_balance", "Insufficient card balance"],
    ["expired_order", "Expired order simulation unavailable"]
  ];

  function formatMoneyFromTiyin(amountTiyin) {
    return `${(Number(amountTiyin || 0) / 100).toLocaleString("uz-UZ")} UZS`;
  }

  function pretty(value) {
    if (value === null || value === undefined) return "";
    try {
      return escapeHtml(JSON.stringify(value, null, 2));
    } catch (_) {
      return escapeHtml(String(value));
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function last(list) {
    return list.length ? list[list.length - 1] : null;
  }

  function statusClass() {
    if (!session) return "";
    if (/error|failed|rejected|unavailable/i.test(session.message || "")) return " is-error";
    if (/success|fulfilled|performed|created|allowed/i.test(session.message || "")) return " is-success";
    return "";
  }

  function payloadFor(action) {
    return {
      telegram_id: Number(session.telegramId),
      action,
      order_ref: session.orderRef,
      amount_tiyin: Number(session.amountTiyin),
      transaction_id: session.transactionId,
      payme_time_ms: Number(session.paymeTimeMs),
      reason: 1
    };
  }

  function finalStep(response) {
    const steps = Array.isArray(response?.steps) ? response.steps : [];
    return steps.length ? steps[steps.length - 1] : null;
  }

  function finalPaymeResponse(response) {
    return finalStep(response)?.response || response;
  }

  function render() {
    if (!session) return;
    const root = document.getElementById("payme-test-root");
    if (!root) return;
    const lastRequest = last(session.requests);
    const lastResponse = last(session.responses);
    root.innerHTML = `
      <div class="payme-test-backdrop">
        <section class="payme-test-window" role="dialog" aria-modal="true">
          <header class="payme-test-header">
            <div>
              <div class="payme-test-badge">TEST MODE</div>
              <h2>Artificial Payme checkout</h2>
            </div>
            <button type="button" class="payme-test-icon-btn" data-payme-action="close">Close</button>
          </header>

          <div class="payme-test-warning">
            Temporary fake Payme window. Do not enter card, SMS, phone, CVV, or banking data. This calls only the protected backend simulator.
          </div>

          <div class="payme-test-grid">
            <div><span>Order</span><strong>${escapeHtml(session.orderRef)}</strong></div>
            <div><span>Amount</span><strong>${formatMoneyFromTiyin(session.amountTiyin)}</strong></div>
            <div><span>Tiyin</span><strong>${session.amountTiyin}</strong></div>
            <div><span>Payme ID</span><strong>${escapeHtml(session.transactionId)}</strong></div>
            <div><span>State</span><strong>${escapeHtml(session.state)}</strong></div>
            <div><span>Merchant tx</span><strong>${escapeHtml(session.merchantTransaction || "-")}</strong></div>
            <div><span>Balance before</span><strong>${session.balanceBefore}</strong></div>
            <div><span>Balance after</span><strong>${session.balanceAfter ?? "-"}</strong></div>
          </div>

          <label class="payme-test-label">
            Simulation case
            <select id="payme-test-scenario">
              ${SCENARIOS.map(([value, label]) => `<option value="${escapeHtml(value)}" ${session.scenario === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>

          <div class="payme-test-actions">
            <button data-payme-action="check">Check order</button>
            <button data-payme-action="create">Create transaction</button>
            <button data-payme-action="perform">Perform successful payment</button>
            <button data-payme-action="cancel">Cancel before payment</button>
            <button data-payme-action="check_transaction">Check transaction</button>
            <button data-payme-action="get_statement">Get statement</button>
            <button data-payme-action="reset">Reset test flow</button>
          </div>

          <div class="payme-test-message${statusClass()}">${escapeHtml(session.message)}</div>

          <div class="payme-test-panels">
            <div>
              <h3>Last request</h3>
              <pre>${pretty(lastRequest)}</pre>
            </div>
            <div>
              <h3>Last backend response</h3>
              <pre>${pretty(lastResponse)}</pre>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function setBusy(value) {
    session.busy = Boolean(value);
    document.querySelectorAll("[data-payme-action]").forEach((button) => {
      if (button.dataset.paymeAction !== "close") button.disabled = session.busy;
    });
  }

  async function updateBalance(field) {
    const balance = await window.PaymeTestAPI.getBalance(session.telegramId);
    session[field] = balance;
    if (typeof window.refreshVcoinBalance === "function") {
      await window.refreshVcoinBalance({ animate: true });
    }
    return balance;
  }

  function applyResponse(action, response) {
    const paymeResponse = finalPaymeResponse(response);
    if (paymeResponse?.result?.transaction) {
      session.merchantTransaction = paymeResponse.result.transaction;
    }
    if (paymeResponse?.result?.state !== undefined) {
      session.state = String(paymeResponse.result.state);
    }
    if (response?.message) {
      session.message = response.message;
    } else if (paymeResponse?.result?.allow) {
      session.message = "CheckPerformTransaction allowed.";
    } else if (paymeResponse?.error) {
      session.message = `Backend error ${paymeResponse.error.code}: ${paymeResponse.error.message?.en || "Payme error"}`;
    } else if (action === "get_statement") {
      session.message = "Statement received.";
    } else {
      session.message = `${action} completed.`;
    }
  }

  async function send(action, options = {}) {
    if (!session || session.busy) return;
    if (session.scenario === "expired_order") {
      session.message = "Expired-order simulation is unavailable from the frontend without unsafe database manipulation.";
      render();
      return;
    }
    setBusy(true);
    const body = payloadFor(action);
    session.requests.push(body);
    render();
    try {
      const response = await window.PaymeTestAPI.simulateAction(body);
      session.responses.push(response);
      applyResponse(action, response);
      const paymeResponse = finalPaymeResponse(response);
      if (action === "perform" && paymeResponse?.result?.state === 2) {
        await updateBalance(options.duplicate ? "duplicateBalanceAfter" : "balanceAfter");
        if (options.duplicate) {
          session.message = `Duplicate PerformTransaction returned state 2. Balance stayed ${session.duplicateBalanceAfter}.`;
        } else {
          session.message = `Payment performed. Balance is now ${session.balanceAfter}.`;
        }
      }
    } catch (error) {
      const response = error?.data || { error: error?.message || String(error) };
      session.responses.push(response);
      session.message = "Request failed locally. See backend response.";
    } finally {
      setBusy(false);
      render();
    }
  }

  async function runScenario() {
    if (!session) return;
    const scenario = session.scenario;
    if (scenario === "invalid_auth") return send("invalid_auth");
    if (scenario === "unknown_method") return send("unknown_method");
    if (scenario === "duplicate_create") {
      await send("create");
      return send("create");
    }
    if (scenario === "duplicate_perform") {
      await send("create");
      await send("perform");
      return send("perform", { duplicate: true });
    }
    if (scenario === "cancel_before_perform") {
      await send("create");
      return send("cancel");
    }
    if (scenario === "cancel_after_fulfilled") {
      await send("create");
      await send("perform");
      return send("cancel");
    }
    if (scenario === "insufficient_balance") {
      await send("insufficient_balance");
      session.message = "Payment failed: insufficient card balance. PerformTransaction was not sent; V-Coins were not granted.";
      return render();
    }
    if (scenario === "wrong_amount") return send("wrong_amount");
    if (scenario === "missing_order") return send("missing_order");
    await send("check");
    await send("create");
    return send("perform");
  }

  function close() {
    document.getElementById("payme-test-root")?.remove();
    document.body.classList.remove("payme-test-open");
    session = null;
  }

  async function reset() {
    if (!session) return;
    const checkout = {
      order_ref: session.orderRef,
      amount_tiyin: session.amountTiyin,
      checkout_url: session.checkoutUrl,
      expires_at: session.expiresAt
    };
    const telegramId = session.telegramId;
    const balanceBefore = await window.PaymeTestAPI.getBalance(telegramId);
    session = window.PaymeTestState.createSession({ checkout, telegramId, balanceBefore });
    render();
  }

  async function open({ checkout, telegramId }) {
    if (!window.PAYME_TEST_MODE) return false;
    close();
    const root = document.createElement("div");
    root.id = "payme-test-root";
    document.body.appendChild(root);
    document.body.classList.add("payme-test-open");
    const balanceBefore = await window.PaymeTestAPI.getBalance(telegramId);
    session = window.PaymeTestState.createSession({ checkout, telegramId, balanceBefore });
    render();
    return true;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-payme-action]");
    if (!button || !session) return;
    event.preventDefault();
    const action = button.dataset.paymeAction;
    if (action === "close") return close();
    if (action === "reset") return reset();
    if (action === "perform" && session.scenario === "duplicate_perform") return runScenario();
    if (action === "create" && session.scenario === "duplicate_create") return runScenario();
    if (action === "cancel" && ["cancel_before_perform", "cancel_after_fulfilled"].includes(session.scenario)) return runScenario();
    if (action === "check" && ["invalid_auth", "unknown_method", "wrong_amount", "missing_order", "insufficient_balance"].includes(session.scenario)) return runScenario();
    return send(action);
  });

  document.addEventListener("change", (event) => {
    if (!session || event.target.id !== "payme-test-scenario") return;
    session.scenario = event.target.value;
    session.message = `Scenario selected: ${event.target.options[event.target.selectedIndex]?.text || session.scenario}`;
    render();
  });

  window.PaymeTestUI = {
    open,
    close
  };
})();
