function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function initPatentCube() {
  const root = document.querySelector(".patent-cube");
  const spin = document.querySelector(".patent-cube__spin");
  const pivot = document.querySelector(".patent-cube__pivot");
  const viewport = document.querySelector(".patent-cube__viewport");
  const caseTilt = document.querySelector(".card--case-tilt.sticky");

  if (
    !(root instanceof HTMLElement) ||
    !(spin instanceof HTMLElement) ||
    !(pivot instanceof HTMLElement) ||
    !(viewport instanceof HTMLElement) ||
    !(caseTilt instanceof HTMLElement)
  ) {
    return;
  }

  let rotX = -20;
  let rotY = 32;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  /** @type {number | null} */
  let activePointerId = null;
  /** @type {HTMLElement | null} */
  let captureEl = null;

  const applyTransforms = () => {
    spin.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  };

  applyTransforms();

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

  const endDrag = (e) => {
    if (!(e instanceof PointerEvent)) return;
    if (e.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    viewport.classList.remove("patent-cube__viewport--dragging");
    const rel = captureEl;
    captureEl = null;
    if (rel !== null) {
      try {
        rel.releasePointerCapture(e.pointerId);
      } catch {
        /* capture already released */
      }
    }
  };

  const onPointerMove = (e) => {
    if (!(e instanceof PointerEvent)) return;
    if (!dragging || e.pointerId !== activePointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    rotY += dx * 0.5;
    rotX -= dy * 0.5;
    rotX = clamp(rotX, -88, 88);

    applyTransforms();
    e.preventDefault();
  };

  const onViewportPointerDown = (e) => {
    if (!(e instanceof PointerEvent)) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const t = e.target;
    if (t instanceof Element && t.closest(".patent-cube__gltf") !== null) {
      return;
    }

    dragging = true;
    activePointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    viewport.classList.add("patent-cube__viewport--dragging");
    captureEl = viewport;
    viewport.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  viewport.addEventListener("pointerdown", onViewportPointerDown);
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPatentCube);
} else {
  initPatentCube();
}
