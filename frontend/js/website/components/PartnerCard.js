window.PartnerCard = window.PartnerCard || {};

(function () {
  const SUPPORT_MIN_AMOUNT = 2000;
  const SUPPORT_AMOUNTS = [2000, 5000, 10000, 25000, 50000];
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

  function formatUzs(amount) {
    const parsed = Number(amount);
    const value = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    return `${value.toLocaleString("ru-RU").replace(/\u00a0/g, " ")} UZS`;
  }

  function normalizeSupportAmount(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return SUPPORT_MIN_AMOUNT;
    return Math.max(SUPPORT_MIN_AMOUNT, Math.floor(parsed));
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

  function renderSupportCard() {
    return `
      <article class="partner-card support-voxi-card" data-support-voxi-card>
        <span class="partner-card-badge support-voxi-badge">Community Support</span>
        <div class="partner-card-copy support-voxi-copy">
          <h3 class="partner-card-name support-voxi-title">&#10084;&#65039; Support Voxi</h3>
          <p class="partner-card-description">
            Every contribution helps us build better IELTS tools and keep high-quality learning accessible for everyone.
          </p>
        </div>

        <div class="support-voxi-impact" aria-label="Your support helps us">
          <strong>Your support helps us</strong>
          <ul>
            <li>Create more IELTS Mock Tests</li>
            <li>Improve AI Writing &amp; Speaking feedback</li>
            <li>Develop new learning features</li>
            <li>Keep Voxi growing</li>
          </ul>
        </div>

        <div class="support-voxi-amounts" aria-label="Quick support amounts">
          ${SUPPORT_AMOUNTS.map((amount) => `
            <button
              class="support-voxi-amount ${amount === 5000 ? "is-selected" : ""}"
              type="button"
              data-support-amount="${amount}"
              aria-pressed="${amount === 5000 ? "true" : "false"}">
              ${formatUzs(amount).replace(" UZS", "")}
            </button>
          `).join("")}
        </div>

        <label class="support-voxi-custom">
          <span>Custom amount</span>
          <input
            type="number"
            inputmode="numeric"
            min="${SUPPORT_MIN_AMOUNT}"
            step="1000"
            value="5000"
            data-support-custom-amount
            aria-label="Custom support amount in UZS">
          <small>Minimum ${formatUzs(SUPPORT_MIN_AMOUNT)}</small>
        </label>

        <div class="support-voxi-community" aria-label="Community support">
          <div>
            <span>Community Support</span>
            <strong>Coming soon</strong>
          </div>
          <div>
            <span>Voxi Supporter badge</span>
            <strong>Planned</strong>
          </div>
        </div>

        <button class="partner-card-button support-voxi-button" type="button" data-support-voxi-action>
          Support Voxi
        </button>
        <p class="support-voxi-message" data-support-voxi-message aria-live="polite"></p>
      </article>
    `;
  }

  function bindSupportCard(container) {
    const card = container.querySelector("[data-support-voxi-card]");
    if (!card) return;

    const input = card.querySelector("[data-support-custom-amount]");
    const message = card.querySelector("[data-support-voxi-message]");
    const amountButtons = Array.from(card.querySelectorAll("[data-support-amount]"));

    function setSelectedAmount(amount) {
      const normalized = normalizeSupportAmount(amount);
      if (input) input.value = String(normalized);
      amountButtons.forEach((button) => {
        const selected = Number(button.dataset.supportAmount || 0) === normalized;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      if (message) message.textContent = "";
    }

    amountButtons.forEach((button) => {
      button.addEventListener("click", () => setSelectedAmount(button.dataset.supportAmount));
    });

    input?.addEventListener("input", () => {
      const normalized = normalizeSupportAmount(input.value);
      amountButtons.forEach((button) => {
        const selected = Number(button.dataset.supportAmount || 0) === normalized;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      if (message) message.textContent = "";
    });

    card.querySelector("[data-support-voxi-action]")?.addEventListener("click", () => {
      const amount = normalizeSupportAmount(input?.value);
      if (input) input.value = String(amount);
      if (message) {
        message.textContent = `${formatUzs(amount)} selected. Support payments will be connected in the next update.`;
      }
    });
  }

  window.PartnerCard.render = renderPartnerCard;
  window.PartnerCard.renderSupport = renderSupportCard;

  window.PartnerCard.mount = function (target, partners = PARTNERS) {
    const container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container || container.dataset.partnerCardMounted === "1") return;

    container.dataset.partnerCardMounted = "1";
    container.innerHTML = `
      <section class="partners-section" aria-label="Recommended partner">
        <div class="partners-section-list">
          ${renderSupportCard()}
          ${partners.map(renderPartnerCard).join("")}
        </div>
      </section>
    `;

    bindSupportCard(container);

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
