window.UserSpeakingLoader = window.UserSpeakingLoader || {};

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

UserSpeakingLoader.getPartTiming = function (partNumber) {
  const key = Number(partNumber || 0);
  const cfg = UserSpeakingState.TIMING?.[key];
  if (cfg) return cfg;
  return { prepSeconds: 10, maxRecordSeconds: 30 };
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
    if (state.intervals?.recordTick) {
      clearInterval(state.intervals.recordTick);
    }
    if (state.intervals?.prepCountdown) {
      clearInterval(state.intervals.prepCountdown);
    }
    if (state.intervals?.prepRaf) {
      cancelAnimationFrame(state.intervals.prepRaf);
    }
    if (recorder && typeof recorder.cleanup === "function") {
      recorder.cleanup();
    }
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }
    if (state.audioContext && typeof state.audioContext.close === "function") {
      state.audioContext.close().catch(() => {});
    }
    UserSpeakingState.set({
      recorder: null,
      audioContext: null,
      stream: null,
      intervals: {
        ...state.intervals,
        prepCountdown: null,
        prepRaf: null,
        recordTick: null
      }
    });
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
  if (state.intervals.prepRaf) {
    cancelAnimationFrame(state.intervals.prepRaf);
  }

  const micBtn = document.getElementById("speaking-action-btn");
  if (micBtn) {
    micBtn.onclick = function () {
      UserSpeakingLoader.startRecordingPhase();
    };
  }

  const currentPart = UserSpeakingLoader.getPartByIndex(state.partIndex);
  const partNumber = Number(currentPart?.part_number || (state.partIndex + 1));
  const timing = UserSpeakingLoader.getPartTiming(partNumber);
  const totalMs = Number(timing.prepSeconds || 10) * 1000;
  const startedAt = performance.now();

  const tick = function (now) {
    const elapsed = Math.max(0, now - startedAt);
    const ratio = Math.max(0, 1 - (elapsed / totalMs));
    UserSpeakingUI.setPrepRingProgress(ratio);
    if (ratio <= 0) {
      UserSpeakingLoader.startRecordingPhase();
      return;
    }
    const latest = UserSpeakingState.get();
    const rafId = requestAnimationFrame(tick);
    UserSpeakingState.set({
      intervals: {
        ...latest.intervals,
        prepRaf: rafId
      }
    });
  };
  const rafId = requestAnimationFrame(tick);

  UserSpeakingState.set({
    intervals: {
      ...state.intervals,
      prepCountdown: null,
      prepRaf: rafId
    }
  });
  UserSpeakingLoader.bindForceSubmitButton();
};

