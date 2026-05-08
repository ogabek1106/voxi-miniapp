window.AdminVocabularyOddOneOutStatsLoader = window.AdminVocabularyOddOneOutStatsLoader || {};

(function () {
  AdminVocabularyOddOneOutStatsLoader.show = async function () {
    AdminVocabularyOddOneOutStatsUI.renderLoading();
    try {
      const data = await AdminVocabularyOddOneOutStatsApi.load();
      AdminVocabularyOddOneOutStatsState.set(data);
      AdminVocabularyOddOneOutStatsUI.render();
    } catch (error) {
      console.error("Odd One Out stats error:", error);
      AdminVocabularyOddOneOutStatsUI.renderError(error?.message || "Failed to load stats.");
    }
  };
})();

window.showAdminVocabularyOddOneOutStats = function () {
  AdminVocabularyOddOneOutStatsLoader.show();
};
