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
        <a href="#">About Us</a>
        <a href="#">Contact Us</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
      </nav>
      <div class="website-footer-contact">
        <span>Telegram: @voxi_aibot</span>
        <span>Email: support@ebaiacademy.com</span>
      </div>
    `;

    app.appendChild(footer);
  };
})();
