window.VoxiAuthGate = window.VoxiAuthGate || {};

(function () {
  let pendingAction = null;
  let unsubscribe = null;

  function runPendingIfAuthenticated() {
    if (!pendingAction || !window.VoxiAuthGateState?.isAuthenticated?.()) return;

    const action = pendingAction;
    pendingAction = null;
    window.VoxiAuthGateUI?.hide?.();
    action.onSuccess?.();
  }

  function ensureSubscription() {
    if (unsubscribe || !window.VoxiAuthGateState?.onAuthChange) return;
    unsubscribe = window.VoxiAuthGateState.onAuthChange(runPendingIfAuthenticated);
  }

  function openExistingAuthModal(mode) {
    ensureSubscription();

    if (window.WebsiteAuthModal?.open) {
      window.WebsiteAuthModal.open(mode);
      return;
    }

    console.warn("Website auth modal is not available.");
  }

  window.VoxiAuthGate.requireAuth = function (options = {}) {
    if (window.VoxiAuthGateState?.isAuthenticated?.()) {
      return true;
    }

    pendingAction = {
      feature: options.feature || "",
      onSuccess: typeof options.onSuccess === "function" ? options.onSuccess : null,
    };

    ensureSubscription();
    window.VoxiAuthGateUI?.show?.({
      onSignin: () => openExistingAuthModal("signup"),
      onLogin: () => openExistingAuthModal("login"),
      onClose: () => {
        pendingAction = null;
      },
    });

    return false;
  };

  window.VoxiAuthGate.continuePending = runPendingIfAuthenticated;
})();
