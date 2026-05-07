window.AdminVocabularyOddOneOutState = window.AdminVocabularyOddOneOutState || {};

(function () {
  let sets = [];
  let editingSet = null;

  AdminVocabularyOddOneOutState.setSets = function (nextSets) {
    sets = Array.isArray(nextSets) ? nextSets : [];
  };

  AdminVocabularyOddOneOutState.getSets = function () {
    return sets;
  };

  AdminVocabularyOddOneOutState.setEditing = function (set) {
    editingSet = set || null;
  };

  AdminVocabularyOddOneOutState.getEditing = function () {
    return editingSet;
  };
})();
