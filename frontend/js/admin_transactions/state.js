window.AdminTransactionsState = window.AdminTransactionsState || {};

(function () {
  const defaults = {
    q: "",
    order_ref: "",
    provider: "",
    product_type: "",
    order_status: "",
    fulfillment_status: "",
    provider_state: "",
    filter_telegram_id: "",
    user_id: "",
    amount_min: "",
    amount_max: "",
    created_from: "",
    created_to: "",
    paid_from: "",
    paid_to: "",
    fulfilled_only: "",
    failed_only: "",
    cancelled_only: "",
    expired_only: "",
    page: 1,
    page_size: 25,
    sort_by: "created_at",
    sort_dir: "desc"
  };

  let state = {
    filters: { ...defaults },
    items: [],
    summary: {},
    pagination: { page: 1, page_size: 25, total: 0, total_pages: 0 },
    detail: null
  };

  AdminTransactionsState.defaults = function () {
    return { ...defaults };
  };

  AdminTransactionsState.get = function () {
    return state;
  };

  AdminTransactionsState.set = function (patch) {
    state = {
      ...state,
      ...patch,
      filters: patch?.filters ? { ...state.filters, ...patch.filters } : state.filters
    };
  };

  AdminTransactionsState.resetFilters = function () {
    state.filters = { ...defaults };
  };
})();
