window.AdminFeedbackState = window.AdminFeedbackState || {};

(function () {
  let state = { items: [] };

  AdminFeedbackState.set = function (patch = {}) {
    state = { ...state, ...(patch || {}) };
  };

  AdminFeedbackState.get = function () {
    return state;
  };
})();
