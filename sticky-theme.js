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

  const setSelected = (target) => {
    for (const el of stickies) {
      el.classList.toggle("is-selected", el === target);
    }
    enableDarkCanvas();
    syncScenePatentCube();
  };

  for (const sticky of stickies) {
    sticky.addEventListener("pointerdown", (e) => {
      if (!(e instanceof PointerEvent)) return;
      pressOrigin.set(sticky, { x: e.clientX, y: e.clientY });
    });

    sticky.addEventListener("click", (e) => {
      // Avoid treating drags as selections.
      const start = pressOrigin.get(sticky);
      if (!start) {
        setSelected(sticky);
        return;
      }
      const moved = distance(start, { x: e.clientX, y: e.clientY });
      if (moved > 6) return;

      setSelected(sticky);
    });

    sticky.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      setSelected(sticky);
    });
  }

  document.addEventListener("pointerdown", (e) => {
    if (!(e instanceof PointerEvent)) return;
    const target = e.target;
    if (!(target instanceof Element)) return;

    // Click outside stickies clears selection + returns to light canvas.
    if (!target.closest(".sticky") && !target.closest(".patent-cube")) {
      for (const el of stickies) el.classList.remove("is-selected");
      body.classList.remove("theme-dark");
      syncScenePatentCube();
    }
  });

  // Escape clears selection (nice UX for keyboard users).
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    for (const el of stickies) el.classList.remove("is-selected");
    body.classList.remove("theme-dark");
    syncScenePatentCube();
  });

  syncScenePatentCube();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStickyTheme);
} else {
  initStickyTheme();
}
