window.AdminLearningApi = window.AdminLearningApi || {};

(function () {
  function adminId() {
    return Number(window.getTelegramId?.() || 0);
  }

  function adminQuery() {
    return `telegram_id=${encodeURIComponent(adminId())}`;
  }

  AdminLearningApi.listMonths = function () {
    return apiGet(`/admin/learning/months?${adminQuery()}`);
  };

  AdminLearningApi.createMonth = function (payload) {
    return apiPost(`/admin/learning/months?${adminQuery()}`, payload);
  };

  AdminLearningApi.updateMonth = function (id, payload) {
    return apiPut(`/admin/learning/months/${Number(id)}?${adminQuery()}`, payload);
  };

  AdminLearningApi.deleteMonth = function (id) {
    return apiDelete(`/admin/learning/months/${Number(id)}?${adminQuery()}`);
  };

  AdminLearningApi.listDays = function (monthId) {
    return apiGet(`/admin/learning/months/${Number(monthId)}/days?${adminQuery()}`);
  };

  AdminLearningApi.createDay = function (monthId, payload) {
    return apiPost(`/admin/learning/months/${Number(monthId)}/days?${adminQuery()}`, payload);
  };

  AdminLearningApi.getDay = function (dayId) {
    return apiGet(`/admin/learning/days/${Number(dayId)}?${adminQuery()}`);
  };

  AdminLearningApi.updateDay = function (dayId, payload) {
    return apiPut(`/admin/learning/days/${Number(dayId)}?${adminQuery()}`, payload);
  };

  AdminLearningApi.deleteDay = function (dayId) {
    return apiDelete(`/admin/learning/days/${Number(dayId)}?${adminQuery()}`);
  };

  AdminLearningApi.createBlock = function (dayId, payload) {
    return apiPost(`/admin/learning/days/${Number(dayId)}/blocks?${adminQuery()}`, payload);
  };

  AdminLearningApi.updateBlock = function (blockId, payload) {
    return apiPut(`/admin/learning/blocks/${Number(blockId)}?${adminQuery()}`, payload);
  };

  AdminLearningApi.deleteBlock = function (blockId) {
    return apiDelete(`/admin/learning/blocks/${Number(blockId)}?${adminQuery()}`);
  };

  AdminLearningApi.reorderBlocks = function (dayId, blockIds) {
    return apiPost(`/admin/learning/days/${Number(dayId)}/blocks/reorder?${adminQuery()}`, {
      block_ids: (blockIds || []).map(Number),
    });
  };

  AdminLearningApi.previewDay = function (dayId) {
    return apiGet(`/admin/learning/days/${Number(dayId)}/preview?${adminQuery()}`);
  };
})();
