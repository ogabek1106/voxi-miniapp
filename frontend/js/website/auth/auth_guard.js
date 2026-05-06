window.WebsiteAuthGuard = window.WebsiteAuthGuard || {};

(function () {
  window.WebsiteAuthGuard.requireAuth = function (options = {}) {
    if (window.VoxiAuthGate?.requireAuth) {
      return window.VoxiAuthGate.requireAuth(options);
    }

    if (window.AppViewMode?.isMiniApp?.()) return true;
    if (window.WebsiteAuthState?.isAuthenticated?.()) return true;
    window.WebsiteAuthModal?.open("login");
    return false;
  };
})();
