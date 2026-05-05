window.WebsiteAuthModal = window.WebsiteAuthModal || {};

(function () {
  function close() {
    document.getElementById("website-auth-backdrop")?.remove();
  }

  function template(mode) {
    const isSignup = mode === "signup";
    return `
      <div class="website-auth-card" role="dialog" aria-modal="true">
        <button class="website-auth-close" data-auth-close="1" aria-label="Close">x</button>
        <h2>${isSignup ? "Create account" : "Log in"}</h2>
        <form id="website-auth-form" class="website-auth-form">
          ${isSignup ? `
            <input id="auth-name" name="name" autocomplete="given-name" placeholder="Name" required>
            <input id="auth-surname" name="surname" autocomplete="family-name" placeholder="Surname">
          ` : ""}
          <input id="auth-email" name="email" type="email" autocomplete="email" placeholder="Email" required>
          <input id="auth-password" name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" placeholder="Password" required>
          ${isSignup ? `<input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" placeholder="Confirm password" required>` : ""}
          <button class="website-auth-primary" type="submit">${isSignup ? "Create account" : "Log in"}</button>
        </form>
        <div class="website-auth-divider"><span>OR</span></div>
        <div class="auth-social-row">
          <button id="googleLoginBtn" class="auth-social-btn" type="button" aria-label="Continue with Google">
            <img src="assets/auth/googleicon.png" class="auth-social-icon" alt="">
          </button>
          <button id="telegramLoginBtn" class="auth-social-btn" type="button" aria-label="Continue with Telegram">
            <img src="assets/auth/telegramicon.png" class="auth-social-icon" alt="">
          </button>
        </div>
        ${!isSignup ? `
          <button class="website-auth-switch" type="button" data-auth-switch="signup">
            New here? Create an account
          </button>
        ` : ""}
      </div>
    `;
  }

  async function submit(mode) {
    const isSignup = mode === "signup";
    const email = document.getElementById("auth-email")?.value.trim();
    const password = document.getElementById("auth-password")?.value || "";
    const confirm = document.getElementById("auth-confirm")?.value || "";

    if (isSignup && password !== confirm) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const result = isSignup
        ? await window.WebsiteAuthApi.signup({
            name: document.getElementById("auth-name")?.value.trim(),
            surname: document.getElementById("auth-surname")?.value.trim(),
            email,
            password
          })
        : await window.WebsiteAuthApi.login({ email, password });

      window.WebsiteAuthState.setUser(result.user);
      close();
    } catch (error) {
      console.error("Website auth failed", error);
      alert(isSignup ? "Could not create account." : "Could not log in.");
    }
  }

  window.WebsiteAuthModal.open = function (mode = "login") {
    close();
    const backdrop = document.createElement("div");
    backdrop.id = "website-auth-backdrop";
    backdrop.className = "website-auth-backdrop";
    backdrop.innerHTML = template(mode);
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop || event.target.closest("[data-auth-close='1']")) {
        close();
      }
    });

    document.getElementById("website-auth-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      submit(mode);
    });

    backdrop.querySelector("[data-auth-switch='signup']")?.addEventListener("click", () => {
      window.WebsiteAuthModal.open("signup");
    });

    window.WebsiteGoogleAuth.attachButton(
      document.getElementById("googleLoginBtn"),
      () => close()
    );

    window.WebsiteTelegramLogin.attachButton(
      document.getElementById("telegramLoginBtn"),
      () => close()
    );
  };

  window.WebsiteAuthModal.close = close;
})();
