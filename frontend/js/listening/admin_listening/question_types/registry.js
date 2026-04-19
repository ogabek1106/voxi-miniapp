// frontend/js/listening/admin_listening/question_types/registry.js
window.AdminListeningTypeRegistry = window.AdminListeningTypeRegistry || {};

AdminListeningTypeRegistry.renderTypeEditor = function (ctx) {
  const type = ctx?.block?.type;
  const info = window.AdminListeningUtils?.getTypeInfo(type);
  const family = info?.family;

  if (family === "text_completion" && window.AdminListeningTypeTextCompletion) {
    return AdminListeningTypeTextCompletion.render(ctx);
  }
  if (family === "structured_completion" && window.AdminListeningTypeStructuredCompletion) {
    return AdminListeningTypeStructuredCompletion.render(ctx);
  }
  if (family === "choice" && window.AdminListeningTypeChoice) {
    return AdminListeningTypeChoice.render(ctx);
  }
  if (family === "matching" && window.AdminListeningTypeMatching) {
    return AdminListeningTypeMatching.render(ctx);
  }
  if (family === "visual_labeling" && window.AdminListeningTypeVisualLabeling) {
    return AdminListeningTypeVisualLabeling.render(ctx);
  }

  const fallback = document.createElement("div");
  fallback.textContent = `Unsupported block type: ${type}`;
  fallback.style.opacity = "0.7";
  fallback.style.fontSize = "13px";
  return fallback;
};

