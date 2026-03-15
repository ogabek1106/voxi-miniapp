// frontend/js/admin_reading/question_types/gap/logic.js

window.AdminReading = window.AdminReading || {};
AdminReading.Gap = AdminReading.Gap || {};

/**
 * Detect blanks in sentence
 * Returns array of blank positions
 */
AdminReading.Gap.detectBlanks = function(text) {

  if (!text) return [];

  const regex = /_{3,}/g;
  const matches = [...text.matchAll(regex)];

  return matches.map((m, i) => ({
    index: i + 1,
    start: m.index,
    length: m[0].length
  }));

};
