// frontend/js/user_reading/dynamic.js
window.UserListening = window.UserListening || {};

UserListening.getCheckSoundUrl = function () {
  if (UserListening.__checkSoundUrl) return UserListening.__checkSoundUrl;
  const sampleRate = 44100;
  const duration = 0.7;
  const sampleCount = Math.floor(sampleRate * duration);
  const bytes = new Uint8Array(44 + sampleCount * 2);
  const view = new DataView(bytes.buffer);

  function writeString(offset, value) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, sampleCount * 2, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const fadeIn = Math.min(1, t / 0.04);
    const fadeOut = Math.min(1, (duration - t) / 0.12);
    const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
    const sample = Math.sin(2 * Math.PI * 660 * t) * 0.32 * envelope;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true);
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  UserListening.__checkSoundUrl = `data:audio/wav;base64,${btoa(binary)}`;
  return UserListening.__checkSoundUrl;
};

UserListening.playCheckSound = async function () {
  try {
    const audio = new Audio(UserListening.getCheckSoundUrl());
    audio.preload = "auto";
    audio.playsInline = true;
    audio.volume = 1;
    UserListening.__checkSoundAudio = audio;
    await audio.play();
    return;
  } catch (error) {
    console.warn("HTMLAudio test sound failed, trying WebAudio fallback", error);
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  if (ctx.state === "suspended") {
    await ctx.resume().catch(() => {});
  }
  const gain = ctx.createGain();
  const oscillator = ctx.createOscillator();

  oscillator.type = "sine";
  oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.6);
  setTimeout(() => ctx.close?.(), 800);
};

UserListening.formatAudioTime = function (seconds) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const mins = String(Math.floor(safe / 60)).padStart(2, "0");
  const secs = String(Math.floor(safe % 60)).padStart(2, "0");
  return `${mins}:${secs}`;
};

UserListening.storeCurrentAnswers = function () {
  UserListening.__sessionAnswers = {
    ...(UserListening.__sessionAnswers || {}),
    ...UserListening.collectSaveableAnswers()
  };
};

UserListening.renderReadiness = function (container, data) {
  if (!container) return;

  container.innerHTML = `
    <div class="listening-ready-screen">
      <div class="listening-ready-card">
        <div class="listening-ready-kicker">Listening test</div>
        <h2>${UserListening.escapeHtml(data?.title || "Listening Test")}</h2>
        <p>
          Before you begin, make sure your headphones or speakers are working and your volume is comfortable.
          The audio will play once only. You will not be able to pause, rewind, or replay tracks during the test.
        </p>
        <ul>
          <li>Find a quiet place before you start.</li>
          <li>Keep the app open until the Listening section finishes.</li>
          <li>Use the test sound if you need to check your volume.</li>
        </ul>
        <div class="listening-ready-actions">
          <button type="button" id="listening-sound-test-btn">Test</button>
          <button type="button" id="listening-ready-btn">Ready</button>
        </div>
      </div>
    </div>
  `;

  const testBtn = document.getElementById("listening-sound-test-btn");
  const readyBtn = document.getElementById("listening-ready-btn");
  if (testBtn) testBtn.onclick = () => UserListening.playCheckSound();
  if (readyBtn) {
    readyBtn.onclick = () => {
      readyBtn.disabled = true;
      UserListening.__activeSectionIndex = 0;
      UserListening.__sessionAnswers = {};
      UserListening.startListeningMode(container, data);
    };
  }
};

UserListening.startListeningMode = function (container, data) {
  const introAudioUrl = data?.global_instruction_intro_audio_url;
  if (!introAudioUrl) {
    UserListening.renderTest(container, data, { activeSectionIndex: 0, playPart: true });
    return;
  }

  container.innerHTML = `
    <div class="listening-intro-screen">
      <div class="listening-intro-card">
        <div class="listening-ready-kicker">Powered by EBAI Academy</div>
        <h2>${UserListening.escapeHtml(data?.title || "Listening Test")}</h2>
        <p>${UserListening.escapeHtml(data?.global_instruction_intro || "Listen carefully to the instructions before the test begins.")}</p>
        <div class="listening-audio-status" hidden></div>
      </div>
    </div>
  `;

  const audio = new Audio(UserListening.toMediaUrl(introAudioUrl));
  audio.preload = "auto";
  UserListening.__currentAudio = audio;
  audio.onended = () => UserListening.renderTest(container, data, { activeSectionIndex: 0, playPart: true });
  audio.onerror = () => UserListening.renderTest(container, data, { activeSectionIndex: 0, playPart: true });
  audio.play().catch(() => {
    const status = container.querySelector(".listening-audio-status");
    if (status) {
      status.hidden = false;
      status.textContent = "Tap Ready again if your browser blocked audio autoplay.";
    }
    UserListening.renderTest(container, data, { activeSectionIndex: 0, playPart: true });
  });
};

