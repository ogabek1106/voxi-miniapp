// frontend/js/admin_reading.js
window.debugTypeChange = function(sel) {

  const value = sel.value;

  // force DOM selected option sync
  Array.from(sel.options).forEach(opt => {
    opt.selected = (opt.value === value);
  });

  console.log("TYPE CHANGE START", value, sel);

  setTimeout(() => {
    console.log("TYPE AFTER 50ms", sel.value, sel);
  }, 50);

  handleQuestionTypeChange(sel);
};

window.__currentPackId = null;
window.__globalQuestionCounter = 1;
window.__currentEditingTestId = null;
