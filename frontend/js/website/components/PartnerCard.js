window.PartnerCard = window.PartnerCard || {};

(function () {
  const SUPPORT_MIN_AMOUNT = 2000;
  const SUPPORT_MAX_AMOUNT = 10000000;
  const SUPPORT_DEFAULT_AMOUNT = 50000;
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
    return Math.min(SUPPORT_MAX_AMOUNT, Math.max(SUPPORT_MIN_AMOUNT, Math.floor(parsed)));
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
        <div class="partner-card-copy support-voxi-copy">
          <h3 class="partner-card-name support-voxi-title">&#10084;&#65039; Support EBAI Academy</h3>
          <p class="partner-card-description">
            Sizning ko‘magingiz yangi IELTS sinovlarini yaratishimizga, AI tekshiruvini yaxshilashimizga va platformani rivojlantirishimizga imkon beradi.
          </p>
        </div>

        <div class="support-voxi-impact" aria-label="Ko‘magingiz nimaga sarflanadi?">
          <strong>Ko‘magingiz nimaga sarflanadi?</strong>
          <ul>
            <li>Yangi IELTS mock testlarini yaratish</li>
            <li>Writing va Speaking uchun AI tekshiruvini yaxshilash</li>
            <li>Yangi o‘quv funksiyalarini ishlab chiqish</li>
            <li>EBAI Academy platformasini barqaror rivojlantirish</li>
          </ul>
        </div>

        <div class="support-voxi-control" aria-label="Ko‘mak miqdori">
          <div class="support-voxi-amount-view">
            <span>Ko‘mak miqdori</span>
            <strong data-support-amount-label>${formatUzs(SUPPORT_DEFAULT_AMOUNT)}</strong>
          </div>
          <input
            class="support-voxi-slider"
            type="range"
            min="${SUPPORT_MIN_AMOUNT}"
            max="${SUPPORT_MAX_AMOUNT}"
            step="1000"
            value="${SUPPORT_DEFAULT_AMOUNT}"
            data-support-amount-slider
            aria-label="Ko‘mak miqdorini tanlash">
        </div>

        <label class="support-voxi-custom">
          <span>Summani qo‘lda kiriting</span>
          <input
            type="number"
            inputmode="numeric"
            min="${SUPPORT_MIN_AMOUNT}"
            max="${SUPPORT_MAX_AMOUNT}"
            step="1000"
            value="${SUPPORT_DEFAULT_AMOUNT}"
            data-support-custom-amount
            aria-label="Summani qo‘lda kiritish">
          <small>Eng kam summa: ${formatUzs(SUPPORT_MIN_AMOUNT)}</small>
        </label>

        <button class="partner-card-button support-voxi-button" type="button" data-support-voxi-action>
          Support EBAI Academy
        </button>
        <p class="support-voxi-message" data-support-voxi-message aria-live="polite"></p>
      </article>
    `;
  }

  function bindSupportCard(container) {
    const card = container.querySelector("[data-support-voxi-card]");
    if (!card) return;

    const input = card.querySelector("[data-support-custom-amount]");
    const slider = card.querySelector("[data-support-amount-slider]");
    const amountLabel = card.querySelector("[data-support-amount-label]");
    const message = card.querySelector("[data-support-voxi-message]");

    function setAmount(amount, { commit = false, updateInput = true } = {}) {
      const normalized = normalizeSupportAmount(amount);
      if (input && updateInput) input.value = String(normalized);
      if (slider) slider.value = String(normalized);
      if (amountLabel) amountLabel.textContent = formatUzs(normalized);
      if (slider) {
        const progress = ((normalized - SUPPORT_MIN_AMOUNT) / (SUPPORT_MAX_AMOUNT - SUPPORT_MIN_AMOUNT)) * 100;
        slider.style.setProperty("--support-progress", `${progress}%`);
      }
      if (message) message.textContent = "";
      if (commit && input) input.value = String(normalized);
    }

    function inputAmount() {
      const parsed = Number(input?.value);
      return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
    }

    function syncFromInput() {
      const rawAmount = inputAmount();
      if (rawAmount > 0 && rawAmount < SUPPORT_MIN_AMOUNT) {
        if (slider) slider.value = String(SUPPORT_MIN_AMOUNT);
        if (amountLabel) amountLabel.textContent = formatUzs(SUPPORT_MIN_AMOUNT);
        if (slider) slider.style.setProperty("--support-progress", "0%");
        if (message) message.textContent = `Eng kam ko‘mak miqdori ${formatUzs(SUPPORT_MIN_AMOUNT)}.`;
        return;
      }
      if (rawAmount > SUPPORT_MAX_AMOUNT) {
        if (slider) slider.value = String(SUPPORT_MAX_AMOUNT);
        if (amountLabel) amountLabel.textContent = formatUzs(SUPPORT_MAX_AMOUNT);
        if (slider) slider.style.setProperty("--support-progress", "100%");
        if (message) message.textContent = `Eng yuqori ko‘mak miqdori ${formatUzs(SUPPORT_MAX_AMOUNT)}.`;
        return;
      }
      setAmount(rawAmount || SUPPORT_MIN_AMOUNT, { updateInput: false });
    }

    slider?.addEventListener("input", () => setAmount(slider.value));
    input?.addEventListener("input", syncFromInput);
    input?.addEventListener("blur", () => setAmount(input.value, { commit: true }));

    card.querySelector("[data-support-voxi-action]")?.addEventListener("click", async () => {
      const rawAmount = inputAmount();
      if (rawAmount < SUPPORT_MIN_AMOUNT) {
        if (message) message.textContent = `Eng kam ko‘mak miqdori ${formatUzs(SUPPORT_MIN_AMOUNT)}.`;
        return;
      }
      if (rawAmount > SUPPORT_MAX_AMOUNT) {
        if (message) message.textContent = `Eng yuqori ko‘mak miqdori ${formatUzs(SUPPORT_MAX_AMOUNT)}.`;
        return;
      }
      const amount = normalizeSupportAmount(rawAmount);
      setAmount(amount, { commit: true });
      if (!window.VPayGate?.start) {
        if (message) message.textContent = "To'lov oynasi hozircha yuklanmadi. Iltimos, birozdan keyin urinib ko'ring.";
        return;
      }
      window.VPayGate.start({
        type: "donation",
        title: "Support EBAI Academy",
        description: "Sizning ko‘magingiz yangi IELTS sinovlarini yaratishimizga, AI tekshiruvini yaxshilashimizga va platformani rivojlantirishimizga imkon beradi.",
        amount_uzs: amount,
        origin: "support_ebai_academy",
        return_page: "home",
        prepare_checkout: true,
      });
    });

    setAmount(SUPPORT_DEFAULT_AMOUNT, { commit: true });
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