UserListening.showTrackline = function () {
  const trackline = document.getElementById("listening-trackline");
  const timeEl = document.getElementById("listening-trackline-time");
  const fill = document.getElementById("listening-trackline-fill");
  if (!trackline || !timeEl || !fill) return;
  trackline.hidden = false;
  timeEl.textContent = "00:00 / 00:00";
  fill.style.width = "0%";
};

UserListening.updateTrackline = function (audio) {
  const timeEl = document.getElementById("listening-trackline-time");
  const fill = document.getElementById("listening-trackline-fill");
  if (!timeEl || !fill || !audio) return;
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const ratio = duration > 0 ? Math.min(1, current / duration) : 0;
  timeEl.textContent = `${UserListening.formatAudioTime(current)} / ${UserListening.formatAudioTime(duration)}`;
  fill.style.width = `${ratio * 100}%`;
};

UserListening.playPartAudioOnce = function (container, data, section, sectionIndex) {
  if (!section?.audio_url) return;
  if (UserListening.__currentAudio) {
    UserListening.__currentAudio.pause();
    UserListening.__currentAudio = null;
  }

  const audio = new Audio(UserListening.toMediaUrl(section.audio_url));
  audio.preload = "auto";
  UserListening.__currentAudio = audio;
  UserListening.showTrackline();
  audio.ontimeupdate = () => UserListening.updateTrackline(audio);
  audio.onloadedmetadata = () => UserListening.updateTrackline(audio);
  audio.onended = () => {
    UserListening.updateTrackline(audio);
    UserListening.advanceListeningPart(container, data, sectionIndex);
  };
  audio.play().catch(() => {
    const notice = document.getElementById("listening-audio-notice");
    if (notice) {
      notice.textContent = "Audio is ready. Tap here once to start the track.";
      notice.onclick = () => {
        notice.onclick = null;
        notice.textContent = "Playing audio...";
        audio.play().catch(() => {});
      };
    }
  });
};

UserListening.renderTest = function (container, data, options = {}) {
  UserListening.renderShell(container);

  const title = document.getElementById("reading-user-title");
  const content = document.getElementById("reading-user-content");

  if (title) title.textContent = data?.title || "Listening Test";
  if (!content) return;

  UserListening.__mockId = data?.mock_id || null;
  UserListening.__isSubmitted = false;
  UserListening.__activeSectionIndex = Number(options.activeSectionIndex || 0);

  const allSections = (data.sections || data.passages) || [];
  const activeSection = allSections[UserListening.__activeSectionIndex] || allSections[0];
  const nextQuestionNumber = allSections
    .slice(0, UserListening.__activeSectionIndex)
    .reduce((total, section) => total + (section?.questions?.length || 0), 1);

  content.innerHTML =
    `<div id="listening-audio-notice" class="listening-audio-notice">Audio will play once only. Pausing and rewinding are not available.</div>` +
    (activeSection ? UserListening.renderPassage(activeSection, UserListening.__activeSectionIndex, nextQuestionNumber) : "");

  UserListening.initHeader(data);
  UserListening.restoreProgress(data);
  if (UserListening.__sessionAnswers) {
    UserListening.applyRestoredAnswers(UserListening.__sessionAnswers);
  }
  UserListening.initAutoSave(data);
  if (options.playPart) {
    UserListening.playPartAudioOnce(container, data, activeSection, UserListening.__activeSectionIndex);
  }
};

UserListening.finishListeningFlow = function () {
  UserListening.storeCurrentAnswers();
  if (UserListening.__nextPartTimeout) {
    clearTimeout(UserListening.__nextPartTimeout);
    UserListening.__nextPartTimeout = null;
  }

  UserListening.__nextPartTimeout = setTimeout(() => {
    UserListening.submitReading({ auto: true });
  }, 2000);
};

