// frontend/js/listening/admin_listening/ui/test_form.js
window.AdminListeningTestForm = window.AdminListeningTestForm || {};

AdminListeningTestForm.bind = function (onChange) {
  const state = AdminListeningState.get();

  const titleInput = document.getElementById("listening-test-title");
  const audioInput = document.getElementById("listening-test-audio");
  const timeInput = document.getElementById("listening-time-limit");
  const audioMeta = document.getElementById("listening-audio-meta");

  if (titleInput) {
    titleInput.value = state.title || "";
    titleInput.oninput = () => {
      AdminListeningState.setTitle(titleInput.value);
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

  if (audioMeta) {
    if (state.audio?.name) {
      audioMeta.textContent = `Selected audio: ${state.audio.name}`;
    } else {
      audioMeta.textContent = "No audio selected yet.";
    }
  }

  if (audioInput) {
    audioInput.onchange = () => {
      const file = audioInput.files?.[0] || null;
      AdminListeningState.setAudioFile(file);
      onChange();
    };
  }
};

