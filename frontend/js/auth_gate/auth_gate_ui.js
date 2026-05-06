window.VoxiAuthGateUI = window.VoxiAuthGateUI || {};

(function () {
  const MODAL_ID = "voxi-auth-gate";

  function close() {
    document.getElementById(MODAL_ID)?.remove();
  }

  function render() {
    return `
      <div class="auth-gate-backdrop" data-auth-gate-close="1">
        <section class="auth-gate-card" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title">
          <button class="auth-gate-close" type="button" data-auth-gate-close="1" aria-label="Close">x</button>
          <div class="auth-gate-mark" aria-hidden="true">i</div>
          <h2 id="auth-gate-title">Sign in required</h2>
          <p>Please sign in or log in to continue using this part of Voxi.</p>
          <div class="auth-gate-actions">
            <button class="auth-gate-primary" type="button" data-auth-gate-signup="1">Sign in</button>
            <button class="auth-gate-secondary" type="button" data-auth-gate-login="1">Log in</button>
          </div>
        </section>
      </div>
    `;
  }

  window.VoxiAuthGateUI.show = function ({ onSignin, onLogin, onClose } = {}) {
    close();

    const host = document.createElement("div");
    host.id = MODAL_ID;
    host.innerHTML = render();
    document.body.appendChild(host);

    host.addEventListener("click", (event) => {
      if (event.target.closest("[data-auth-gate-signup='1']")) {
        close();
        onSignin?.();
        return;
      }

      if (event.target.closest("[data-auth-gate-login='1']")) {
        close();
        onLogin?.();
        return;
      }

      if (
        event.target.matches("[data-auth-gate-close='1']") ||
        event.target.closest(".auth-gate-close")
      ) {
        close();
        onClose?.();
      }
    });
  };

  window.VoxiAuthGateUI.hide = close;
})();
