window.VoxiFeedbackApi = window.VoxiFeedbackApi || {};

(function () {
  VoxiFeedbackApi.submit = function (payload) {
    return apiPost("/feedback", payload);
  };
})();
