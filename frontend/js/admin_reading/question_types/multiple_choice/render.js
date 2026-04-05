// frontend/js/admin_reading/question_types/multiple_choice/render.js

window.AdminReading = window.AdminReading || {};
window.AdminReading.MCQ = window.AdminReading.MCQ || {};

window.AdminReading.MCQ.render = function(container, data = null) {

  const text = data?.content?.text || "";
  const options = data?.content?.options || [];
  const correct = data?.correct_answers || [];
  const max = data?.meta?.max_answers || 1;

  container.innerHTML = `
    <div class="mcq-block">

      <label>Question</label>
      <input 
        type="text" 
        class="mcq-question" 
        value="${text.replace(/"/g, "&quot;")}"
        style="width:100%; margin-bottom:8px;"
      />

      <label>Max answers</label>
      <input 
        type="number" 
        class="mcq-max" 
        value="${max}"
        style="width:100%; margin-bottom:8px;"
      />

      <div class="mcq-options"></div>

    </div>
  `;

  const containerOptions = container.querySelector(".mcq-options");

  options.forEach((opt, i) => {
    const checked = correct.includes(opt.key);

    const row = document.createElement("div");
    row.innerHTML = `
      <input type="checkbox" class="mcq-correct" ${checked ? "checked" : ""}/>
      <span>${opt.key}</span>
      <input type="text" class="mcq-option-text" value="${opt.text}" />
    `;

    containerOptions.appendChild(row);
  });

};
