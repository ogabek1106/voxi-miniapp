window.AdminMatchWordsState = window.AdminMatchWordsState || {};

(function () {
  let entries = [];
  let editing = null;

  AdminMatchWordsState.setEntries = function (items) {
    entries = Array.isArray(items) ? items : [];
  };

  AdminMatchWordsState.getEntries = function () {
    return entries;
  };

  AdminMatchWordsState.setEditing = function (entry) {
    editing = entry || null;
  };

  AdminMatchWordsState.getEditing = function () {
    return editing;
  };
})();
