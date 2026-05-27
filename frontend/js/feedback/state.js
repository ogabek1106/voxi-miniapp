window.VoxiFeedbackState = window.VoxiFeedbackState || {};

(function () {
  const prefix = "voxi:feedback:";
  const SKIPPED_REPEAT_AFTER = 5;
  const SUBMITTED_REPEAT_AFTER = 15;

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9:_-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 180);
  }

  VoxiFeedbackState.identity = function () {
    const websiteUser = window.WebsiteAuthState?.getUser?.() || null;
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || null;
    const telegramId = window.getTelegramId?.() || websiteUser?.telegram_id || tgUser?.id || null;
    const userId = websiteUser?.id || null;

    return {
      user_id: userId ? Number(userId) : null,
      telegram_id: telegramId ? Number(telegramId) : null,
      local_key: telegramId ? `tg-${telegramId}` : (userId ? `user-${userId}` : "guest"),
    };
  };

  VoxiFeedbackState.storageKey = function (options = {}) {
    const identity = VoxiFeedbackState.identity();
    const feature = normalize(options.featureType || "unknown");
    const context = normalize(VoxiFeedbackState.pathKey(options));
    return `${prefix}${identity.local_key}:${feature}:${context}`;
  };

  VoxiFeedbackState.pathKey = function (options = {}) {
    return options.feedbackPath || options.contextLabel || options.contextKey || "general";
  };

  function normalizeStatus(value) {
    return value === "skipped" ? "skipped" : (value === "submitted" ? "submitted" : null);
  }

  function readRecord(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { handled: false, since: 0, round: 0 };
      if (raw === "1") return { handled: true, since: 0, round: 0 };
      const parsed = JSON.parse(raw);
      const status = normalizeStatus(parsed?.status) || (parsed?.handled ? "submitted" : null);
      return {
        handled: Boolean(parsed?.handled || status),
        status,
        since: Math.max(0, Number(parsed?.since || 0)),
        round: Math.max(0, Number(parsed?.round || 0)),
      };
    } catch (_error) {
      return { handled: false, since: 0, round: 0 };
    }
  }

  function writeRecord(key, record) {
    try {
      localStorage.setItem(key, JSON.stringify({
        handled: Boolean(record.handled),
        status: normalizeStatus(record.status),
        since: Math.max(0, Number(record.since || 0)),
        round: Math.max(0, Number(record.round || 0)),
      }));
    } catch (_error) {
      // Backend anti-duplicate still protects users when storage is unavailable.
    }
  }

  VoxiFeedbackState.prepareRequest = function (options = {}) {
    const key = VoxiFeedbackState.storageKey(options);
    const record = readRecord(key);
    const repeatAfter = record.status === "skipped" ? SKIPPED_REPEAT_AFTER : SUBMITTED_REPEAT_AFTER;

    if (!record.handled) {
      return {
        shouldPrompt: true,
        options: { ...options, _feedbackStorageKey: key },
      };
    }

    record.since += 1;
    if (record.since < repeatAfter) {
      writeRecord(key, record);
      return { shouldPrompt: false, options };
    }

    record.since = 0;
    record.round += 1;
    writeRecord(key, record);
    return {
      shouldPrompt: true,
      options: {
        ...options,
        _feedbackStorageKey: key,
        contextKey: `${options.contextKey || options.contextLabel || "general"}:repeat-${record.round}`,
      },
    };
  };

  VoxiFeedbackState.wasHandled = function (options = {}) {
    try {
      return readRecord(VoxiFeedbackState.storageKey(options)).handled;
    } catch (_error) {
      return false;
    }
  };

  VoxiFeedbackState.markHandled = function (options = {}) {
    const key = options._feedbackStorageKey || VoxiFeedbackState.storageKey(options);
    const record = readRecord(key);
    writeRecord(key, {
      handled: true,
      status: normalizeStatus(options.feedbackStatus) || "submitted",
      since: 0,
      round: record.round || 0,
    });
  };

  VoxiFeedbackState.normalizeFeature = normalize;
})();
