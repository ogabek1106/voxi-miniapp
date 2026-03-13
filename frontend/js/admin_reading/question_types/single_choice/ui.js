// frontend/js/admin_reading/question_types/single_choice/ui.js
window.AdminReading = window.AdminReading || {};

AdminReading.renderSingleChoiceUI = function (wrap, data = null) {

  wrap.innerHTML = `
    <div class="mcq-editor">

      <label>Question text</label>
      <input class="mcq-question" placeholder="Enter question text" />

      <div style="margin-top:10px;"><strong>Options</strong></div>

      <div class="mcq-option">
        <label>A</label>
        <input class="mcq-option-input" data-letter="A" placeholder="Option A" />
      </div>

      <div class="mcq-option">
        <label>B</label>
        <input class="mcq-option-input" data-letter="B" placeholder="Option B" />
      </div>

      <div class="mcq-option">
        <label>C</label>
        <input class="mcq-option-input" data-letter="C" placeholder="Option C" />
      </div>

      <div class="mcq-option">
        <label>D</label>
        <input class="mcq-option-input" data-letter="D" placeholder="Option D" />
      </div>

      <div style="margin-top:10px;">
        <label>Correct answer</label>
        <select class="mcq-correct">
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>

    </div>
  `;

  // 🔹 populate fields if editing existing question
  if (data) {

    const questionInput = wrap.querySelector(".mcq-question");
    const optionInputs = wrap.querySelectorAll(".mcq-option-input");
    const correctSelect = wrap.querySelector(".mcq-correct");

    if (data.content?.text) {
      questionInput.value = data.content.text;
    }

    if (data.meta?.options) {
      data.meta.options.forEach((opt, i) => {
        if (optionInputs[i]) {
          optionInputs[i].value = opt;
        }
      });
    }

    if (data.correct_answer?.value) {
      correctSelect.value = data.correct_answer.value;
    }

  }

};
