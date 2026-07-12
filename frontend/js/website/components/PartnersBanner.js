window.PartnersBanner = window.PartnersBanner || {};

(function () {
  const PARTNERS = [
    {
      id: "yandex-browser",
      name: "Yandex Browser",
      logoText: "YB",
      description: "Fast and secure browser for studying, Telegram Mini Apps, and everyday browsing.",
      ctaLabel: "Download",
      referralUrl: "https://browser.yandex.com/"
    }
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function openPartnerUrl(url) {
    const tg = window.Telegram?.WebApp;

    if (tg && typeof tg.openLink === "function") {
      tg.openLink(url, { try_instant_view: false });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function renderPartner(partner) {
    return `
      <article class="partners-banner-partner" data-partner-id="${escapeHtml(partner.id)}">
        <div class="partners-banner-logo" aria-hidden="true">${escapeHtml(partner.logoText)}</div>
        <div class="partners-banner-partner-copy">
          <h4 class="partners-banner-partner-name">${escapeHtml(partner.name)}</h4>
          <p class="partners-banner-description">${escapeHtml(partner.description)}</p>
        </div>
        <div class="partners-banner-qr-slot" aria-hidden="true"></div>
        <button class="partners-banner-button" type="button" data-partner-url="${escapeHtml(partner.referralUrl)}">
          ${escapeHtml(partner.ctaLabel)}
        </button>
      </article>
    `;
  }

  window.PartnersBanner.mount = function (target, partners = PARTNERS) {
    const container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container || container.dataset.partnersBannerMounted === "1") return;

    container.dataset.partnersBannerMounted = "1";
    container.innerHTML = `
      <section class="partners-banner" aria-labelledby="partners-banner-title">
        <div class="partners-banner-head">
          <span class="partners-banner-icon" aria-hidden="true">🤝</span>
          <div class="partners-banner-copy">
            <h3 class="partners-banner-title" id="partners-banner-title">Partners</h3>
            <p class="partners-banner-subtitle">Trusted tools and services recommended by EBAI Academy.</p>
          </div>
        </div>
        <div class="partners-banner-list">
          ${partners.map(renderPartner).join("")}
        </div>
      </section>
    `;

    container.querySelectorAll("[data-partner-url]").forEach((button) => {
      button.addEventListener("click", () => {
        const url = button.getAttribute("data-partner-url");
        if (url) openPartnerUrl(url);
      });
    });
  };

  function mountDefault() {
    window.PartnersBanner.mount("#partnersBannerMount");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountDefault);
  } else {
    mountDefault();
  }
})();
