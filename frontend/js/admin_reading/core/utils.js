// frontend/js/admin_reading/core/utils.js
window.AdminReading = window.AdminReading || {};

function mapType(old) {
  if (old === "mcq") return "SINGLE_CHOICE";
  if (old === "multi") return "MULTI_CHOICE";
  if (old === "gap") return "TEXT_INPUT";
  if (old === "tfng") return "TFNG";
  if (old === "yesno") return "YES_NO_NG";
  if (old === "matching") return "MATCHING";
  return "TEXT_INPUT";
}

function renderOptions(block) {

  const list = block.querySelector(".q-options-list");
  if (!list) return;

  const options = Array.from(list.children);

  options.forEach((opt, index) => {
    const letter = String.fromCharCode(65 + index);
    const label = opt.querySelector(".opt-letter");

    if (label) label.innerText = letter;
  });

}

AdminReading.utils = {
  mapType,
  renderOptions
};
