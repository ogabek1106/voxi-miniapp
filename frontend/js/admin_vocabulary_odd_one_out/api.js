window.AdminVocabularyOddOneOutApi = window.AdminVocabularyOddOneOutApi || {};

(function () {
  function telegramId() {
    const id = window.getTelegramId?.();
    if (!id) throw new Error("telegram_id_required");
    return encodeURIComponent(id);
  }

  AdminVocabularyOddOneOutApi.list = function () {
    return apiGet(`/admin/vocabulary/odd-one-out/sets?telegram_id=${telegramId()}`);
  };

  AdminVocabularyOddOneOutApi.create = function (payload) {
    return apiPost(`/admin/vocabulary/odd-one-out/sets?telegram_id=${telegramId()}`, payload);
  };

  AdminVocabularyOddOneOutApi.update = function (setId, payload) {
    return apiPut(`/admin/vocabulary/odd-one-out/sets/${Number(setId)}?telegram_id=${telegramId()}`, payload);
  };

  AdminVocabularyOddOneOutApi.remove = function (setId) {
    return apiDelete(`/admin/vocabulary/odd-one-out/sets/${Number(setId)}?telegram_id=${telegramId()}`);
  };

  AdminVocabularyOddOneOutApi.publish = function (setId) {
    return apiRequest(`/admin/vocabulary/odd-one-out/sets/${Number(setId)}/publish?telegram_id=${telegramId()}`, {
      method: "PATCH",
    });
  };

  AdminVocabularyOddOneOutApi.draft = function (setId) {
    return apiRequest(`/admin/vocabulary/odd-one-out/sets/${Number(setId)}/draft?telegram_id=${telegramId()}`, {
      method: "PATCH",
    });
  };

  AdminVocabularyOddOneOutApi.uploadImageFile = async function (file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${window.API}/admin/upload-image`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    const relativeUrl = String(data?.url || "").trim();
    if (!relativeUrl) {
      throw new Error("Upload API returned empty url");
    }

    const normalized = relativeUrl.startsWith("/") ? relativeUrl : `/${relativeUrl}`;
    return {
      relativeUrl: normalized,
      fullUrl: `${window.API}${normalized}`,
    };
  };
})();
