window.AdminWordMergeList = window.AdminWordMergeList || {};

(function () {
  function stagePreview(family) {
    return (family.stages || []).map((stage) => stage.english_word).slice(0, 5).join(" -> ");
  }

  function renderFamily(family) {
    const active = family.status === "active";
    return `
      <div class="admin-word-merge-family-card">
        <div>
          <h4>${AdminWordMergeUI.escape(family.title)}</h4>
          <p>${AdminWordMergeUI.escape(family.cefr_level || "No level")} · ${AdminWordMergeUI.escape(family.category || "No category")} · x${Number(family.mastery_target || 128)}</p>
          <span>${AdminWordMergeUI.escape(stagePreview(family) || "No stages")}</span>
        </div>
        <div class="admin-word-merge-set-actions">
          <button onclick="AdminWordMergeList.edit(${Number(family.id)})">Edit</button>
          <button onclick="AdminWordMergeList.toggle(${Number(family.id)}, ${active ? "false" : "true"})">${active ? "Deactivate" : "Activate"}</button>
          <button class="is-danger" onclick="AdminWordMergeList.remove(${Number(family.id)})">Delete</button>
        </div>
      </div>
    `;
  }

  AdminWordMergeList.render = function () {
    const host = document.getElementById("admin-word-merge-list-host");
    if (!host) return;
    const families = AdminWordMergeState.getFamilies();
    host.innerHTML = `
      <div class="admin-word-merge-card">
        <h3>Word family library</h3>
        <div class="admin-word-merge-family-list">
          ${families.length ? families.map(renderFamily).join("") : `<div class="admin-word-merge-empty">No families yet.</div>`}
        </div>
      </div>
    `;
  };

  AdminWordMergeList.edit = function (familyId) {
    const family = AdminWordMergeState.getFamilies().find((item) => Number(item.id) === Number(familyId));
    if (!family) return;
    AdminWordMergeState.setEditing(family);
    AdminWordMergeForm.render();
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  AdminWordMergeList.toggle = async function (familyId, shouldActivate) {
    try {
      if (shouldActivate) await AdminWordMergeApi.activate(familyId);
      else await AdminWordMergeApi.deactivate(familyId);
      await AdminWordMergeLoader.loadList();
    } catch (error) {
      console.error("Word Merge status error:", error);
    }
  };

  AdminWordMergeList.remove = async function (familyId) {
    try {
      await AdminWordMergeApi.remove(familyId);
      await AdminWordMergeLoader.loadList();
    } catch (error) {
      console.error("Word Merge delete error:", error);
    }
  };
})();
