// frontend/js/user_reading/ui/passage_view.js

window.UserListening = window.UserListening || {};

UserListening.renderSectionView = function (section, sectionIndex) {
  return `
    <section class="section-container" data-section-index="${sectionIndex}">

      <!-- SECTION HEADER -->
      <div class="section-header">
        <div class="section-number">
          Section ${sectionIndex + 1}
        </div>

        ${
          section.title
            ? `<div class="section-title">
                 ${UserListening.escapeHtml(section.title)}
               </div>`
            : ""
        }
      </div>

      <!-- SECTION BODY -->
      <div class="section-body">
        ${UserListening.formatPassageText(section.text)}
      </div>

    </section>
  `;
};



/**
 * Format section text into paragraphs
 */
UserListening.formatPassageText = function (text) {
  if (!text) return "";

  return String(text)
    .split("\n")
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${UserListening.escapeHtml(p)}</p>`)
    .join("");
};
