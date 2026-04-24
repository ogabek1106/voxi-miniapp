window.AdminWritingState = window.AdminWritingState || {};

AdminWritingState.state = {
  currentPackId: null,
  currentTestId: null
};

AdminWritingState.set = function (patch = {}) {
  AdminWritingState.state = {
    ...AdminWritingState.state,
    ...(patch || {})
  };
  return AdminWritingState.state;
};

AdminWritingState.get = function () {
  return AdminWritingState.state;
};
