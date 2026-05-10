window.AdminWordMergeState = window.AdminWordMergeState || {};

(function () {
  let families = [];
  let editing = null;

  AdminWordMergeState.setFamilies = function (items) {
    families = Array.isArray(items) ? items : [];
  };

  AdminWordMergeState.getFamilies = function () {
    return families;
  };

  AdminWordMergeState.setEditing = function (family) {
    editing = family || null;
  };

  AdminWordMergeState.getEditing = function () {
    return editing;
  };
})();
