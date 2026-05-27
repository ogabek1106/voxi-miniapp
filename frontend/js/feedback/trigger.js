window.VoxiFeedback = window.VoxiFeedback || {};

(function () {
  let activeTimer = null;

  function clean(value, fallback) {
    const out = String(value ?? "").trim();
    return out || fallback;
  }

  function payloadFor(options, response) {
    const identity = VoxiFeedbackState.identity();
    return {
      user_id: identity.user_id,
      telegram_id: identity.telegram_id,
      feature_type: clean(options.featureType, "unknown"),
      context_key: clean(options.contextKey, "general"),
      rating: response.rating || null,
      comment: response.comment || null,
      public_permission: Boolean(response.public_permission),
      status: response.status || "submitted",
    };
  }

  async function submit(options, response) {
    VoxiFeedbackState.markHandled({ ...options, feedbackStatus: response.status || "submitted" });
    try {
      await VoxiFeedbackApi.submit(payloadFor(options, response));
    } catch (error) {
      console.warn("Feedback submit failed:", error);
    }
  }

  VoxiFeedback.requestFeedback = function (options = {}) {
    const featureType = clean(options.featureType, "");
    const contextKey = clean(options.contextKey, "");
    if (!featureType || !contextKey) return false;

    if (activeTimer) clearTimeout(activeTimer);
    activeTimer = setTimeout(() => {
      const prepared = VoxiFeedbackState.prepareRequest(options);
      if (!prepared.shouldPrompt) return;
      const requestOptions = prepared.options;
      VoxiFeedbackUI.open({
        ...requestOptions,
        onSubmit: (response) => submit(requestOptions, response),
        onSkip: () => submit(requestOptions, { status: "skipped" }),
      });
    }, Number(options.delayMs ?? 3000));
    return true;
  };

  VoxiFeedback.cancelPending = function () {
    if (activeTimer) clearTimeout(activeTimer);
    activeTimer = null;
  };
})();
