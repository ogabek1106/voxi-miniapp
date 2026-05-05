window.WebsiteTelegramLogin = window.WebsiteTelegramLogin || {};

(function () {
  let scriptPromise = null;

  function loadTelegramAuthScript() {
    if (window.Telegram?.Login?.auth) return Promise.resolve();
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("telegram_script_failed"));
      document.head.appendChild(script);
    });

    return scriptPromise;
  }

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

  window.WebsiteTelegramLogin.attachButton = function (button, onSuccess) {
    if (!button) return;

    button.addEventListener("click", async () => {
      try {
        const config = await window.WebsiteAuthApi.telegramConfig();
        await loadTelegramAuthScript();

        window.Telegram.Login.auth(
          { bot_id: config.bot_id, request_access: "write" },
          async (payload) => {
            if (!payload) return;

            try {
              const result = await window.WebsiteAuthApi.telegramLogin(payload);
              window.WebsiteAuthState.setUser(result.user);
              onSuccess?.(result.user);
            } catch (error) {
              console.error("Telegram website login failed", error);
              alert(getTelegramLoginErrorMessage(error));
            }
          }
        );
      } catch (error) {
        console.error("Telegram auth setup failed", error);
        alert(getTelegramLoginErrorMessage(error));
      }
    });
  };

  window.WebsiteTelegramLogin.render = function (container, onSuccess) {
    if (!container) return;
    container.innerHTML = `
      <button class="auth-social-btn" type="button" aria-label="Continue with Telegram">
        <img src="assets/auth/telegramicon.png" class="auth-social-icon" alt="">
      </button>
    `;
    window.WebsiteTelegramLogin.attachButton(container.querySelector("button"), onSuccess);
  };
})();
