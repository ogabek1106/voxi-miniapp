(function () {
  async function loadPremiereCard() {
    if (!window.PremiereApi || !window.PremiereUi) return;
    const home = document.getElementById("screen-home");
    if (!home) return;
    try {
      const telegramId = typeof window.getTelegramId === "function" ? window.getTelegramId() : null;
      const data = await window.PremiereApi.active(telegramId);
      window.PremiereUi.render(data?.premiere || null);
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
