window.UserWritingApi = window.UserWritingApi || {};

UserWritingApi.getTelegramUserId = function () {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    || (typeof window.getTelegramId === "function" ? window.getTelegramId() : null)
    || null;
};

UserWritingApi.start = async function (mockId, options = {}) {
  const telegramId = UserWritingApi.getTelegramUserId();
  if (!telegramId || !mockId) throw new Error("Missing telegram_id or mock id");
  return await apiPost(`/mock-tests/${mockId}/writing/start`, {
    telegram_id: telegramId,
    session_mode: options.sessionMode || "single_block",
    retake: Boolean(options.retakePaymentReferenceId),
    retake_payment_reference_id: options.retakePaymentReferenceId || null
  });
};

UserWritingApi.save = async function (mockId, payload, options = {}) {
  const telegramId = UserWritingApi.getTelegramUserId();
  if (!telegramId || !mockId) return null;

  const body = {
    telegram_id: telegramId,
    session_mode: window.UserWritingState?.get?.()?.sessionMode || "single_block",
    task1_text: payload?.task1_text || "",
    task1_image_url: payload?.task1_image_url || null,
    task2_text: payload?.task2_text || "",
    task2_image_url: payload?.task2_image_url || null
  };

  if (options.keepalive) {
    const res = await fetch(`${window.API}/mock-tests/${mockId}/writing/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true
    });

    if (!res.ok) {
      throw new Error(await res.text() || "Failed to save writing progress");
    }
    const text = await res.text();
    return text ? JSON.parse(text) : { status: "saved" };
  }

  return await apiPost(`/mock-tests/${mockId}/writing/save`, body);
};

UserWritingApi.submit = async function (mockId, payload, finishType = "manual") {
  const telegramId = UserWritingApi.getTelegramUserId();
  if (!telegramId || !mockId) throw new Error("Missing telegram_id or mock id");

  return await apiPost(`/mock-tests/${mockId}/writing/submit`, {
    telegram_id: telegramId,
    session_mode: window.UserWritingState?.get?.()?.sessionMode || "single_block",
    task1_text: payload?.task1_text || "",
    task1_image_url: payload?.task1_image_url || null,
    task2_text: payload?.task2_text || "",
    task2_image_url: payload?.task2_image_url || null,
    finish_type: finishType === "auto" ? "auto" : "manual"
  });
};

UserWritingApi.check = async function (mockId) {
  const telegramId = UserWritingApi.getTelegramUserId();
  if (!telegramId || !mockId) throw new Error("Missing telegram_id or mock id");

  return await apiPost(`/mock-tests/${mockId}/writing/check`, {
    telegram_id: telegramId,
    session_mode: window.UserWritingState?.get?.()?.sessionMode || "single_block"
  });
};

UserWritingApi.resume = async function (mockId) {
  const telegramId = UserWritingApi.getTelegramUserId();
  if (!telegramId || !mockId) return null;
  return await apiGet(`/mock-tests/${mockId}/writing/resume?telegram_id=${telegramId}&session_mode=${encodeURIComponent(window.UserWritingState?.get?.()?.sessionMode || "single_block")}`);
};

UserWritingApi.uploadImage = async function (file) {
  const fd = new FormData();
  fd.append("file", file);

  const response = await fetch(`${window.API}/admin/upload-image`, {
    method: "POST",
    body: fd
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const data = await response.json();
  const relativeUrl = String(data?.url || "").trim();
  if (!relativeUrl) throw new Error("Upload API returned empty url");

  const normalized = relativeUrl.startsWith("/") ? relativeUrl : `/${relativeUrl}`;
  return {
    relativeUrl: normalized,
    fullUrl: `${window.API}${normalized}`
  };
};
