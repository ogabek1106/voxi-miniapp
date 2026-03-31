// frontend/js/admin_reading/question_types/tfng/render.js
window.AdminReading = window.AdminReading || {};
window.AdminReading.TFNG = window.AdminReading.TFNG || {};

window.AdminReading.TFNG.render = function (container, data = null) {

  const text = data?.content?.text || "";
  const correct = data?.correct_answer?.value || "TRUE";

  container.innerHTML = `
    <div class="tfng-block">

      <label>Statement</label>
      <input 
        type="text" 
        class="tfng-question" 
        value="${text.replace(/"/g, "&quot;")}"
        placeholder="Enter statement..."
        style="width:100%; margin-bottom:8px;"
      />

      <label>Correct answer</label>
      <select class="tfng-correct" style="width:100%; height:36px;">
        <option value="TRUE" ${correct === "TRUE" ? "selected" : ""}>True</option>
        <option value="FALSE" ${correct === "FALSE" ? "selected" : ""}>False</option>
        <option value="NOT_GIVEN" ${correct === "NOT_GIVEN" ? "selected" : ""}>Not Given</option>
      </select>

    </div>
  `;
};
