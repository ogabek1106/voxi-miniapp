window.WebsiteInfoModal = window.WebsiteInfoModal || {};

(function () {
  function close() {
    document.getElementById("website-info-backdrop")?.remove();
  }

  window.WebsiteInfoModal.open = function (key) {
    const item = window.WebsiteFooterInfo?.items?.[key];
    if (!item) return;

    close();
    const backdrop = document.createElement("div");
    backdrop.id = "website-info-backdrop";
    backdrop.className = "website-info-backdrop";
    backdrop.innerHTML = `
      <article class="website-info-card" role="dialog" aria-modal="true">
        <button class="website-info-close" data-info-close="1" aria-label="Close">x</button>
        <h2>${item.title}</h2>
        <div class="website-info-body">${item.html}</div>
      </article>
    `;
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop || event.target.closest("[data-info-close='1']")) {
        close();
      }
    });
  };

  window.WebsiteInfoModal.close = close;
})();
