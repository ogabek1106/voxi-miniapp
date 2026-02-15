window.goHome = function () {
  document.getElementById("screen-home").style.display = "block";
  document.getElementById("screen-mocks").style.display = "none";
  document.getElementById("screen-name").style.display = "none";

  const navs = document.querySelectorAll(".nav-btn");
  navs.forEach(n => n.classList.remove("active"));
  navs[0].classList.add("active");
};

window.goProfile = function () {
  const content = document.getElementById("content");
  content.innerHTML = `
    <h3>Profile</h3>
    <p>Stats will be here later.</p>
  `;

  const navs = document.querySelectorAll(".nav-btn");
  navs.forEach(n => n.classList.remove("active"));
  navs[1].classList.add("active");
};

window.openMockHome = function () {
  // For now: just switch to mocks screen (UI only)
  document.getElementById("screen-home").style.display = "none";
  document.getElementById("screen-mocks").style.display = "block";
};
