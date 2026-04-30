// frontend/js/listening/admin_listening/ui/test_form.js
window.AdminListeningTestForm = window.AdminListeningTestForm || {};

AdminListeningTestForm.bind = function (onChange) {
  const state = AdminListeningState.get();

  const titleInput = document.getElementById("listening-test-title");
  const globalInstructionInput = document.getElementById("listening-global-instruction-1");
  const globalInstructionAudioInput = document.getElementById("listening-global-instruction-1-audio");
  const globalInstructionAudioChoose = document.getElementById("listening-global-instruction-1-audio-choose");
  const globalInstructionAudioRemove = document.getElementById("listening-global-instruction-1-audio-remove");
  const globalInstructionAudioMeta = document.getElementById("listening-global-instruction-1-audio-meta");
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

  if (globalInstructionAudioMeta) {
    const audio = state.global_instruction_1_audio;
    globalInstructionAudioMeta.textContent = audio?.name
      ? `Selected audio: ${audio.name}`
      : "No instruction audio selected yet.";
    if (globalInstructionAudioChoose) globalInstructionAudioChoose.hidden = Boolean(audio?.name);
    if (globalInstructionAudioRemove) globalInstructionAudioRemove.hidden = !audio?.name;
  }

  if (globalInstructionAudioInput) {
    globalInstructionAudioInput.onchange = () => {
      const file = globalInstructionAudioInput.files?.[0] || null;
      AdminListeningState.setGlobalInstruction1Audio(file);
      if (globalInstructionAudioMeta) {
        globalInstructionAudioMeta.textContent = file
          ? `Selected audio: ${file.name}`
          : "No instruction audio selected yet.";
      }
      if (globalInstructionAudioChoose) globalInstructionAudioChoose.hidden = Boolean(file);
      if (globalInstructionAudioRemove) globalInstructionAudioRemove.hidden = !file;
      onChange();
    };
  }

  if (globalInstructionAudioRemove) {
    globalInstructionAudioRemove.onclick = () => {
      AdminListeningState.setGlobalInstruction1Audio(null);
      if (globalInstructionAudioInput) globalInstructionAudioInput.value = "";
      if (globalInstructionAudioMeta) {
        globalInstructionAudioMeta.textContent = "No instruction audio selected yet.";
      }
      if (globalInstructionAudioChoose) globalInstructionAudioChoose.hidden = false;
      globalInstructionAudioRemove.hidden = true;
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
