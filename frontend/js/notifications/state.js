window.VoxiNotificationsState = window.VoxiNotificationsState || {};

(function () {
  let state = {
    items: [],
    unreadCount: 0,
    isOpen: false
  };
  const subscribers = new Set();

  VoxiNotificationsState.get = function () {
    return { ...state, items: [...state.items] };
  };

  VoxiNotificationsState.set = function (patch = {}) {
    state = { ...state, ...patch };
    subscribers.forEach((fn) => fn(VoxiNotificationsState.get()));
  };

  VoxiNotificationsState.subscribe = function (fn) {
    if (typeof fn !== "function") return () => {};
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  };
})();
