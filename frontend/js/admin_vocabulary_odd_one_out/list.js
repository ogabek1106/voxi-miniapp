window.AdminVocabularyOddOneOutList = window.AdminVocabularyOddOneOutList || {};

(function () {
  function previewWords(set) {
    return (set.words || []).map((word) => {
      const imageMark = word.image_url ? " [image]" : "";
      return word.is_correct ? `${word.word_text}${imageMark} *` : `${word.word_text}${imageMark}`;
    }).join(" - ");
  }

  AdminVocabularyOddOneOutList.render = function () {
    const host = document.getElementById("admin-vocab-list-host");
    if (!host) return;
    const sets = AdminVocabularyOddOneOutState.getSets();
    host.innerHTML = `
      <div class="admin-vocab-card">
        <h3>Puzzle Library</h3>
        <div class="admin-vocab-set-list">
          ${sets.length ? sets.map(renderSet).join("") : `<div class="admin-vocab-empty">No puzzle sets yet.</div>`}
        </div>
      </div>
    `;
  };

  function renderSet(set) {
    return `
      <article class="admin-vocab-set-card">
        <div>
          <h4>${AdminVocabularyOddOneOutUI.escape(set.title || "Untitled puzzle")}</h4>
          <p>${AdminVocabularyOddOneOutUI.escape(set.level || "No level")} - ${AdminVocabularyOddOneOutUI.escape(set.category || "No category")} - ${AdminVocabularyOddOneOutUI.escape(set.status)}</p>
          <span>${AdminVocabularyOddOneOutUI.escape(previewWords(set))}</span>
        </div>
        <div class="admin-vocab-set-actions">
          <button onclick="AdminVocabularyOddOneOutList.edit(${Number(set.id)})">Edit</button>
          <button onclick="AdminVocabularyOddOneOutList.toggleStatus(${Number(set.id)}, '${set.status === "published" ? "draft" : "published"}')">${set.status === "published" ? "Draft" : "Publish"}</button>
          <button class="is-danger" onclick="AdminVocabularyOddOneOutList.remove(${Number(set.id)})">Delete</button>
        </div>
      </article>
    `;
  }

  AdminVocabularyOddOneOutList.edit = function (setId) {
    const set = AdminVocabularyOddOneOutState.getSets().find((item) => Number(item.id) === Number(setId));
    AdminVocabularyOddOneOutState.setEditing(set || null);
    AdminVocabularyOddOneOutForm.render();
  };

  AdminVocabularyOddOneOutList.toggleStatus = async function (setId, status) {
    try {
      if (status === "published") {
        await AdminVocabularyOddOneOutApi.publish(setId);
      } else {
        await AdminVocabularyOddOneOutApi.draft(setId);
      }
      await AdminVocabularyOddOneOutLoader.loadList();
    } catch (error) {
      console.error("Vocabulary puzzle status error:", error);
    }
  };

  AdminVocabularyOddOneOutList.remove = async function (setId) {
    try {
      await AdminVocabularyOddOneOutApi.remove(setId);
      if (Number(AdminVocabularyOddOneOutState.getEditing()?.id) === Number(setId)) {
        AdminVocabularyOddOneOutState.setEditing(null);
        AdminVocabularyOddOneOutForm.render();
      }
      await AdminVocabularyOddOneOutLoader.loadList();
    } catch (error) {
      console.error("Vocabulary puzzle delete error:", error);
    }
  };
})();
