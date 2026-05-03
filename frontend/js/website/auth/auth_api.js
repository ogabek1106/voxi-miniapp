window.WebsiteAuthApi = window.WebsiteAuthApi || {};

(function () {
  window.WebsiteAuthApi.me = function () {
    return window.ApiClient.get("/auth/me");
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

  window.WebsiteAuthApi.logout = function () {
    return window.ApiClient.post("/auth/logout", {});
  };
})();