UserListening.advanceListeningPart = function (container, data, completedIndex) {
  UserListening.storeCurrentAnswers();
  const sections = (data.sections || data.passages) || [];
  const nextIndex = completedIndex + 1;
  const current = sections[completedIndex] || {};
  if (nextIndex >= sections.length) {
    UserListening.finishListeningFlow();
    return;
  }

  const renderNext = () => {
    UserListening.storeCurrentAnswers();
    UserListening.renderTest(container, data, { activeSectionIndex: nextIndex, playPart: true });
  };

  if (UserListening.__nextPartTimeout) {
    clearTimeout(UserListening.__nextPartTimeout);
    UserListening.__nextPartTimeout = null;
  }

  if (!current.global_instruction_after_audio_url) {
    UserListening.__nextPartTimeout = setTimeout(renderNext, 2000);
    return;
  }

  UserListening.__nextPartTimeout = setTimeout(() => {
    let moved = false;
    const moveNextOnce = () => {
      if (moved) return;
      moved = true;
      renderNext();
    };
    const audio = new Audio(UserListening.toMediaUrl(current.global_instruction_after_audio_url));
    audio.preload = "auto";
    UserListening.__currentAudio = audio;
    UserListening.showTrackline();
    audio.ontimeupdate = () => UserListening.updateTrackline(audio);
    audio.onloadedmetadata = () => UserListening.updateTrackline(audio);
    audio.onended = () => {
      UserListening.updateTrackline(audio);
      moveNextOnce();
    };
    audio.onerror = moveNextOnce;
    audio.play().catch(() => {
      const notice = document.getElementById("listening-audio-notice");
      if (notice) {
        notice.textContent = "Audio is ready. Tap here once to continue.";
        notice.onclick = () => {
          notice.onclick = null;
          notice.textContent = "Audio will play once only. Pausing and rewinding are not available.";
          audio.play().catch(moveNextOnce);
        };
      } else {
        moveNextOnce();
      }
    });
  }, 2000);
};

UserListening.renderPassage = function (section, sectionIndex, startingQuestionNumber = 1) {
  return `
    ${UserListening.renderSectionView(section, sectionIndex)}
    ${UserListening.renderQuestionsForSection(section, sectionIndex, startingQuestionNumber)}
  `;
};

UserListening.applyRestoredAnswers = function (answers) {
  Object.keys(answers || {}).forEach((qid) => {
    const entry = answers[qid];
    const value = entry?.value;

    const fields = Array.from(
      document.querySelectorAll(
        `[name="q_${qid}"], [name^="q_${qid}_"], [data-qid="${qid}"]`
      )
    );

    if (!fields.length) return;

    const first = fields[0];
    const type = String(first.type || "").toLowerCase();
    const tag = String(first.tagName || "").toLowerCase();

    if (type === "radio") {
      fields.forEach((field) => {
        field.checked = String(field.value) === String(value);
      });
      return;
    }

    if (type === "checkbox") {
      const selected = Array.isArray(value) ? value.map(String) : [];
      fields.forEach((field) => {
        field.checked = selected.includes(String(field.value));
      });
      return;
    }

    if (tag === "select") {
      first.value = value == null ? "" : String(value);
      return;
    }

    first.value = value == null ? "" : String(value);
  });
};

UserListening.setInputsDisabled = function (disabled) {
  const content = document.getElementById("reading-user-content");
  if (!content) return;

  const fields = content.querySelectorAll("input, select, textarea, button");
  fields.forEach((field) => {
    if (field.id === "reading-submit-btn") return;
    field.disabled = !!disabled;
  });
};

UserListening.markSubmittedState = function (message) {
  UserListening.__isSubmitted = true;
  UserListening.stopAutoSave();
  UserListening.setInputsDisabled(true);

  const button = document.getElementById("reading-submit-btn");
  if (button) {
    button.disabled = true;
    button.textContent = "Submitted";
    button.style.opacity = "0.7";
    button.style.cursor = "not-allowed";
  }

  if (message) {
    alert(message);
  }
};

