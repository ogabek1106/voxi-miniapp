window.WebsiteTelegramLogin = window.WebsiteTelegramLogin || {};

(function () {
  const BOT_USERNAME = "voxi_aibot";

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
        alert("Telegram login failed. Please try again.");
      } finally {
        delete window[callbackName];
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "14");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    container.appendChild(script);
  };
})();
