window.WebsiteFooter = window.WebsiteFooter || {};

(function () {
  function isWebsite() {
    return window.AppViewMode?.isWebsite ? window.AppViewMode.isWebsite() : !window.Telegram?.WebApp;
  }

  window.WebsiteFooter.mount = function () {
    if (!isWebsite() || document.getElementById("website-footer")) return;

    const app = document.querySelector(".app");
    if (!app) return;

    const footer = document.createElement("footer");
    footer.id = "website-footer";
    footer.className = "website-footer";
    footer.innerHTML = `
      <div class="website-footer-brand">
        <strong>EBAI Academy</strong>
        <span>Practice IELTS in real conditions</span>
      </div>
      <nav class="website-footer-links" aria-label="Website footer">
        <button type="button" data-website-info="about">About Us</button>
        <button type="button" data-website-info="contact">Contact Us</button>
        <button type="button" data-website-info="privacy">Privacy Policy</button>
        <button type="button" data-website-info="terms">Terms of Service</button>
      </nav>
      <div class="website-footer-contact">
        <a href="https://t.me/IELTSforeverybody" target="_blank" rel="noopener">Telegram channel</a>
        <a href="https://t.me/voxi_aibot" target="_blank" rel="noopener">Telegram Bot</a>
      </div>
    `;

    app.appendChild(footer);

    footer.querySelectorAll("[data-website-info]").forEach((button) => {
      button.addEventListener("click", () => {
        window.WebsiteInfoModal?.open(button.dataset.websiteInfo);
      });
    });
  };
})();
