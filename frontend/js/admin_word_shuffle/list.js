window.AdminWordShuffleList = window.AdminWordShuffleList || {};

(function () {
  function renderEntry(entry) {
    const active = entry.status === "active";
    return `
      <div class="admin-word-shuffle-entry-card">
        <div>
          <h4>${AdminWordShuffleUI.escape(entry.word)}</h4>
          <p>${AdminWordShuffleUI.escape(entry.translation)} - ${AdminWordShuffleUI.escape(entry.difficulty || "easy")}</p>
          <span>${AdminWordShuffleUI.escape(entry.cefr_level || "No level")} - ${AdminWordShuffleUI.escape(entry.category || "No category")}</span>
        </div>
        <div class="admin-word-shuffle-set-actions">
          <button onclick="AdminWordShuffleList.edit(${Number(entry.id)})">Edit</button>
          <button onclick="AdminWordShuffleList.toggle(${Number(entry.id)}, ${active ? "false" : "true"})">${active ? "Deactivate" : "Activate"}</button>
          <button class="is-danger" onclick="AdminWordShuffleList.remove(${Number(entry.id)})">Delete</button>
        </div>
      </div>
    `;
  }

  AdminWordShuffleList.render = function () {
    const host = document.getElementById("admin-word-shuffle-list-host");
    if (!host) return;
    const entries = AdminWordShuffleState.getEntries();
    host.innerHTML = `
      <div class="admin-word-shuffle-card">
        <h3>Word library</h3>
        <div class="admin-word-shuffle-entry-list">
          ${entries.length ? entries.map(renderEntry).join("") : `<div class="admin-word-shuffle-empty">No words yet.</div>`}
        </div>
      </div>
    `;
  };

  AdminWordShuffleList.edit = function (entryId) {
    const entry = AdminWordShuffleState.getEntries().find((item) => Number(item.id) === Number(entryId));
    if (!entry) return;
    AdminWordShuffleState.setEditing(entry);
    AdminWordShuffleForm.render();
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  AdminWordShuffleList.toggle = async function (entryId, shouldActivate) {
    try {
      if (shouldActivate) await AdminWordShuffleApi.activate(entryId);
      else await AdminWordShuffleApi.deactivate(entryId);
      await AdminWordShuffleLoader.loadList();
    } catch (error) {
      console.error("Word Shuffle status error:", error);
    }
  };

  AdminWordShuffleList.remove = async function (entryId) {
    try {
      await AdminWordShuffleApi.remove(entryId);
      await AdminWordShuffleLoader.loadList();
    } catch (error) {
      console.error("Word Shuffle delete error:", error);
    }
  };
})();
