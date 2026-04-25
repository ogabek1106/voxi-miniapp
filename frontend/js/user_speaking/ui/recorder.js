window.UserSpeakingRecorder = window.UserSpeakingRecorder || {};

UserSpeakingRecorder.getSupportedMimeType = function () {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus"
  ];
  for (const mime of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "";
};

UserSpeakingRecorder.ensureStream = async function () {
  const state = UserSpeakingState.get();
  if (state.stream) return state.stream;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  UserSpeakingState.set({ stream });
  return stream;
};

UserSpeakingRecorder.requestPermissionAtStart = async function () {
  try {
    await UserSpeakingRecorder.ensureStream();
    return true;
  } catch (error) {
    console.error("Microphone permission denied:", error);
    return false;
  }
};

UserSpeakingRecorder.create = async function (opts = {}) {
  const stream = await UserSpeakingRecorder.ensureStream();
  const mimeType = UserSpeakingRecorder.getSupportedMimeType();
  const chunks = [];

  let audioContext = UserSpeakingState.get().audioContext;
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    UserSpeakingState.set({ audioContext });
  }

  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const dataArray = new Uint8Array(analyser.fftSize);

  let rafId = null;
  const volumeLoop = function () {
    analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i += 1) {
      const centered = (dataArray[i] - 128) / 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    if (typeof opts.onLevel === "function") {
      opts.onLevel(rms);
    }
    rafId = requestAnimationFrame(volumeLoop);
  };

  let recorder;
  if (mimeType) {
    recorder = new MediaRecorder(stream, { mimeType });
  } else {
    recorder = new MediaRecorder(stream);
  }

  recorder.ondataavailable = function (event) {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const startAt = Date.now();
  recorder.start(400);
  volumeLoop();

  return {
    stop: function () {
      return new Promise((resolve) => {
        recorder.onstop = function () {
          if (rafId) cancelAnimationFrame(rafId);
          const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
          const durationSec = Math.max(1, Math.round((Date.now() - startAt) / 1000));
          resolve({
            blob,
            durationSec
          });
        };
        if (recorder.state !== "inactive") {
          recorder.stop();
        } else {
          if (rafId) cancelAnimationFrame(rafId);
          resolve({
            blob: new Blob(chunks, { type: mimeType || "audio/webm" }),
            durationSec: Math.max(1, Math.round((Date.now() - startAt) / 1000))
          });
        }
      });
    },
    cleanup: function () {
      if (rafId) cancelAnimationFrame(rafId);
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch (_) {}
      try {
        source.disconnect();
      } catch (_) {}
      try {
        analyser.disconnect();
      } catch (_) {}
    }
  };
};
