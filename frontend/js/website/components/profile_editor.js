window.WebsiteProfileEditor = window.WebsiteProfileEditor || {};

(function () {
  function escapeHtml(value) {
    if (window.ProfileUI?.escapeHtml) return window.ProfileUI.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function render(user) {
    return `
      <div class="website-profile-editor-card" role="dialog" aria-modal="true" aria-label="Edit profile">
        <button class="website-profile-editor-close" data-profile-editor-close="1" aria-label="Close">x</button>
        <h2>Edit profile</h2>
        <form id="website-profile-editor-form" class="website-profile-editor-form">
          <label>
            <span>Name</span>
            <input id="website-edit-name" name="name" autocomplete="given-name" value="${escapeHtml(user?.name || "")}">
          </label>
          <label>
            <span>Surname</span>
            <input id="website-edit-surname" name="surname" autocomplete="family-name" value="${escapeHtml(user?.surname || "")}">
          </label>
          <div class="website-profile-editor-actions">
            <button class="website-profile-editor-save" type="submit">Save</button>
            <button class="website-profile-editor-cancel" type="button" data-profile-editor-close="1">Cancel</button>
          </div>
        </form>
      </div>
    `;
  }

  function close() {
    document.getElementById("website-profile-editor-backdrop")?.remove();
  }

  async function save() {
    const name = document.getElementById("website-edit-name")?.value.trim() || "";
    const surname = document.getElementById("website-edit-surname")?.value.trim() || "";
    const result = await window.WebsiteAuthApi.updateMe({ name, surname });
    window.WebsiteAuthState.setUser(result.user);
    window.WebsiteHeader?.render?.();
    close();
    window.WebsiteProfileSheet?.open?.();
  }

  window.WebsiteProfileEditor.open = function (user) {
    if (!window.WebsiteAuthState?.isAuthenticated?.()) {
      window.WebsiteAuthModal?.open("login");
      return;
    }

    close();
    const backdrop = document.createElement("div");
    backdrop.id = "website-profile-editor-backdrop";
    backdrop.className = "website-profile-editor-backdrop";
    backdrop.innerHTML = render(user || window.WebsiteAuthState.getUser?.() || {});
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop || event.target.closest("[data-profile-editor-close='1']")) {
        close();
      }
    });

    document.getElementById("website-profile-editor-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await save();
      } catch (error) {
        console.error("Website profile update failed", error);
        alert("Could not save profile.");
      }
    });
  };

  window.WebsiteProfileEditor.close = close;
})();
