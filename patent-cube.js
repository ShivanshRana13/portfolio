function initPatentCube() {
  const root = document.querySelector(".patent-cube");
  const viewport = document.querySelector(".patent-cube__viewport");
  const caseTilt = document.querySelector(".card--case-tilt.sticky");

  if (
    !(root instanceof HTMLElement) ||
    !(viewport instanceof HTMLElement) ||
    !(caseTilt instanceof HTMLElement)
  ) {
    return;
  }

  const syncAriaHidden = () => {
    const visible =
      document.body.classList.contains("theme-dark") === true &&
      caseTilt.classList.contains("is-selected") === true;
    root.setAttribute("aria-hidden", visible ? "false" : "true");
    viewport.tabIndex = visible ? 0 : -1;
  };

  syncAriaHidden();

  const mo = new MutationObserver(syncAriaHidden);
  mo.observe(caseTilt, { attributes: true, attributeFilter: ["class"] });
  mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPatentCube);
} else {
  initPatentCube();
}