UserSpeakingLoader.getPhase = function (elapsed, max) {
  const heartbeatStart = Math.max(0, Number(max || 0) - 10);
  if (elapsed >= heartbeatStart) return 3;
  const ratio = max > 0 ? elapsed / max : 0;
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
  if (state.intervals.prepRaf) {
    cancelAnimationFrame(state.intervals.prepRaf);
  }

  UserSpeakingUI.renderPart(part, "recording", "00:00");

  const partNumber = Number(part.part_number || (state.partIndex + 1));
  const timing = UserSpeakingLoader.getPartTiming(partNumber);
  const maxSec = Number(timing.maxRecordSeconds || 30);
  const submitBtn = document.getElementById("speaking-action-btn");
  if (submitBtn) {
    submitBtn.onclick = function () {
      UserSpeakingLoader.finishPart("manual");
    };
  }
  UserSpeakingLoader.bindForceSubmitButton();

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
  const isForce = mode === "force" && !!state.isAdmin;

  if (state.intervals.recordTick) {
    clearInterval(state.intervals.recordTick);
  }

  const partNumber = Number(part.part_number || (state.partIndex + 1));
  if (isForce) {
    try {
      if (state.recorder && typeof state.recorder.cleanup === "function") {
        state.recorder.cleanup();
      }
      await UserSpeakingApi.savePart(state.mockId, partNumber, null);

      const nextProgress = { ...state.progress };
      nextProgress[`part${partNumber}_audio_url`] = null;
      UserSpeakingState.set({
        progress: nextProgress,
        recorder: null,
        intervals: {
          ...state.intervals,
          recordTick: null,
          prepRaf: null,
          prepCountdown: null
        }
      });

      const nextIndex = state.partIndex + 1;
      if (nextIndex < 3) {
        UserSpeakingLoader.setPartIndex(nextIndex);
        UserSpeakingLoader.renderCurrentPart();
        return;
      }

      await UserSpeakingLoader.submitAll("manual");
      return;
    } catch (error) {
      console.error("Force submit failed:", error);
      alert("Force submit failed.");
      return;
    }
  }

  const recorder = state.recorder;
  if (!recorder || typeof recorder.stop !== "function") {
    UserSpeakingUI.setStageMessage("Recorder is not ready.");
    return;
  }

  const submitBtn = document.getElementById("speaking-action-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("is-busy");
    submitBtn.textContent = mode === "auto" ? "Auto submitting..." : "Submitting...";
  }

  try {
    const result = await recorder.stop();
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
        recordTick: null,
        prepRaf: null,
        prepCountdown: null
      }
    });

    const nextIndex = state.partIndex + 1;
    if (nextIndex < 3) {
      if (mode === "auto") {
        UserSpeakingTransitions.showAutoSubmitted(function () {
          UserSpeakingLoader.setPartIndex(nextIndex);
          UserSpeakingLoader.renderCurrentPart();
        });
      } else {
        UserSpeakingTransitions.showPartSubmitted(`Part ${nextIndex + 1}`, function () {
          UserSpeakingLoader.setPartIndex(nextIndex);
          UserSpeakingLoader.renderCurrentPart();
        });
      }
      return;
    }

    if (mode === "auto") {
      UserSpeakingTransitions.showAutoSubmitted(function () {
        UserSpeakingLoader.submitAll("auto");
      });
      return;
    }

    await UserSpeakingLoader.submitAll("manual");
  } catch (error) {
    console.error("Speaking part submit failed:", error);
    alert("Failed to submit speaking part.");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-busy");
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

  const handledByFlow = window.MockFlow?.showFinalTransition?.(
    state.mockId,
    document.getElementById("screen-speaking"),
    function () {
      UserSpeakingLoader.runCheckAndShowResult({ skipCheckingScreen: true });
    }
  );

  if (handledByFlow) {
    return;
  }

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

UserSpeakingLoader.runCheckAndShowResult = async function (options = {}) {
  const state = UserSpeakingState.get();
  if (!options.skipCheckingScreen) {
    UserSpeakingTransitions.showChecking();
  }

  const speakingCheck = await UserSpeakingApi.check(state.mockId);
  const fullResult = await UserSpeakingApi.getFullMockResult(state.mockId);
  const fallbackBand = Number(speakingCheck?.overall_band || 0);
  const overallBand = Number(fullResult?.overall_band ?? fallbackBand);

  const container = document.getElementById("screen-speaking");
  if (!container) return;

  if (window.UserReading?.renderResultPage) {
    container.innerHTML = "";

    const pending = Array.isArray(fullResult?.pending_parts) ? fullResult.pending_parts : [];
    if (pending.length) {
      alert(`Final result is pending: ${pending.join(", ")}`);
    }

    window.UserReading.renderResultPage(container, {
      band: overallBand,
      correct: 0,
      total: 40,
      backTarget: "home",
      breakdown: {
        listening: Number(fullResult?.listening_band ?? 0),
        reading: Number(fullResult?.reading_band ?? 0),
        writing: Number(fullResult?.writing_band ?? 0),
        speaking: Number(fullResult?.speaking_band ?? fallbackBand)
      },
      overallLabel: "Overall IELTS Band"
    });
    return;
  }

  alert(`Overall Band: ${overallBand.toFixed(1)}`);
  if (typeof window.goHome === "function") window.goHome();
};

UserSpeakingLoader.mount = function (container, data) {
  UserSpeakingUI.renderShell(container);

  const isAdmin = !!(data?.is_admin || window.__isAdmin);
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
    isAdmin,
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

UserSpeakingLoader.bindForceSubmitButton = function () {
  const state = UserSpeakingState.get();
  if (!state.isAdmin) return;

  const forceBtn = document.getElementById("speaking-force-submit-btn");
  if (!forceBtn) return;
  forceBtn.onclick = function () {
    UserSpeakingLoader.finishPart("force");
  };
};

UserSpeakingLoader.start = async function (mockId, container) {
  window.MockDebug?.log?.("Speaking.start.enter", {
    mockId,
    hasContainer: !!container
  });
  const target = container || document.getElementById("screen-speaking");
  if (!target) return;

  UserSpeakingUI.renderLoading(target);
  UserSpeakingState.reset();

  const hasPermission = await UserSpeakingRecorder.requestPermissionAtStart();
  window.MockDebug?.log?.("Speaking.start.permissionResult", { hasPermission });
  if (!hasPermission) {
    UserSpeakingUI.renderPermissionRequired(target);
    const grantBtn = document.getElementById("speaking-grant-access-btn");
    if (grantBtn) {
      grantBtn.onclick = async function () {
        window.MockDebug?.log?.("Speaking.start.grantButton.click");
        grantBtn.disabled = true;
        grantBtn.textContent = "Requesting...";
        const granted = await UserSpeakingRecorder.requestPermissionAtStart();
        window.MockDebug?.log?.("Speaking.start.grantButton.result", { granted });
        if (!granted) {
          grantBtn.disabled = false;
          grantBtn.textContent = "Grant access";
          return;
        }
        UserSpeakingLoader.start(mockId, target);
      };
    }
    return;
  }

  try {
    window.MockDebug?.log?.("Speaking.start.api.start", { mockId });
    const data = await UserSpeakingApi.start(mockId);
    window.MockDebug?.log?.("Speaking.start.api.done", {
      hasData: !!data,
      alreadySubmitted: !!data?.already_submitted
    });
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
