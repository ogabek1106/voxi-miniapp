// frontend/js/admin_reading/question_types/options.js
window.AdminReading = window.AdminReading || {};
window.addOption = function(btn) {
  const wrap = btn.closest(".q-options-wrap");
  const list = wrap.querySelector(".q-options-list");

  const option = document.createElement("div");
  option.className = "q-option";
  option.style.display = "flex";

  option.style.gap = "8px";
  option.style.marginTop = "6px";

  option.innerHTML = `

<div style="
  display:flex;
  align-items:stretch;
  width:100%;
  border:1px solid #ddd;
  border-radius:6px;
  overflow:hidden;
  height:34px;
">

  <div class="opt-letter" style="
    width:36px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:700;
    background:#f8f8f8;
    border-right:1px solid rgba(0,0,0,0.4);
  ">
    A
  </div>

  <input
  class="opt-text"
  placeholder="Option text"
  style="
    flex:1;
    border:none;
    outline:none;
    padding:0 10px;
    font-size:14px;
    height:100%;
    box-sizing:border-box;
    transform:translateY(-10px);
  "
/>

</div>

<button
  type="button"
  onclick="removeOption(this)"
  style="
    width:34px;
    height:34px;
    min-width:34px;
    border-radius:50%;
    border:none;
    background:#fee2e2;
    color:#b91c1c;
    font-weight:700;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    flex:0 0 auto;
    transform:translateY(-10px);
  "
>
  ×
</button>

`;
  list.appendChild(option);

  const block = btn.closest(".question-block");
  renderOptions(block);
};

window.removeOption = function(btn) {

  const option = btn.closest(".q-option");
  const block = btn.closest(".question-block");

  option.remove();

  requestAnimationFrame(() => {
    renderOptions(block);
  });

};
