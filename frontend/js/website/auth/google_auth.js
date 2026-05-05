window.WebsiteGoogleAuth = window.WebsiteGoogleAuth || {};

(function () {
  let scriptPromise = null;
  let initialized = false;
  let activeOnSuccess = null;

  function loadGoogleScript() {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("google_script_failed"));
      document.head.appendChild(script);
    });

    return scriptPromise;
  }

  function messageFromError(error) {
    const detail = error?.data?.detail;
    if (detail === "google_login_not_configured") {
      return "Google login is not configured on the server. Please contact admin.";
    }
    if (detail === "google_email_not_verified") {
      return "Google email is not verified.";
    }
    if (detail === "invalid_google_token") {
      return "Google login could not be verified. Please try again.";
    }
    return "Google login failed. Please try again.";
  }

  window.WebsiteGoogleAuth.render = async function (container, onSuccess) {
    if (!container) return;
    container.innerHTML = "";

    try {
      await ensureInitialized(onSuccess);

      window.google.accounts.id.renderButton(container, {
        type: "icon",
        theme: "outline",
        size: "large",
        shape: "circle",
      });
    } catch (error) {
      console.error("Google auth setup failed", error);
      container.innerHTML = `
        <button class="website-auth-provider-icon" type="button" disabled aria-label="Continue with Google">
          <img src="assets/auth/googleicon.png" alt="">
        </button>
      `;
    }
  };

  async function ensureInitialized(onSuccess) {
    activeOnSuccess = onSuccess;
    if (initialized) return;

    const config = await window.WebsiteAuthApi.googleConfig();
    await loadGoogleScript();

    window.google.accounts.id.initialize({
      client_id: config.client_id,
      auto_select: false,
      use_fedcm_for_prompt: true,
      callback: async (response) => {
        try {
          const result = await window.WebsiteAuthApi.googleLogin(response.credential);
          window.WebsiteAuthState.setUser(result.user);
          activeOnSuccess?.(result.user);
        } catch (error) {
          console.error("Google website login failed", error);
          alert(messageFromError(error));
        }
      },
    });
    initialized = true;
  }

  window.WebsiteGoogleAuth.attachButton = function (button, onSuccess) {
    if (!button) return;

    button.addEventListener("click", async () => {
      try {
        await ensureInitialized(onSuccess);
        window.google.accounts.id.prompt((notification) => {
          if (
            notification.isNotDisplayed?.() ||
            notification.isSkippedMoment?.()
          ) {
            console.warn("Google login prompt was not displayed", notification.getNotDisplayedReason?.() || notification.getSkippedReason?.());
          }
        });
      } catch (error) {
        console.error("Google auth setup failed", error);
        alert(messageFromError(error));
      }
    });
  };
})();
