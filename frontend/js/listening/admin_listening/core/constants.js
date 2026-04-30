// frontend/js/listening/admin_listening/core/constants.js
window.AdminListeningConstants = {
  DEFAULT_TIME_LIMIT_MINUTES: 60,
  BLOCK_TYPES: [
    { value: "form_completion", label: "Form Completion", family: "completion", explanation: "Students fill gaps in a form while listening." },
    { value: "note_completion", label: "Note Completion", family: "completion", explanation: "Students complete notes using numbered gaps like [[1]]." },
    { value: "sentence_completion", label: "Sentence Completion", family: "sentence_completion", explanation: "Students complete separate sentence items." },
    { value: "summary_completion", label: "Summary Completion", family: "completion", explanation: "Students complete a short summary with numbered gaps." },
    { value: "flowchart_completion", label: "Flowchart Completion", family: "completion", explanation: "Students complete steps in a flowchart-style text." },
    { value: "table_completion", label: "Table Completion", family: "completion", explanation: "Students complete gaps in a table-style text." },
    { value: "short_answer", label: "Short Answer", family: "short_answer", explanation: "Students answer a question with a short typed response." },
    { value: "mcq_single", label: "Single Choice", family: "choice", explanation: "Students choose one correct answer from the options." },
    { value: "mcq_multiple", label: "Multiple Choice", family: "choice", explanation: "Students select the exact number of correct options." },
    { value: "matching", label: "Matching", family: "matching", explanation: "Students match items to a shared option list." },
    { value: "map_label", label: "Map Label", family: "visual_labeling", explanation: "Students label places on a map." },
    { value: "plan_label", label: "Plan Label", family: "visual_labeling", explanation: "Students label rooms or areas on a plan." },
    { value: "diagram_label", label: "Diagram Label", family: "visual_labeling", explanation: "Students label parts of a diagram." },
    { value: "map_labeling", label: "Map Labeling (legacy)", family: "visual_labeling", explanation: "Students label places on a map or plan." },
    { value: "diagram_labeling", label: "Diagram Labeling (legacy)", family: "visual_labeling", explanation: "Students label parts of a diagram." }
  ],
  WORD_LIMITS: [
    "ONE WORD ONLY",
    "ONE OR TWO WORDS",
    "ONE WORD AND/OR A NUMBER",
    "NO MORE THAN TWO WORDS",
    "NO MORE THAN THREE WORDS"
  ]
};

