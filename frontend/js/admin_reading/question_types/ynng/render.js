// frontend/js/admin_reading/question_types/ynng/render.js
window.AdminReading = window.AdminReading || {};

window.AdminReading.YNNG = window.AdminReading.YNNG || {};

window.AdminReading.YNNG.render = function (container, data = null) {

  const text = data?.content?.text || "";
  const correct = data?.correct_answer?.value || "YES";

  container.innerHTML = `
    <div class="ynng-block">

      <label>Statement</label>
      <input 
        type="text" 
        class="ynng-question" 
        value="${text.replace(/"/g, "&quot;")}"
        placeholder="Enter statement..."
        style="width:100%; margin-bottom:8px;"
      />

      <label>Correct answer</label>
      <select class="ynng-correct" style="width:100%; height:36px;">
        <option value="YES" ${correct === "YES" ? "selected" : ""}>Yes</option>
        <option value="NO" ${correct === "NO" ? "selected" : ""}>No</option>
        <option value="NOT_GIVEN" ${correct === "NOT_GIVEN" ? "selected" : ""}>Not Given</option>
      </select>

    </div>
  `;
};
