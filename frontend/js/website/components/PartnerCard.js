window.PartnerCard = window.PartnerCard || {};

(function () {
  const PARTNERS = [
    {
      id: "yandex-browser",
      name: "Yandex Browser",
      logoSrc: "./assets/yandex-browser-logo.png",
      logoAlt: "Yandex Browser logo",
      description: "Fast, secure, and modern browser for everyday browsing.",
      ctaLabel: "Download Browser",
      referralUrl: "https://redirect.appmetrica.yandex.com/serve/174043448125444738?partner_id=831050&appmetrica_js_redirect=0&clid=15188160&banerid=1315188161&full=0"
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

  function renderPartnerCard(partner) {
    return `
      <article class="partner-card" data-partner-id="${escapeHtml(partner.id)}">
        <span class="partner-card-badge" aria-label="Partner">🤝 Partner</span>
        <div class="partner-card-logo">
          <img src="${escapeHtml(partner.logoSrc)}" alt="${escapeHtml(partner.logoAlt || partner.name)}">
        </div>
        <div class="partner-card-copy">
          <h3 class="partner-card-name">${escapeHtml(partner.name)}</h3>
          <p class="partner-card-description">${escapeHtml(partner.description)}</p>
        </div>
        <button class="partner-card-button" type="button" data-partner-url="${escapeHtml(partner.referralUrl)}">
          ${escapeHtml(partner.ctaLabel)}
        </button>
      </article>
    `;
  }

  window.PartnerCard.render = renderPartnerCard;

  window.PartnerCard.mount = function (target, partners = PARTNERS) {
    const container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container || container.dataset.partnerCardMounted === "1") return;

    container.dataset.partnerCardMounted = "1";
    container.innerHTML = `
      <section class="partners-section" aria-label="Recommended partner">
        <div class="partners-section-list">
          ${partners.map(renderPartnerCard).join("")}
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
    window.PartnerCard.mount("#partnerCardMount");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountDefault);
  } else {
    mountDefault();
  }
})();
