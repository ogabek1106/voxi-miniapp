// frontend/js/admin_reading/question_types/multiple_choice/ui.js

window.AdminReading = window.AdminReading || {};

AdminReading.registerQuestionType("multiple_choice", function(container, data = null) {

  container.innerHTML = `
    <div class="mcq-editor">

      <label>Question</label>
      <input
        type="text"
        class="mcq-question"
        placeholder="Enter question..."
        style="width:100%; padding:10px; margin-bottom:10px;"
      />

      <label>Max answers</label>
      <input
        type="number"
        class="mcq-max"
        min="1"
        value="1"
        style="width:100%; padding:10px; margin-bottom:10px;"
      />

      <label>Options</label>
      <div class="mcq-options"></div>

      <button class="mcq-add-option" style="margin-top:10px;">
        + Add Option
      </button>

    </div>
  `;

  const optionsContainer = container.querySelector(".mcq-options");
  const addBtn = container.querySelector(".mcq-add-option");

  function createOption(opt = {}, index = 0) {
    const key = opt.key || String.fromCharCode(65 + index);
    const text = opt.text || "";
    const checked = (data?.correct_answers || []).includes(key);

    const div = document.createElement("div");
    div.className = "mcq-option";
    div.style = "display:flex; gap:8px; margin-bottom:6px;";

    div.innerHTML = `
      <input type="checkbox" class="mcq-correct" ${checked ? "checked" : ""}/>
      <span>${key}</span>
      <input type="text" class="mcq-option-text" value="${text}" placeholder="Option text..." style="flex:1;" />
    `;

    optionsContainer.appendChild(div);
  }

  addBtn.addEventListener("click", () => {
    const index = optionsContainer.children.length;
    createOption({}, index);
  });

  // Restore data
  if (data) {
    container.querySelector(".mcq-question").value = data.content?.text || "";
    container.querySelector(".mcq-max").value = data.meta?.max_answers || 1;

    (data.content?.options || []).forEach((opt, i) => createOption(opt, i));
  } else {
    // default 4 options
    for (let i = 0; i < 4; i++) createOption({}, i);
  }

});
