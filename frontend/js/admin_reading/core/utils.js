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

window.handleQuestionTypeChange = function(selectEl) {

const block = selectEl.closest(".question-block");
const wrap = block.querySelector(".q-meta-wrap");

if (!wrap) return;

const textWrap = block.querySelector(".q-text")?.parentElement;
const answerWrap = block.querySelector(".q-answer")?.parentElement;

if (selectEl.value === "matching") {
if (textWrap) textWrap.style.display = "none";
if (answerWrap) answerWrap.style.display = "none";
} else {
if (textWrap) textWrap.style.display = "";
if (answerWrap) answerWrap.style.display = "";
}

wrap.replaceChildren();

/* GAP */
if (selectEl.value === "gap") {

```
wrap.innerHTML = `
  <label>Max words</label>
  <input class="q-max-words" type="number" min="1" />

  <label style="display:block; margin-top:4px;">
    <input type="checkbox" class="q-allow-numbers" />
    Allow numbers
  </label>
`;
```

}

/* MCQ / MULTI */
if (selectEl.value === "mcq" || selectEl.value === "multi") {

```
wrap.innerHTML = `
  <div class="q-options-wrap">
    <div class="q-options-list"></div>

    <button type="button"
            onclick="addOption(this)"
            style="margin-top:6px;">
      + Add option
    </button>
  </div>
`;

addOption(wrap.querySelector("button"));
```

}

/* MATCHING */
if (selectEl.value === "matching") {

```
AdminReading.renderMatchingMeta(wrap);
```

}

};
