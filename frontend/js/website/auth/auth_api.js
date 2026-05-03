window.WebsiteAuthApi = window.WebsiteAuthApi || {};

(function () {
  window.WebsiteAuthApi.me = function () {
    return window.ApiClient.get("/auth/me");
  };

  window.WebsiteAuthApi.updateMe = function (payload) {
    return window.ApiClient.post("/auth/me", payload);
  };

  window.WebsiteAuthApi.signup = function (payload) {
    return window.ApiClient.post("/auth/email/signup", payload);
  };

  window.WebsiteAuthApi.login = function (payload) {
    return window.ApiClient.post("/auth/email/login", payload);
  };

  window.WebsiteAuthApi.telegramLogin = function (payload) {
    return window.ApiClient.post("/auth/telegram/login", payload);
  };

  window.WebsiteAuthApi.googleConfig = function () {
    return window.ApiClient.get("/auth/google/config");
  };

  window.WebsiteAuthApi.googleLogin = function (idToken) {
    return window.ApiClient.post("/auth/google/login", { id_token: idToken });
  };

  window.WebsiteAuthApi.logout = function () {
    return window.ApiClient.post("/auth/logout", {});
  };
})();
