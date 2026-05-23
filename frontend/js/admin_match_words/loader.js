window.AdminMatchWordsLoader = window.AdminMatchWordsLoader || {};

(function () {
  AdminMatchWordsLoader.loadList = async function () {
    const data = await AdminMatchWordsApi.list();
    AdminMatchWordsState.setEntries(data?.entries || []);
    AdminMatchWordsList.render();
  };

  AdminMatchWordsLoader.show = async function () {
    AdminMatchWordsUI.renderShell();
    AdminMatchWordsForm.render();
    try {
      await AdminMatchWordsLoader.loadList();
    } catch (error) {
      console.error("Match Words admin load error:", error);
      const host = document.getElementById("admin-match-words-list-host");
      if (host) host.innerHTML = `<div class="admin-match-words-empty">Could not load Match Words pairs.</div>`;
    }
  };
})();

window.showAdminMatchWords = function () {
  AdminMatchWordsLoader.show();
};
