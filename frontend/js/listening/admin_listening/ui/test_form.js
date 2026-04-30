// frontend/js/listening/admin_listening/ui/test_form.js
window.AdminListeningTestForm = window.AdminListeningTestForm || {};

AdminListeningTestForm.bind = function (onChange) {
  const state = AdminListeningState.get();

  const titleInput = document.getElementById("listening-test-title");
  const globalInstructionInput = document.getElementById("listening-global-instruction-1");
  const timeInput = document.getElementById("listening-time-limit");

  if (titleInput) {
    titleInput.value = state.title || "";
    titleInput.oninput = () => {
      AdminListeningState.setTitle(titleInput.value);
      onChange();
    };
  }

  if (globalInstructionInput) {
    globalInstructionInput.value = state.global_instruction_1 || "";
    globalInstructionInput.oninput = () => {
      AdminListeningState.setGlobalInstruction1(globalInstructionInput.value);
      onChange();
    };
  }

  if (timeInput) {
    timeInput.value = String(state.time_limit_minutes || 60);
    timeInput.oninput = () => {
      AdminListeningState.setTimeLimit(timeInput.value);
      onChange();
    };
  }

};