UserListening.stopAutoSave = function () {
  if (UserListening.__autoSaveInterval) {
    clearInterval(UserListening.__autoSaveInterval);
    UserListening.__autoSaveInterval = null;
  }

  if (UserListening.__autoSaveContent && UserListening.__autoSaveInputHandler) {
    UserListening.__autoSaveContent.removeEventListener("input", UserListening.__autoSaveInputHandler);
    UserListening.__autoSaveContent.removeEventListener("change", UserListening.__autoSaveInputHandler);
  }
  UserListening.__autoSaveContent = null;
  UserListening.__autoSaveInputHandler = null;

  if (UserListening.__autoSaveVisibilityHandler) {
    document.removeEventListener("visibilitychange", UserListening.__autoSaveVisibilityHandler);
    UserListening.__autoSaveVisibilityHandler = null;
  }

  if (UserListening.__autoSavePageHideHandler) {
    window.removeEventListener("pagehide", UserListening.__autoSavePageHideHandler);
    UserListening.__autoSavePageHideHandler = null;
  }

  UserListening.__autoSaveDirty = false;
  UserListening.__autoSaveInFlight = false;
};

UserListening.initAutoSave = function (data) {
  const content = document.getElementById("reading-user-content");
  const mockId = data?.mock_id;

  if (!content || !mockId) return;

  UserListening.stopAutoSave();
  UserListening.__autoSaveDirty = false;
  UserListening.__autoSaveInFlight = false;
  UserListening.__autoSaveContent = content;

  async function flush(keepalive = false) {
    if (UserListening.__isSubmitted || !UserListening.__autoSaveDirty || UserListening.__autoSaveInFlight) {
      return;
    }

    UserListening.__autoSaveInFlight = true;
    try {
      await UserListening.saveProgress(mockId, { keepalive });
      UserListening.__autoSaveDirty = false;
      if (!keepalive && typeof UserListening.showAutosaveBadge === "function") {
        UserListening.showAutosaveBadge("Saved!");
      }
    } catch (error) {
      console.error("Autosave failed:", error);
    } finally {
      UserListening.__autoSaveInFlight = false;
    }
  }

  UserListening.__autoSaveInputHandler = function () {
    if (UserListening.__isSubmitted) return;
    UserListening.__autoSaveDirty = true;
  };

  content.addEventListener("input", UserListening.__autoSaveInputHandler);
  content.addEventListener("change", UserListening.__autoSaveInputHandler);

  UserListening.__autoSaveInterval = setInterval(() => {
    flush(false);
  }, 5000);

  UserListening.__autoSaveVisibilityHandler = function () {
    if (document.visibilityState === "hidden") {
      flush(true);
    }
  };
  document.addEventListener("visibilitychange", UserListening.__autoSaveVisibilityHandler);

  UserListening.__autoSavePageHideHandler = function () {
    flush(true);
  };
  window.addEventListener("pagehide", UserListening.__autoSavePageHideHandler);
};

UserListening.restoreProgress = async function (data) {
  const mockId = data?.mock_id;
  if (!mockId) return;

  try {
    const progress = await UserListening.loadProgress(mockId);
    const answers = progress?.answers || {};

    UserListening.applyRestoredAnswers(answers);

    if (typeof UserListening.__updateQuestionProgress === "function") {
      UserListening.__updateQuestionProgress();
    }

    if (progress?.is_submitted) {
      UserListening.markSubmittedState("You have already completed this reading test.");
    }
  } catch (error) {
    console.error("Failed to restore progress:", error);
  }
};

window.UserListening = window.UserListening || {};

UserListening.showResultScreen = function (data = {}) {
  const container = document.getElementById("screen-reading");
  if (!container) return;

  const home = document.getElementById("screen-home");
  const profile = document.getElementById("screen-profile");
  const mocks = document.getElementById("screen-mocks");
  const admin = document.getElementById("screen-admin");

  if (home) home.style.display = "none";
  if (profile) profile.style.display = "none";
  if (mocks) mocks.style.display = "none";
  if (admin) admin.style.display = "none";

  container.style.display = "block";
  container.innerHTML = "";

  UserListening.renderResultPage(container, {
    sectionType: "listening",
    overallLabel: "IELTS Listening",
    band: data.band ?? "0.0",
    correct: data.correct ?? 0,
    total: data.total ?? 40,
    backTarget: data.backTarget === "profile" ? "profile" : "home"
  });
};
