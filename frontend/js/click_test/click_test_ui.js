window.ClickTestUI = window.ClickTestUI || {};

(function () {
  let session = null;

  const SCENARIOS = [
    ["full_success", "Successful Prepare + Complete"],
    ["duplicate_prepare", "Duplicate Prepare"],
    ["duplicate_complete", "Duplicate Complete"],
    ["invalid_signature", "Invalid signature"],
    ["wrong_amount", "Wrong amount"],
    ["missing_order", "Order not found"],
    ["cancelled_complete", "Cancelled payment"],
    ["failed_complete", "Failed payment"],
    ["complete_without_prepare", "Complete without Prepare"],
    ["wrong_action_prepare", "Wrong Prepare action"],
    ["wrong_action_complete", "Wrong Complete action"],
    ["wrong_service", "Wrong service ID"]
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pretty(value) {
    if (value === null || value === undefined) return "";
    try {
      return escapeHtml(JSON.stringify(value, null, 2));
    } catch (_) {
      return escapeHtml(String(value));
    }
  }

  function last(list) {
    return list.length ? list[list.length - 1] : null;
  }

  function formatMoney(amount) {
    return `${Number(amount || 0).toLocaleString("uz-UZ")} UZS`;
  }

  function statusClass() {
    if (!session) return "";
    if (/error|failed|cancel|invalid|wrong|not found/i.test(session.message || "")) return " is-error";
    if (/success|fulfilled|prepared|completed/i.test(session.message || "")) return " is-success";
    return "";
  }

  function payloadFor(action) {
    return {
      telegram_id: Number(session.telegramId),
      action,
      order_ref: session.orderRef,
      amount_tiyin: Number(session.amountTiyin),
      click_trans_id: Number(session.clickTransId),
      click_paydoc_id: Number(session.clickPaydocId)
    };
  }

  function finalStep(response) {
    const steps = Array.isArray(response?.steps) ? response.steps : [];
    return steps.length ? steps[steps.length - 1] : null;
  }

  function finalClickResponse(response) {
    return finalStep(response)?.response || response;
  }

  function render() {
    if (!session) return;
    const root = document.getElementById("click-test-root");
    if (!root) return;
    const lastRequest = last(session.requests);
    const lastResponse = last(session.responses);
    root.innerHTML = `
      <div class="click-test-backdrop">
        <section class="click-test-window" role="dialog" aria-modal="true">
          <header class="click-test-header">
            <div>
              <div class="click-test-badge">TEST MODE</div>
              <h2>Artificial Click checkout</h2>
            </div>
            <button type="button" class="click-test-icon-btn" data-click-action="close">Close</button>
          </header>

          <div class="click-test-warning">
            Temporary fake Click window. Do not enter card, SMS, phone, CVV, or banking data. This calls only the protected backend simulator.
          </div>

          <div class="click-test-grid">
            <div><span>Order</span><strong>${escapeHtml(session.orderRef)}</strong></div>
            <div><span>Amount</span><strong>${formatMoney(session.amount)}</strong></div>
            <div><span>Click trans ID</span><strong>${session.clickTransId}</strong></div>
            <div><span>Click paydoc ID</span><strong>${session.clickPaydocId}</strong></div>
            <div><span>Prepare ID</span><strong>${escapeHtml(session.merchantPrepareId || "-")}</strong></div>
            <div><span>Confirm ID</span><strong>${escapeHtml(session.merchantConfirmId || "-")}</strong></div>
            <div><span>Balance before</span><strong>${session.balanceBefore}</strong></div>
            <div><span>Balance after</span><strong>${session.balanceAfter ?? "-"}</strong></div>
          </div>

          <label class="click-test-label">
            Simulation case
            <select id="click-test-scenario">
              ${SCENARIOS.map(([value, label]) => `<option value="${escapeHtml(value)}" ${session.scenario === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>

          <div class="click-test-actions">
            <button data-click-action="prepare">Prepare</button>
            <button data-click-action="complete">Complete success</button>
            <button data-click-action="run_scenario">Run selected case</button>
            <button data-click-action="reset">Reset test flow</button>
          </div>

          <div class="click-test-message${statusClass()}">${escapeHtml(session.message)}</div>

          <div class="click-test-panels">
            <div>
              <h3>Last safe request</h3>
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
    document.querySelectorAll("[data-click-action]").forEach((button) => {
      if (button.dataset.clickAction !== "close") button.disabled = session.busy;
    });
  }

  async function updateBalance(field) {
    const balance = await window.ClickTestAPI.getBalance(session.telegramId);
    session[field] = balance;
    if (typeof window.refreshVcoinBalance === "function") {
      await window.refreshVcoinBalance({ animate: true });
    }
    return balance;
  }

  function applyResponse(action, response) {
    const clickResponse = finalClickResponse(response);
    if (clickResponse?.merchant_prepare_id) {
      session.merchantPrepareId = clickResponse.merchant_prepare_id;
    }
    if (clickResponse?.merchant_confirm_id) {
      session.merchantConfirmId = clickResponse.merchant_confirm_id;
    }
    if (clickResponse?.error === 0) {
      session.state = action;
      session.message = `${action} completed successfully.`;
    } else if (clickResponse?.error !== undefined) {
      session.message = `Click error ${clickResponse.error}: ${clickResponse.error_note || "Click error"}`;
    } else {
      session.message = `${action} completed.`;
    }
  }

  async function send(action, options = {}) {
    if (!session || session.busy) return;
    setBusy(true);
    const body = payloadFor(action);
    session.requests.push(body);
    render();
    try {
      const response = await window.ClickTestAPI.simulateAction(body);
      session.responses.push(response);
      applyResponse(action, response);
      const clickResponse = finalClickResponse(response);
      if (clickResponse?.error === 0 && ["complete", "full_success", "duplicate_complete"].includes(action)) {
        await updateBalance(options.duplicate ? "duplicateBalanceAfter" : "balanceAfter");
        if (options.duplicate) {
          session.message = `Duplicate Complete returned success. Balance stayed ${session.duplicateBalanceAfter}.`;
        } else {
          session.message = `Payment completed. Balance is now ${session.balanceAfter}.`;
        }
      }
    } catch (error) {
      const response = error?.data || { error: error?.message || String(error) };
      session.responses.push(response);
      session.message = "Request failed locally. Backend test mode may be disabled or admin access denied.";
    } finally {
      setBusy(false);
      render();
    }
  }

  async function runScenario() {
    if (!session) return;
    const scenario = session.scenario;
    await send(scenario, { duplicate: scenario === "duplicate_complete" });
  }

  function close() {
    document.getElementById("click-test-root")?.remove();
    document.body.classList.remove("click-test-open");
    session = null;
  }

  async function reset() {
    if (!session) return;
    const checkout = {
      order_ref: session.orderRef,
      amount: session.amount,
      checkout_url: session.checkoutUrl,
      expires_at: session.expiresAt
    };
    const telegramId = session.telegramId;
    const balanceBefore = await window.ClickTestAPI.getBalance(telegramId);
    session = window.ClickTestState.createSession({ checkout, telegramId, balanceBefore });
    render();
  }

  async function open({ checkout, telegramId }) {
    if (!window.CLICK_TEST_MODE) return false;
    close();
    const root = document.createElement("div");
    root.id = "click-test-root";
    document.body.appendChild(root);
    document.body.classList.add("click-test-open");
    const balanceBefore = await window.ClickTestAPI.getBalance(telegramId);
    session = window.ClickTestState.createSession({ checkout, telegramId, balanceBefore });
    render();
    return true;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-click-action]");
    if (!button || !session) return;
    event.preventDefault();
    const action = button.dataset.clickAction;
    if (action === "close") return close();
    if (action === "reset") return reset();
    if (action === "run_scenario") return runScenario();
    return send(action);
  });

  document.addEventListener("change", (event) => {
    if (!session || event.target.id !== "click-test-scenario") return;
    session.scenario = event.target.value;
    session.message = `Scenario selected: ${event.target.options[event.target.selectedIndex]?.text || session.scenario}`;
    render();
  });

  window.ClickTestUI = {
    open,
    close
  };
})();
