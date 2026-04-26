window.UserSpeakingApi = window.UserSpeakingApi || {};

UserSpeakingApi.getTelegramUserId = function () {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    || (typeof window.getTelegramId === "function" ? window.getTelegramId() : null)
    || null;
};

UserSpeakingApi.start = async function (mockId) {
  const telegramId = UserSpeakingApi.getTelegramUserId();
  if (!telegramId || !mockId) throw new Error("Missing telegram_id or mock id");
  return apiPost(`/mock-tests/${mockId}/speaking/start`, { telegram_id: telegramId });
};

UserSpeakingApi.savePart = async function (mockId, partNumber, audioUrl) {
  const telegramId = UserSpeakingApi.getTelegramUserId();
  if (!telegramId || !mockId) throw new Error("Missing telegram_id or mock id");

  return apiPost(`/mock-tests/${mockId}/speaking/save`, {
    telegram_id: telegramId,
    part_number: Number(partNumber),
    audio_url: audioUrl || null
  });
};

UserSpeakingApi.submit = async function (mockId, payload, finishType = "manual") {
  const telegramId = UserSpeakingApi.getTelegramUserId();
  if (!telegramId || !mockId) throw new Error("Missing telegram_id or mock id");

  return apiPost(`/mock-tests/${mockId}/speaking/submit`, {
    telegram_id: telegramId,
    part1_audio_url: payload?.part1_audio_url || null,
    part2_audio_url: payload?.part2_audio_url || null,
    part3_audio_url: payload?.part3_audio_url || null,
    finish_type: finishType === "auto" ? "auto" : "manual"
  });
};

UserSpeakingApi.check = async function (mockId) {
  const telegramId = UserSpeakingApi.getTelegramUserId();
  if (!telegramId || !mockId) throw new Error("Missing telegram_id or mock id");

  return apiPost(`/mock-tests/${mockId}/speaking/check`, {
    telegram_id: telegramId
  });
};

UserSpeakingApi.getFullMockResult = async function (mockId) {
  const telegramId = UserSpeakingApi.getTelegramUserId();
  if (!telegramId || !mockId) throw new Error("Missing telegram_id or mock id");

  return apiPost(`/mock-tests/${mockId}/full-result`, {
    telegram_id: telegramId
  });
};

UserSpeakingApi.uploadAudio = async function (blob, fileName = "speaking.webm") {
  const fd = new FormData();
  fd.append("file", new File([blob], fileName, { type: blob.type || "audio/webm" }));

  const response = await fetch(`${window.API}/speaking-audio/upload`, {
    method: "POST",
    body: fd
  });

  if (!response.ok) {
    throw new Error(await response.text() || `Audio upload failed: ${response.status}`);
  }

  const data = await response.json();
  const relativeUrl = String(data?.url || "").trim();
  if (!relativeUrl) throw new Error("Audio upload API returned empty url");
  return relativeUrl.startsWith("/") ? relativeUrl : `/${relativeUrl}`;
};
