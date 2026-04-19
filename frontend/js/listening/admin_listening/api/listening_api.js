// frontend/js/listening/admin_listening/api/listening_api.js
window.AdminListeningApi = window.AdminListeningApi || {};

AdminListeningApi._toApiUrl = function (url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${window.API}${url.startsWith("/") ? url : `/${url}`}`;
};

AdminListeningApi.uploadImage = async function (file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${window.API}/admin/upload-image`, {
    method: "POST",
    body: fd
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "Image upload failed");
  const json = JSON.parse(text);
  return {
    url: AdminListeningApi._toApiUrl(json.url),
    raw_url: json.url
  };
};

AdminListeningApi.uploadAudio = async function (file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${window.API}/admin/upload-audio`, {
    method: "POST",
    body: fd
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "Audio upload failed");
  const json = JSON.parse(text);
  return {
    url: AdminListeningApi._toApiUrl(json.url),
    raw_url: json.url
  };
};

AdminListeningApi._normalizeJsonValue = function (value) {
  if (value == null) return null;
  if (typeof value === "string") return { text: value };
  return value;
};

AdminListeningApi._prepareStateForSave = async function (state) {
  const next = JSON.parse(JSON.stringify(state || {}));
  const sections = Array.isArray(next.sections) ? next.sections : [];

  if (next.audio?.file instanceof File) {
    const uploadedAudio = await AdminListeningApi.uploadAudio(next.audio.file);
    next.audio = {
      ...next.audio,
      url: uploadedAudio.raw_url,
      preview_url: uploadedAudio.url
    };
  }

  for (const section of sections) {
    const blocks = Array.isArray(section.blocks) ? section.blocks : [];
    for (const block of blocks) {
      if (block?.image?.file instanceof File) {
        const uploadedImage = await AdminListeningApi.uploadImage(block.image.file);
        block.image = {
          ...block.image,
          url: uploadedImage.raw_url,
          preview_url: uploadedImage.url
        };
      }
    }
  }
  return next;
};

AdminListeningApi._serialize = function (state) {
  const payload = {
    title: state.title || "",
    audio_url: state.audio?.url || state.audio?.preview_url || null,
    time_limit_minutes: Number(state.time_limit_minutes || 60),
    status: "draft",
    sections: []
  };

  (state.sections || []).forEach((section, sectionIndex) => {
    const sectionOut = {
      order_index: sectionIndex + 1,
      section_number: sectionIndex + 1,
      instructions: section.instructions || "",
      blocks: []
    };

    (section.blocks || []).forEach((block, blockIndex) => {
      const blockOut = {
        order_index: blockIndex + 1,
        block_type: block.type,
        title: null,
        instruction: block.instructions || "",
        image_url: block.image?.url || block.image?.preview_url || null,
        start_time_seconds: AdminListeningUtils.parseTimeToSeconds(block.start_time),
        end_time_seconds: AdminListeningUtils.parseTimeToSeconds(block.end_time),
        meta: block.meta || {},
        questions: []
      };

      (block.questions || []).forEach((q, qIndex) => {
        blockOut.questions.push({
          order_index: qIndex + 1,
          question_number: Number(q.number || 0),
          type: null,
          content: AdminListeningApi._normalizeJsonValue(q.content),
          correct_answer: AdminListeningApi._normalizeJsonValue(q.correct_answer),
          meta: q.meta || {}
        });
      });

      sectionOut.blocks.push(blockOut);
    });

    payload.sections.push(sectionOut);
  });

  return payload;
};

AdminListeningApi.saveDraft = async function (packId, state) {
  const prepared = await AdminListeningApi._prepareStateForSave(state);
  const payload = AdminListeningApi._serialize(prepared);
  return await apiPut(`/admin/listening/mock-packs/${packId}`, payload);
};

AdminListeningApi.loadDraft = async function (packId) {
  const data = await apiGet(`/admin/listening/mock-packs/${packId}`);
  const hydrated = AdminListeningState.buildFromApi(data || {});
  return hydrated;
};
