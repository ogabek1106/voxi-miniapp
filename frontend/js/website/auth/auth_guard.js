window.WebsiteAuthGuard = window.WebsiteAuthGuard || {};

(function () {
  window.WebsiteAuthGuard.requireAuth = function () {
    if (window.AppViewMode?.isMiniApp?.()) return true;
    if (window.WebsiteAuthState?.isAuthenticated?.()) return true;
    window.WebsiteAuthModal?.open("login");
    return false;
  };
})();
