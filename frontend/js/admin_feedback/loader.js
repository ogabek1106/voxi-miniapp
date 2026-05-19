window.AdminFeedbackLoader = window.AdminFeedbackLoader || {};

(function () {
  AdminFeedbackLoader.show = async function () {
    AdminFeedbackUI.renderLoading();
    try {
      const data = await AdminFeedbackApi.load();
      AdminFeedbackState.set({ items: Array.isArray(data?.items) ? data.items : [] });
      AdminFeedbackUI.render();
    } catch (error) {
      console.error("Feedback ratings load error:", error);
      AdminFeedbackUI.renderError(error?.message || "Failed to load feedback ratings.");
    }
  };
})();

window.showAdminFeedbackRatings = function () {
  AdminFeedbackLoader.show();
};
