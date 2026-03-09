// frontend/js/admin_reading.js
window.debugTypeChange = function(sel) {

  const value = sel.value;

  Array.from(sel.options).forEach(opt => {
    opt.selected = (opt.value === value);
  });

  console.log("TYPE CHANGE START", value, sel);

  setTimeout(() => {
    console.log("TYPE AFTER 50ms", sel.value, sel);
  }, 50);

  handleQuestionTypeChange(sel);
};
