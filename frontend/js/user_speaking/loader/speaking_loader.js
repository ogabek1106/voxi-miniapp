window.UserSpeakingLoader = window.UserSpeakingLoader || {};

UserSpeakingLoader.PART_LIMITS = {
  1: 25,
  2: 120,
  3: 40
};

UserSpeakingLoader.formatMMSS = function (seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const m = String(Math.floor(safe / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
  return `${m}:${s}`;
};

UserSpeakingLoader.getPartByIndex = function (index) {
  const state = UserSpeakingState.get();
  return state.parts[Number(index || 0)] || null;
};

UserSpeakingLoader.resolveStartIndex = function () {
  const state = UserSpeakingState.get();
  if (state.progress?.part1_audio_url && state.progress?.part2_audio_url && state.progress?.part3_audio_url) {
    return 2;
  }
  if (state.progress?.part1_audio_url && state.progress?.part2_audio_url) return 2;
  if (state.progress?.part1_audio_url) return 1;
  return 0;
};

UserSpeakingLoader.setPartIndex = function (index) {
  UserSpeakingState.set({ partIndex: Number(index || 0) });
};

UserSpeakingLoader.bindBack = function () {
  UserSpeakingUI.bindBack(function () {
    const state = UserSpeakingState.get();
    const recorder = state.recorder;
    if (recorder && typeof recorder.cleanup === "function") {
      recorder.cleanup();
    }
    if (typeof window.goHome === "function") {
      window.goHome();
    }
  });
};

UserSpeakingLoader.renderCurrentPart = function () {
  const state = UserSpeakingState.get();
  const part = UserSpeakingLoader.getPartByIndex(state.partIndex);
  if (!part) {
    const content = document.getElementById("speaking-user-content");
    if (content) {
      content.innerHTML = `
        <div class="question-block speaking-transition-card">
          <div class="speaking-transition-title">Speaking is not configured yet</div>
          <div class="speaking-transition-text">No speaking parts were found in this test.</div>
        </div>
      `;
    }
    return;
  }

  UserSpeakingUI.renderPart(part, "prep", "00:00");
  UserSpeakingLoader.startPrepPhase();
};

UserSpeakingLoader.startPrepPhase = function () {
  const state = UserSpeakingState.get();
  if (state.intervals.prepCountdown) {
    clearInterval(state.intervals.prepCountdown);
  }

  const micBtn = document.getElementById("speaking-mic-btn");
  if (micBtn) {
    micBtn.onclick = function () {
      UserSpeakingLoader.startRecordingPhase();
    };
  }

  let left = 15;
  const interval = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      clearInterval(interval);
      UserSpeakingLoader.startRecordingPhase();
    }
  }, 1000);

  UserSpeakingState.set({
    intervals: {
      ...state.intervals,
      prepCountdown: interval
    }
  });
};

UserSpeakingLoader.getPhase = function (elapsed, max) {
  const ratio = max > 0 ? elapsed / max : 0;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.75) return 2;
  return 1;
};

