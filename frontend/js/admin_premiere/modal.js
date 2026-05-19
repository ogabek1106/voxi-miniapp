(function () {
  const state = { pack: null };

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toLocalInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0, 16);
  }

  function ensureModal() {
    let modal = document.getElementById("admin-premiere-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "admin-premiere-modal";
    modal.className = "admin-premiere-modal";
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    return modal;
  }

  function statusText(pack) {
    const published = pack?.status === "published";
    const live = !!pack?.premiere_is_live;
    if (!published) return "Draft";
    return live ? "Premiere live" : "Published";
  }

  function themeOptions(current) {
    const themes = [
      ["violet_aurora", "Violet Aurora"],
      ["sky_blue", "Sky Blue"],
      ["arctic_glow", "Arctic Glow"],
      ["sunset_peach", "Sunset Peach"],
    ];
    const value = current || "violet_aurora";
    return themes.map(([key, label]) => `
      <option value="${esc(key)}" ${key === value ? "selected" : ""}>${esc(label)}</option>
    `).join("");
  }

  function render(pack) {
    const modal = ensureModal();
    state.pack = pack;
    const published = pack?.status === "published";
    const live = !!pack?.premiere_is_live;
    modal.innerHTML = `
      <div class="admin-premiere-card">
        <button class="admin-premiere-close" type="button" data-close>&times;</button>
        <div class="admin-premiere-eyebrow">Premiere Mock</div>
        <h3>${esc(pack?.title || "Mock Pack")}</h3>
        <p class="admin-premiere-status">Status: <strong>${esc(statusText(pack))}</strong></p>
        <div class="admin-premiere-message" id="admin-premiere-message"></div>
        <label>
          End date/time
          <input id="admin-premiere-end" type="datetime-local" value="${esc(toLocalInputValue(pack?.premiere_ends_at))}">
        </label>
        <label>
          Access price (UZS)
          <input id="admin-premiere-price" type="number" min="1" step="1000" value="${Number(pack?.premiere_price_uzs || 0) || ""}">
        </label>
        <label>
          Label
          <input id="admin-premiere-label" type="text" value="${esc(pack?.premiere_label || "PREMIERE")}">
        </label>
        <label>
          Visual theme
          <select id="admin-premiere-theme">
            ${themeOptions(pack?.premiere_theme)}
          </select>
        </label>
        <label>
          Short description
          <textarea id="admin-premiere-description" rows="3">${esc(pack?.premiere_description || "")}</textarea>
        </label>
        <div class="admin-premiere-actions">
          <button type="button" class="admin-premiere-apply" data-apply ${published ? "" : "disabled"}>Save Premiere</button>
          ${live ? `<button type="button" class="admin-premiere-disable" data-disable>Disable Premiere</button>` : ""}
        </div>
        ${published ? "" : `<p class="admin-premiere-hint">Mock Pack must be published before becoming Premiere.</p>`}
      </div>
    `;
    modal.classList.add("is-open");
    modal.querySelector("[data-close]")?.addEventListener("click", close);
    modal.querySelector("[data-apply]")?.addEventListener("click", apply);
    modal.querySelector("[data-disable]")?.addEventListener("click", disable);
  }

  function showMessage(text, type = "error") {
    const node = document.getElementById("admin-premiere-message");
    if (!node) return;
    node.textContent = text || "";
    node.className = `admin-premiere-message is-${type}`;
  }

  async function open(packId) {
    try {
      const data = await window.AdminPremiereApi.getPack(packId);
      render(data.pack);
    } catch (error) {
      alert(error?.message || "Could not load Premiere settings");
    }
  }

  function close() {
    document.getElementById("admin-premiere-modal")?.classList.remove("is-open");
  }

  async function apply() {
    if (!state.pack) return;
    const endsRaw = document.getElementById("admin-premiere-end")?.value || "";
    const payload = {
      ends_at: endsRaw ? new Date(endsRaw).toISOString() : null,
      price_uzs: Number(document.getElementById("admin-premiere-price")?.value || 0),
      label: document.getElementById("admin-premiere-label")?.value || "PREMIERE",
      theme: document.getElementById("admin-premiere-theme")?.value || "violet_aurora",
      description: document.getElementById("admin-premiere-description")?.value || "",
    };
    try {
      const updated = await window.AdminPremiereApi.enable(state.pack.id, payload);
      showMessage("Premiere settings saved.", "success");
      state.pack = updated;
      if (typeof window.loadMockPacks === "function") await window.loadMockPacks();
      setTimeout(() => render(updated), 350);
    } catch (error) {
      showMessage(error?.message || "Could not save Premiere settings");
    }
  }

  async function disable() {
    if (!state.pack) return;
    try {
      const updated = await window.AdminPremiereApi.disable(state.pack.id);
      showMessage("Premiere disabled.", "success");
      state.pack = updated;
      if (typeof window.loadMockPacks === "function") await window.loadMockPacks();
      setTimeout(() => render(updated), 350);
    } catch (error) {
      showMessage(error?.message || "Could not disable Premiere");
    }
  }

  window.AdminPremiereModal = { open, close };
})();
