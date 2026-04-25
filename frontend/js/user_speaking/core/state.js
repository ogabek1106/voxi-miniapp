window.UserSpeakingState = window.UserSpeakingState || {};

UserSpeakingState._state = {
  mockId: null,
  testId: null,
  title: "",
  isAdmin: false,
  isSubmitted: false,
  parts: [],
  progress: {
    part1_audio_url: null,
    part2_audio_url: null,
    part3_audio_url: null
  },
  partIndex: 0,
  timer: {
    startedAt: null,
    endsAt: null,
    durationSeconds: 18 * 60
  },
  intervals: {
    globalTimer: null,
    prepCountdown: null,
    recordTick: null
  },
  recorder: null,
  audioContext: null,
  stream: null
};

UserSpeakingState.get = function () {
  return UserSpeakingState._state;
};

UserSpeakingState.set = function (patch) {
  UserSpeakingState._state = {
    ...UserSpeakingState._state,
    ...patch
  };
  return UserSpeakingState._state;
};

UserSpeakingState.reset = function () {
  const state = UserSpeakingState.get();
  Object.values(state.intervals || {}).forEach((timerId) => {
    if (timerId) clearInterval(timerId);
  });

  if (state.recorder && typeof state.recorder.cleanup === "function") {
    state.recorder.cleanup();
  }

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
  }

  if (state.audioContext && typeof state.audioContext.close === "function") {
    state.audioContext.close().catch(() => {});
  }

  UserSpeakingState._state = {
    mockId: null,
    testId: null,
    title: "",
    isAdmin: false,
    isSubmitted: false,
    parts: [],
    progress: {
      part1_audio_url: null,
      part2_audio_url: null,
      part3_audio_url: null
    },
    partIndex: 0,
    timer: {
      startedAt: null,
      endsAt: null,
      durationSeconds: 18 * 60
    },
    intervals: {
      globalTimer: null,
      prepCountdown: null,
      recordTick: null
    },
    recorder: null,
    audioContext: null,
    stream: null
  };
};
