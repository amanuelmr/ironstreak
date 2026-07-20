(function () {
  try {
    var stored = localStorage.getItem("ironstreakThemeV2");
    var theme = stored === "light" || stored === "dark" ? stored : "dark";
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = "dark";
  }
})();
