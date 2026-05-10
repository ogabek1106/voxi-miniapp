window.AdminWordMergeLoader = window.AdminWordMergeLoader || {};

(function () {
  AdminWordMergeLoader.loadList = async function () {
    const data = await AdminWordMergeApi.list();
    AdminWordMergeState.setFamilies(data?.families || []);
    AdminWordMergeList.render();
  };

  AdminWordMergeLoader.show = async function () {
    AdminWordMergeUI.renderShell();
    AdminWordMergeForm.render();
    try {
      await AdminWordMergeLoader.loadList();
    } catch (error) {
      console.error("Word Merge admin load error:", error);
      const host = document.getElementById("admin-word-merge-list-host");
      if (host) host.innerHTML = `<div class="admin-word-merge-empty">Could not load word families.</div>`;
    }
  };
})();

window.showAdminWordMerge = function () {
  AdminWordMergeLoader.show();
};
