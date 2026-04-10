// frontend/js/user_reading/ui/passage_view.js

window.UserReading = window.UserReading || {};

UserReading.renderPassageView = function (passage, passageIndex) {
  const image = passage.image_url
    ? `<img 
         src="${window.API}${passage.image_url}" 
         class="passage-image"
       />`
    : "";

  return `
    <section class="passage-container" data-passage-index="${passageIndex}">

      <!-- PASSAGE HEADER -->
      <div class="passage-header">
        <div class="passage-number">
          Passage ${passageIndex + 1}
        </div>

        ${
          passage.title
            ? `<div class="passage-title">
                 ${UserReading.escapeHtml(passage.title)}
               </div>`
            : ""
        }
      </div>

      <!-- IMAGE (OPTIONAL) -->
      ${image}

      <!-- PASSAGE BODY -->
      <div class="passage-body">
        ${UserReading.formatPassageText(passage.text)}
      </div>

    </section>
  `;
};



/**
 * Format passage text into paragraphs
 */
UserReading.formatPassageText = function (text) {
  if (!text) return "";

  return String(text)
    .split("\n")
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${UserReading.escapeHtml(p)}</p>`)
    .join("");
};
