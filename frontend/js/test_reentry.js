window.TestReentry = window.TestReentry || {};

(function () {
  function styles() {
    if (document.getElementById("test-reentry-styles")) return;
    const style = document.createElement("style");
    style.id = "test-reentry-styles";
    style.textContent = `
      .test-reentry-screen {
        min-height: calc(100dvh - 110px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 14px;
        box-sizing: border-box;
        background: var(--bg-color, #f3f7fb);
      }
      .test-reentry-card {
        width: min(100%, 560px);
        background: rgba(255, 255, 255, 0.94);
        border-radius: 28px;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
        padding: 28px;
        box-sizing: border-box;
        text-align: left;
      }
      .test-reentry-card h2 {
        margin: 0 0 10px;
        font-size: clamp(26px, 4vw, 36px);
        line-height: 1.05;
        color: #17212b;
        font-weight: 900;
      }
      .test-reentry-card p {
        margin: 0;
        color: #667085;
        font-size: 16px;
        line-height: 1.55;
        font-weight: 700;
      }
      .test-reentry-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 22px;
      }
      .test-reentry-btn {
        min-height: 54px;
        border: 0;
        border-radius: 18px;
        padding: 12px 16px;
        font-weight: 900;
        cursor: pointer;
        background: #edf3f8;
        color: #17212b;
      }
      .test-reentry-btn.primary {
        background: #00baff;
        color: #fff;
        box-shadow: 0 12px 28px rgba(0, 186, 255, 0.25);
      }
      .test-reentry-btn.danger {
        background: #17212b;
        color: #fff;
      }
      @media (max-width: 540px) {
        .test-reentry-actions { grid-template-columns: 1fr; }
        .test-reentry-card { padding: 24px 20px; }
      }
    `;
    document.head.appendChild(style);
  }

  function mount(container, html) {
    styles();
    const target = container || document.getElementById("content");
    if (!target) return;
    target.innerHTML = html;
  }

  window.TestReentry.showCompleted = function ({ container, onSeeResult, onRetake } = {}) {
    mount(container, `
      <div class="test-reentry-screen">
        <div class="test-reentry-card">
          <h2>You already completed this test</h2>
          <p>Your answers have already been submitted. You can view your result, or retake the test from the beginning.</p>
          <div class="test-reentry-actions">
            <button type="button" class="test-reentry-btn primary" id="test-reentry-result-btn">See result</button>
            <button type="button" class="test-reentry-btn" id="test-reentry-retake-btn">Retake the test</button>
          </div>
        </div>
      </div>
    `);
    document.getElementById("test-reentry-result-btn")?.addEventListener("click", () => onSeeResult?.());
    document.getElementById("test-reentry-retake-btn")?.addEventListener("click", () => {
      window.TestReentry.showRetakeConfirm({
        container,
        onRetake,
        onCancel: () => window.TestReentry.showCompleted({ container, onSeeResult, onRetake })
      });
    });
  };

  window.TestReentry.showRetakeConfirm = function ({ container, onRetake, onCancel } = {}) {
    mount(container, `
      <div class="test-reentry-screen">
        <div class="test-reentry-card">
          <h2>Retake this test?</h2>
          <p>Retaking will start a new attempt from the beginning. Your previous result will stay saved, but you will be charged the same amount of V-Coins again.</p>
          <div class="test-reentry-actions">
            <button type="button" class="test-reentry-btn" id="test-reentry-cancel-btn">Cancel</button>
            <button type="button" class="test-reentry-btn danger" id="test-reentry-pay-btn">Retake and pay V-Coins</button>
          </div>
        </div>
      </div>
    `);
    document.getElementById("test-reentry-cancel-btn")?.addEventListener("click", () => onCancel?.());
    document.getElementById("test-reentry-pay-btn")?.addEventListener("click", () => onRetake?.());
  };

  window.TestReentry.retakeReference = function ({ mode, section, mockId }) {
    return `${mode || "single_block"}:${section || "test"}:${mockId}:retake:${Date.now()}`;
  };
})();
