window.AdminShadowWritingApi = window.AdminShadowWritingApi || {};

(function () {
  AdminShadowWritingApi.createEssay = function (payload) {
    return apiPost("/admin/shadow-writing/essays", payload);
  };

  AdminShadowWritingApi.listEssays = function () {
    return apiGet("/admin/shadow-writing/essays");
  };

  AdminShadowWritingApi.deleteEssay = function (essayId) {
    return apiDelete(`/admin/shadow-writing/essays/${Number(essayId)}`);
  };
})();
