window.WebsiteAuthState = window.WebsiteAuthState || {};

(function () {
  let currentUser = null;
  let initialized = false;
  const subscribers = new Set();

  function notify() {
    subscribers.forEach((subscriber) => subscriber(currentUser));
  }

  window.WebsiteAuthState.subscribe = function (subscriber) {
    subscribers.add(subscriber);
    subscriber(currentUser);
    return () => subscribers.delete(subscriber);
  };

  window.WebsiteAuthState.getUser = function () {
    return currentUser;
  };

  window.WebsiteAuthState.isAuthenticated = function () {
    return Boolean(currentUser);
  };

  window.WebsiteAuthState.setUser = function (user) {
    currentUser = user || null;
    initialized = true;
    notify();
  };

  window.WebsiteAuthState.load = async function () {
    try {
      const user = await window.WebsiteAuthApi.me();
      window.WebsiteAuthState.setUser(user);
      return user;
    } catch (error) {
      currentUser = null;
      initialized = true;
      notify();
      return null;
    }
  };

  window.WebsiteAuthState.hasInitialized = function () {
    return initialized;
  };

  window.WebsiteAuthState.logout = async function () {
    await window.WebsiteAuthApi.logout();
    window.WebsiteAuthState.setUser(null);
  };
})();
