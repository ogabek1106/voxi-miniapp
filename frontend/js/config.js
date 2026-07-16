window.AppConfig = window.AppConfig || {};

(function () {
  const defaults = {
    features: {
      vcoin_enabled: false,
      uzs_payments_enabled: true
    }
  };
  let config = { ...defaults, features: { ...defaults.features } };
  const subscribers = new Set();

  function normalize(raw) {
    const features = raw?.features || {};
    return {
      ...defaults,
      ...raw,
      features: {
        ...defaults.features,
        ...features,
        vcoin_enabled: features.vcoin_enabled === true,
        uzs_payments_enabled: features.uzs_payments_enabled !== false
      }
    };
  }

  function notify() {
    subscribers.forEach((subscriber) => subscriber(config));
  }

  window.AppConfig.get = function () {
    return config;
  };

  window.AppConfig.isVcoinEnabled = function () {
    return config.features.vcoin_enabled === true;
  };

  window.AppConfig.isUzsPaymentsEnabled = function () {
    return config.features.uzs_payments_enabled !== false;
  };

  window.AppConfig.subscribe = function (subscriber) {
    subscribers.add(subscriber);
    subscriber(config);
    return () => subscribers.delete(subscriber);
  };

  window.AppConfig.ready = (async function loadConfig() {
    try {
      const raw = await window.apiGet("/config");
      config = normalize(raw || {});
      notify();
    } catch (error) {
      console.warn("Using default app config", error);
    }
    return config;
  })();
})();
