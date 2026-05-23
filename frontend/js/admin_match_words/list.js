window.AdminMatchWordsList = window.AdminMatchWordsList || {};

(function () {
  function renderEntry(entry) {
    return `
      <div class="admin-match-words-entry-card">
        <div>
          <h4>${AdminMatchWordsUI.escape(entry.english_text)}</h4>
          <p>${AdminMatchWordsUI.escape(entry.translation_text)}</p>
          <span>${AdminMatchWordsUI.escape(entry.level || "B1")} · ${AdminMatchWordsUI.escape(entry.theme || "No theme")} · ${entry.is_active ? "Active" : "Inactive"}</span>
        </div>
        <div class="admin-match-words-set-actions">
          <button type="button" onclick="AdminMatchWordsList.edit(${Number(entry.id)})">Edit</button>
          <button type="button" onclick="AdminMatchWordsList.toggle(${Number(entry.id)}, ${entry.is_active ? "false" : "true"})">${entry.is_active ? "Deactivate" : "Activate"}</button>
          <button type="button" class="is-danger" onclick="AdminMatchWordsList.remove(${Number(entry.id)})">Delete</button>
        </div>
      </div>
    `;
  }

  AdminMatchWordsList.render = function () {
    const host = document.getElementById("admin-match-words-list-host");
    if (!host) return;
    const entries = AdminMatchWordsState.getEntries();
    host.innerHTML = `
      <div class="admin-match-words-card">
        <h3>Vocabulary pairs</h3>
        <div class="admin-match-words-list">
          ${entries.length ? entries.map(renderEntry).join("") : `<div class="admin-match-words-empty">No match pairs yet.</div>`}
        </div>
      </div>
    `;
  };

  AdminMatchWordsList.edit = function (entryId) {
    const entry = AdminMatchWordsState.getEntries().find((item) => Number(item.id) === Number(entryId));
    if (!entry) return;
    AdminMatchWordsState.setEditing(entry);
    AdminMatchWordsForm.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  AdminMatchWordsList.toggle = async function (entryId, shouldActivate) {
    try {
      if (shouldActivate) await AdminMatchWordsApi.activate(entryId);
      else await AdminMatchWordsApi.deactivate(entryId);
      await AdminMatchWordsLoader.loadList();
    } catch (error) {
      console.error("Match Words status error:", error);
    }
  };

  AdminMatchWordsList.remove = async function (entryId) {
    if (!confirm("Delete this Match Words pair?")) return;
    try {
      await AdminMatchWordsApi.remove(entryId);
      await AdminMatchWordsLoader.loadList();
    } catch (error) {
      console.error("Match Words delete error:", error);
    }
  };
})();
