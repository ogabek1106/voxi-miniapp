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
  const sourceSections = Array.isArray(state?.sections) ? state.sections : [];

  if (state?.global_instruction_1_audio?.file instanceof File) {
    const uploadedAudio = await AdminListeningApi.uploadAudio(state.global_instruction_1_audio.file);
    next.global_instruction_1_audio = {
      ...next.global_instruction_1_audio,
      url: uploadedAudio.raw_url,
      preview_url: uploadedAudio.url
    };
  }

  for (const [sectionIndex, section] of sections.entries()) {
    const sourceSection = sourceSections[sectionIndex] || {};
    if (sourceSection.audio?.file instanceof File) {
      const uploadedAudio = await AdminListeningApi.uploadAudio(sourceSection.audio.file);
      section.audio = {
        ...section.audio,
        url: uploadedAudio.raw_url,
        preview_url: uploadedAudio.url
      };
    }
    if (sourceSection.global_instruction_after_audio?.file instanceof File) {
      const uploadedAudio = await AdminListeningApi.uploadAudio(sourceSection.global_instruction_after_audio.file);
      section.global_instruction_after_audio = {
        ...section.global_instruction_after_audio,
        url: uploadedAudio.raw_url,
        preview_url: uploadedAudio.url
      };
    }
    const blocks = Array.isArray(section.blocks) ? section.blocks : [];
    const sourceBlocks = Array.isArray(sourceSection.blocks) ? sourceSection.blocks : [];
    for (const [blockIndex, block] of blocks.entries()) {
      const sourceBlock = sourceBlocks[blockIndex] || {};
      if (sourceBlock?.image?.file instanceof File) {
        const uploadedImage = await AdminListeningApi.uploadImage(sourceBlock.image.file);
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
    audio_url: null,
    global_instruction_intro: state.global_instruction_1 || "",
    global_instruction_intro_audio_url:
      state.global_instruction_1_audio?.url || state.global_instruction_1_audio?.preview_url || null,
    global_instruction_intro_audio_name: state.global_instruction_1_audio?.name || null,
    time_limit_minutes: Number(state.time_limit_minutes || 60),
    status: "draft",
    sections: []
  };

  (state.sections || []).forEach((section, sectionIndex) => {
    const sectionOut = {
      order_index: sectionIndex + 1,
      section_number: sectionIndex + 1,
      instructions: section.instructions || "",
      audio_url: section.audio?.url || section.audio?.preview_url || null,
      audio_name: section.audio?.name || null,
      global_instruction_after: section.global_instruction_after || "",
      global_instruction_after_audio_url:
        section.global_instruction_after_audio?.url || section.global_instruction_after_audio?.preview_url || null,
      global_instruction_after_audio_name: section.global_instruction_after_audio?.name || null,
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

      blockOut.questions = window.AdminListeningTypeRegistry?.serializeBlock
        ? AdminListeningTypeRegistry.serializeBlock(block, blockIndex)
        : (block.questions || []).map((q, qIndex) => ({
            order_index: qIndex + 1,
            question_number: Number(q.number || 0),
            type: block.type || null,
            content: AdminListeningApi._normalizeJsonValue(q.content),
            correct_answer: AdminListeningApi._normalizeJsonValue(q.correct_answer),
            meta: q.meta || {}
          }));

      sectionOut.blocks.push(blockOut);
    });

    payload.sections.push(sectionOut);
  });

  return payload;
};

AdminListeningApi.validateState = function (state) {
  const errors = [];
  (state.sections || []).forEach((section, sectionIndex) => {
    (section.blocks || []).forEach((block, blockIndex) => {
      const blockErrors = window.AdminListeningTypeRegistry?.validateBlock
        ? AdminListeningTypeRegistry.validateBlock(block)
        : [];
      block.validation_errors = blockErrors;
      blockErrors.forEach((message) => {
        errors.push(`Part ${sectionIndex + 1}, question block ${blockIndex + 1}: ${message}`);
      });
    });
  });
  return errors;
};

AdminListeningApi.saveDraft = async function (packId, state) {
  const errors = AdminListeningApi.validateState(state);
  if (errors.length) {
    throw new Error(errors.join("\n"));
  }
  const prepared = await AdminListeningApi._prepareStateForSave(state);
  const payload = AdminListeningApi._serialize(prepared);
  return await apiPut(`/admin/listening/mock-packs/${packId}`, payload);
};

AdminListeningApi.loadDraft = async function (packId) {
  const data = await apiGet(`/admin/listening/mock-packs/${packId}`);
  const hydrated = AdminListeningState.buildFromApi(data || {});
  return hydrated;
};
