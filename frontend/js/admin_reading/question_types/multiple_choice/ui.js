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
    const correctList =
      data?.correct_answers ||
      data?.correct_answer?.value ||
      [];

    const checked = correctList.includes(key);

    const div = document.createElement("div");
    div.className = "mcq-option";
    div.style = `
  display:grid;
  grid-template-columns: 24px 24px 1fr;
  align-items:center;
  gap:8px;
  margin-bottom:8px;
`;

    div.innerHTML = `
  <input 
    type="checkbox" 
    class="mcq-correct" 
    ${checked ? "checked" : ""} 
  />

  <span style="font-weight:600;">${key}</span>

  <input 
    type="text" 
    class="mcq-option-text" 
    value="${text.replace(/"/g, "&quot;")}" 
    placeholder="Option text..."
    style="
      width:100%;
      padding:10px;
      border-radius:8px;
      border:1px solid #e5e5ea;
      box-sizing:border-box;
    "
  />
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
