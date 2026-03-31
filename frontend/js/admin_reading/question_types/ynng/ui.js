//// frontend/js/admin_reading/question_types/ynng/ui.js
window.AdminReading = window.AdminReading || {};

window.AdminReading.registerYNNG = function () {

  if (!window.AdminReading.questionTypes) {
    window.AdminReading.questionTypes = {};
  }

  window.AdminReading.questionTypes["yes_no_ng"] = {
    render: (container, data) => {
      window.AdminReading.YNNG.render(container, data);
    },
    serialize: (block) => {
      return window.AdminReading.YNNG.serialize(block);
    }
  };
};
