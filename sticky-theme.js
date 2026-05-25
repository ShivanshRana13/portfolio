function initStickyTheme() {
  const body = document.body;
  const scene = document.querySelector(".scene");
  const caseTiltSticky = document.querySelector(".card--case-tilt.sticky");
  const stickies = Array.from(document.querySelectorAll(".sticky"));
  if (stickies.length === 0) return;

  /** @type {WeakMap<Element, { x: number; y: number }>} */
  const pressOrigin = new WeakMap();

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const enableDarkCanvas = () => {
    if (body.classList.contains("theme-dark")) return;
    body.classList.add("theme-dark");
  };

  const syncScenePatentCube = () => {
    if (!(scene instanceof HTMLElement)) return;
    const active =
      caseTiltSticky instanceof HTMLElement && caseTiltSticky.classList.contains("is-selected") === true;
    scene.classList.toggle("scene--patent-cube-active", active);
  };

  const clearSelection = () => {
    for (const el of stickies) el.classList.remove("is-selected");
    body.classList.remove("theme-dark");
    syncScenePatentCube();
  };

  const setSelected = (target) => {
    for (const el of stickies) {
      el.classList.toggle("is-selected", el === target);
    }
    enableDarkCanvas();
    syncScenePatentCube();
  };

  const toggleStickySelection = (sticky) => {
    if (sticky.classList.contains("is-selected") === true) {
      clearSelection();
      return;
    }
    setSelected(sticky);
  };

  for (const sticky of stickies) {
    sticky.addEventListener("pointerdown", (e) => {
      if (!(e instanceof PointerEvent)) return;
      pressOrigin.set(sticky, { x: e.clientX, y: e.clientY });
    });

    sticky.addEventListener("click", (e) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest(".sticky-badge") !== null) return;

      // Avoid treating drags as selections.
      const start = pressOrigin.get(sticky);
      if (!start) {
        toggleStickySelection(sticky);
        return;
      }
      const moved = distance(start, { x: e.clientX, y: e.clientY });
      if (moved > 6) return;

      toggleStickySelection(sticky);
    });

    sticky.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      toggleStickySelection(sticky);
    });
  }

  document.addEventListener("pointerdown", (e) => {
    if (!(e instanceof PointerEvent)) return;
    const target = e.target;
    if (!(target instanceof Element)) return;

    // Keep selection when interacting with a sticky or the 3D frame.
    if (target.closest(".sticky") !== null) return;
    if (target.closest(".patent-cube") !== null) return;

    // Empty canvas / background — clear selection and return to light mode.
    clearSelection();
  });

  // Escape clears selection (nice UX for keyboard users).
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    clearSelection();
  });

  syncScenePatentCube();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStickyTheme);
} else {
  initStickyTheme();
}
