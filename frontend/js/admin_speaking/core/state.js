window.AdminSpeakingState = window.AdminSpeakingState || {};

AdminSpeakingState.state = {
  currentPackId: null,
  currentTestId: null
};

AdminSpeakingState.set = function (patch = {}) {
  AdminSpeakingState.state = {
    ...AdminSpeakingState.state,
    ...(patch || {})
  };
  return AdminSpeakingState.state;
};

AdminSpeakingState.get = function () {
  return AdminSpeakingState.state;
};
