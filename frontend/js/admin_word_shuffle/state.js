window.AdminWordShuffleState = window.AdminWordShuffleState || {};

(function () {
  let entries = [];
  let editing = null;

  AdminWordShuffleState.setEntries = function (items) {
    entries = Array.isArray(items) ? items : [];
  };

  AdminWordShuffleState.getEntries = function () {
    return entries;
  };

  AdminWordShuffleState.setEditing = function (entry) {
    editing = entry || null;
  };

  AdminWordShuffleState.getEditing = function () {
    return editing;
  };
})();
