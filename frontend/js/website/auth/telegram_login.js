window.WebsiteTelegramLogin = window.WebsiteTelegramLogin || {};

(function () {
  const BOT_USERNAME = "voxi_aibot";

  function getTelegramLoginErrorMessage(error) {
    const detail = error?.data?.detail;
    if (detail === "telegram_login_not_configured") {
      return "Telegram login is not configured on the server. Please contact admin.";
    }
    if (detail === "telegram_login_expired") {
      return "Telegram login expired. Please try again.";
    }
    if (detail === "invalid_telegram_login") {
      return "Telegram login could not be verified. Please try again.";
    }
    return "Telegram login failed. Please try again.";
  }

  window.WebsiteTelegramLogin.render = function (container, onSuccess) {
    if (!container) return;
    container.innerHTML = "";

    const callbackName = `onTelegramWebsiteAuth_${Date.now()}`;
    window[callbackName] = async function (payload) {
      try {
        const result = await window.WebsiteAuthApi.telegramLogin(payload);
        window.WebsiteAuthState.setUser(result.user);
        onSuccess?.(result.user);
      } catch (error) {
        console.error("Telegram website login failed", error);
        alert(getTelegramLoginErrorMessage(error));
      } finally {
        delete window[callbackName];
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "small");
    script.setAttribute("data-radius", "999");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    container.appendChild(script);
  };
})();