UserSpeakingLoader.startRecordingPhase = async function () {
  const state = UserSpeakingState.get();
  const part = UserSpeakingLoader.getPartByIndex(state.partIndex);
  if (!part) return;

  if (state.intervals.prepCountdown) {
    clearInterval(state.intervals.prepCountdown);
  }

  UserSpeakingUI.renderPart(part, "recording", "00:00");

  const partNumber = Number(part.part_number || (state.partIndex + 1));
  const maxSec = Number(UserSpeakingLoader.PART_LIMITS[partNumber] || 40);

  const submitBtn = document.getElementById("speaking-submit-btn");
  if (submitBtn) {
    submitBtn.onclick = function () {
      UserSpeakingLoader.finishPart("manual");
    };
  }

  let elapsed = 0;
  UserSpeakingUI.setRecordingPhase(1);

  try {
    const recorder = await UserSpeakingRecorder.create({
      onLevel: function (rms) {
        UserSpeakingUI.setPulseLevel(rms > 0.035);
      }
    });

    UserSpeakingState.set({ recorder });

    const interval = setInterval(() => {
      elapsed += 1;
      UserSpeakingUI.updateRecordingTimer(UserSpeakingLoader.formatMMSS(elapsed));

      const phase = UserSpeakingLoader.getPhase(elapsed, maxSec);
      UserSpeakingUI.setRecordingPhase(phase);

      if (elapsed >= maxSec) {
        clearInterval(interval);
        UserSpeakingLoader.finishPart("auto");
      }
    }, 1000);

    const latest = UserSpeakingState.get();
    UserSpeakingState.set({
      intervals: {
        ...latest.intervals,
        recordTick: interval
      }
    });
  } catch (error) {
    console.error("Recording init failed:", error);
    UserSpeakingUI.setStageMessage("Microphone access is required.");
  }
};

UserSpeakingLoader.finishPart = async function (mode) {
  const state = UserSpeakingState.get();
  const part = UserSpeakingLoader.getPartByIndex(state.partIndex);
  if (!part) return;

  if (state.intervals.recordTick) {
    clearInterval(state.intervals.recordTick);
  }

  const recorder = state.recorder;
  if (!recorder || typeof recorder.stop !== "function") {
    UserSpeakingUI.setStageMessage("Recorder is not ready.");
    return;
  }

  const submitBtn = document.getElementById("speaking-submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = mode === "auto" ? "Auto submitting..." : "Submitting...";
  }

  try {
    const result = await recorder.stop();
    const partNumber = Number(part.part_number || (state.partIndex + 1));
    const ext = (result.blob?.type || "").includes("mp4") ? "m4a" : "webm";
    const fileName = `speaking_part${partNumber}.${ext}`;
    const audioUrl = await UserSpeakingApi.uploadAudio(result.blob, fileName);
    await UserSpeakingApi.savePart(state.mockId, partNumber, audioUrl);

    const nextProgress = { ...state.progress };
    nextProgress[`part${partNumber}_audio_url`] = audioUrl;
    UserSpeakingState.set({
      progress: nextProgress,
      recorder: null,
      intervals: {
        ...state.intervals,
        recordTick: null
      }
    });

    const nextIndex = state.partIndex + 1;
    if (nextIndex < 3) {
      UserSpeakingTransitions.showPartSubmitted(`Part ${nextIndex + 1}`, function () {
        UserSpeakingLoader.setPartIndex(nextIndex);
        UserSpeakingLoader.renderCurrentPart();
      });
      return;
    }

    await UserSpeakingLoader.submitAll(mode === "auto" ? "auto" : "manual");
  } catch (error) {
    console.error("Speaking part submit failed:", error);
    alert("Failed to submit speaking part.");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  }
};

UserSpeakingLoader.submitAll = async function (finishType = "manual") {
  const state = UserSpeakingState.get();
  const payload = {
    part1_audio_url: state.progress?.part1_audio_url || null,
    part2_audio_url: state.progress?.part2_audio_url || null,
    part3_audio_url: state.progress?.part3_audio_url || null
  };

  await UserSpeakingApi.submit(state.mockId, payload, finishType);
  UserSpeakingState.set({ isSubmitted: true });
  await UserSpeakingLoader.runCheckAndShowResult();
};

