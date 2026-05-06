window.ShadowWritingState = window.ShadowWritingState || {};

(function () {
  const state = {
    attemptId: null,
    essay: null,
    startedAt: null,
    completed: false,
    result: null,
  };

  ShadowWritingState.get = function () {
    return { ...state };
  };

  ShadowWritingState.set = function (patch = {}) {
    Object.assign(state, patch);
    return ShadowWritingState.get();
  };

  ShadowWritingState.reset = function () {
    state.attemptId = null;
    state.essay = null;
    state.startedAt = null;
    state.completed = false;
    state.result = null;
  };
})();
