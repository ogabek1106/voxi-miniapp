(function () {
  async function loadPremiereCard() {
    if (!window.PremiereApi || !window.PremiereUi) return;
    const home = document.getElementById("screen-home");
    if (!home) return;
    try {
      const telegramId = typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
      let user = window.WebsiteAuthState?.getUser?.() || null;
      if (!user && window.WebsiteAuthState?.load) {
        user = await window.WebsiteAuthState.load();
      }
      const data = await window.PremiereApi.active({
        telegram_id: telegramId || user?.telegram_id || null,
        user_id: user?.id || null,
        email: user?.email || null,
      });
      window.PremiereUi.render(data?.premiere || null);
      window.PremiereUi.checkStoredPaymentStatus?.();
    } catch (error) {
      console.warn("Premiere card failed to load:", error);
      window.PremiereUi.render(null);
    }
  }

  window.PremiereLoader = { load: loadPremiereCard };
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(loadPremiereCard, 600);
  });
})();
