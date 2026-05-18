(function () {
  window.AdminPremiereApi = {
    getPack(packId) {
      return apiGet(`/admin/premiere/${packId}`);
    },
    enable(packId, payload) {
      return apiPost(`/admin/premiere/${packId}/enable`, payload);
    },
    disable(packId) {
      return apiPost(`/admin/premiere/${packId}/disable`, {});
    },
  };
})();
