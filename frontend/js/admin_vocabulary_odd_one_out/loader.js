window.AdminVocabularyOddOneOutLoader = window.AdminVocabularyOddOneOutLoader || {};

(function () {
  AdminVocabularyOddOneOutLoader.loadList = async function () {
    const data = await AdminVocabularyOddOneOutApi.list();
    AdminVocabularyOddOneOutState.setSets(data?.sets || []);
    AdminVocabularyOddOneOutList.render();
  };

  AdminVocabularyOddOneOutLoader.show = async function () {
    AdminVocabularyOddOneOutUI.renderShell();
    AdminVocabularyOddOneOutForm.render();
    try {
      await AdminVocabularyOddOneOutLoader.loadList();
    } catch (error) {
      console.error("Vocabulary puzzle admin load error:", error);
      const host = document.getElementById("admin-vocab-list-host");
      if (host) host.innerHTML = `<div class="admin-vocab-empty">Could not load puzzle sets.</div>`;
    }
  };
})();

window.showAdminVocabularyOddOneOut = function () {
  AdminVocabularyOddOneOutLoader.show();
};
