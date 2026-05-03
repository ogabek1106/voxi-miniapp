window.ApiClient = window.ApiClient || {};

(function () {
  window.ApiClient.get = function (path) {
    return window.apiGet(path);
  };

  window.ApiClient.post = function (path, body) {
    return window.apiPost(path, body);
  };

  window.ApiClient.put = function (path, body) {
    return window.apiPut(path, body);
  };

  window.ApiClient.delete = function (path) {
    return window.apiDelete(path);
  };
})();
