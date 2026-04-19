// frontend/js/listening/admin_listening/core/constants.js
window.AdminListeningConstants = {
  DEFAULT_TIME_LIMIT_MINUTES: 60,
  BLOCK_TYPES: [
    { value: "form_completion", label: "Form Completion", family: "text_completion" },
    { value: "note_completion", label: "Note Completion", family: "text_completion" },
    { value: "sentence_completion", label: "Sentence Completion", family: "text_completion" },
    { value: "summary_completion", label: "Summary Completion", family: "text_completion" },
    { value: "table_completion", label: "Table Completion", family: "structured_completion" },
    { value: "flowchart_completion", label: "Flowchart Completion", family: "structured_completion" },
    { value: "mcq_single", label: "MCQ Single", family: "choice" },
    { value: "mcq_multiple", label: "MCQ Multiple", family: "choice" },
    { value: "matching", label: "Matching", family: "matching" },
    { value: "map_labeling", label: "Map Labeling", family: "visual_labeling" },
    { value: "diagram_labeling", label: "Diagram Labeling", family: "visual_labeling" }
  ]
};

