window.UserWritingState = window.UserWritingState || {};

UserWritingState.state = {
  mockId: null,
  testId: null,
  isSubmitted: false,
  autoSaveDirty: false,
  autoSaveInFlight: false,
  autoSaveInterval: null,
  timerInterval: null,
  visibilityHandler: null,
  pageHideHandler: null
};

UserWritingState.get = function () {
  return UserWritingState.state;
};

UserWritingState.set = function (patch = {}) {
  UserWritingState.state = {
    ...UserWritingState.state,
    ...(patch || {})
  };
  return UserWritingState.state;
};