UserSpeakingLoader.onGlobalTimeExpire = async function () {
  const state = UserSpeakingState.get();
  if (state.isSubmitted) return;

  const recorder = state.recorder;
  if (recorder && typeof recorder.stop === "function") {
    try {
      const part = UserSpeakingLoader.getPartByIndex(state.partIndex);
      const result = await recorder.stop();
      const partNumber = Number(part?.part_number || (state.partIndex + 1));
      const ext = (result.blob?.type || "").includes("mp4") ? "m4a" : "webm";
      const fileName = `speaking_part${partNumber}.${ext}`;
      const audioUrl = await UserSpeakingApi.uploadAudio(result.blob, fileName);
      await UserSpeakingApi.savePart(state.mockId, partNumber, audioUrl);

      const nextProgress = { ...UserSpeakingState.get().progress };
      nextProgress[`part${partNumber}_audio_url`] = audioUrl;
      UserSpeakingState.set({ progress: nextProgress, recorder: null });
    } catch (error) {
      console.error("Auto-time finish save failed:", error);
    }
  }

  try {
    await UserSpeakingLoader.submitAll("auto");
  } catch (error) {
    console.error("Auto submit failed:", error);
    alert("Time is up. Submit failed, please re-open speaking.");
    if (typeof window.goHome === "function") window.goHome();
  }
};

UserSpeakingLoader.runCheckAndShowResult = async function () {
  const state = UserSpeakingState.get();
  UserSpeakingTransitions.showChecking();

  const result = await UserSpeakingApi.check(state.mockId);
  const band = Number(result?.overall_band || 0);

  const container = document.getElementById("screen-speaking");
  if (!container) return;

  if (window.UserReading?.renderResultPage) {
    container.innerHTML = "";
    window.UserReading.renderResultPage(container, {
      band,
      correct: 0,
      total: 40,
      backTarget: "home"
    });
    return;
  }

  alert(`Speaking Band: ${band.toFixed(1)}`);
  if (typeof window.goHome === "function") window.goHome();
};

UserSpeakingLoader.mount = function (container, data) {
  UserSpeakingUI.renderShell(container);

  const timerDuration = Number(data?.timer?.duration_seconds || Number(data?.time_limit_minutes || 18) * 60);
  const timerEndsAt = data?.timer?.ends_at ? new Date(data.timer.ends_at).getTime() : (Date.now() + timerDuration * 1000);

  UserSpeakingState.set({
    mockId: Number(data?.mock_id || 0) || null,
    testId: Number(data?.test_id || 0) || null,
    title: String(data?.title || ""),
    parts: Array.isArray(data?.parts) ? data.parts : [],
    progress: {
      part1_audio_url: data?.progress?.part1_audio_url || null,
      part2_audio_url: data?.progress?.part2_audio_url || null,
      part3_audio_url: data?.progress?.part3_audio_url || null
    },
    isSubmitted: false,
    timer: {
      startedAt: data?.timer?.started_at || null,
      endsAt: timerEndsAt,
      durationSeconds: timerDuration
    }
  });

  UserSpeakingLoader.bindBack();
  UserSpeakingUI.initTimer(UserSpeakingState.get().timer, UserSpeakingLoader.onGlobalTimeExpire);

  UserSpeakingLoader.setPartIndex(UserSpeakingLoader.resolveStartIndex());
  UserSpeakingLoader.renderCurrentPart();
};

UserSpeakingLoader.start = async function (mockId, container) {
  const target = container || document.getElementById("screen-speaking");
  if (!target) return;

  UserSpeakingUI.renderLoading(target);
  UserSpeakingState.reset();

  try {
    const data = await UserSpeakingApi.start(mockId);
    UserSpeakingState.set({
      mockId: Number(data?.mock_id || mockId || 0) || null
    });
    if (data?.already_submitted) {
      if (data?.result?.overall_band) {
        if (window.UserReading?.renderResultPage) {
          target.innerHTML = "";
          window.UserReading.renderResultPage(target, {
            band: Number(data.result.overall_band || 0),
            correct: 0,
            total: 40,
            backTarget: "home"
          });
          return;
        }
      }
      await UserSpeakingLoader.runCheckAndShowResult();
      return;
    }

    UserSpeakingLoader.mount(target, data || {});
  } catch (error) {
    console.error(error);
    UserSpeakingUI.renderError(target, error);
  }
};
