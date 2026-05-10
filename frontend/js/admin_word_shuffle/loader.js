window.AdminWordShuffleLoader = window.AdminWordShuffleLoader || {};

(function () {
  AdminWordShuffleLoader.loadList = async function () {
    const data = await AdminWordShuffleApi.list();
    AdminWordShuffleState.setEntries(data?.entries || []);
    AdminWordShuffleList.render();
  };

  AdminWordShuffleLoader.show = async function () {
    AdminWordShuffleUI.renderShell();
    AdminWordShuffleForm.render();
    try {
      await AdminWordShuffleLoader.loadList();
    } catch (error) {
      console.error("Word Shuffle admin load error:", error);
      const host = document.getElementById("admin-word-shuffle-list-host");
      if (host) host.innerHTML = `<div class="admin-word-shuffle-empty">Could not load words.</div>`;
    }
  };
})();

window.showAdminWordShuffle = function () {
  AdminWordShuffleLoader.show();
};
