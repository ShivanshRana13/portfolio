function initStickyTheme() {
  const body = document.body;
  const scene = document.querySelector(".scene");
  const caseTiltSticky = document.querySelector(".card--case-tilt.sticky");
  const stickies = Array.from(document.querySelectorAll(".sticky"));
  if (stickies.length === 0) return;

  /** @type {WeakMap<Element, { x: number; y: number }>} */
  const pressOrigin = new WeakMap();

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const starSticky = document.querySelector(".sticky--star");
  const aboutPage = document.querySelector(".about-page");
  const starLabel = starSticky?.querySelector(".sticky-star__label");
  const CALENDLY_URL = "https://calendly.com/shivanshrana13/coffee-chat-w-shivansh";

  const syncStarStickyLabel = () => {
    if (!(starSticky instanceof HTMLElement)) return;
    const selected = starSticky.classList.contains("is-selected") === true;
    if (starLabel instanceof HTMLElement) {
      starLabel.textContent = selected ? "Let's chat!" : "About me";
    }
    starSticky.setAttribute("aria-label", selected ? "Let's chat" : "About me");
  };

  const openCalendly = () => {
    window.open(CALENDLY_URL, "_blank", "noopener,noreferrer");
  };

  const syncScenePatentCube = () => {
    if (!(scene instanceof HTMLElement)) return;
    const active =
      caseTiltSticky instanceof HTMLElement && caseTiltSticky.classList.contains("is-selected") === true;
    scene.classList.toggle("scene--patent-cube-active", active);
  };

  const syncAboutPage = () => {
    const active =
      starSticky instanceof HTMLElement && starSticky.classList.contains("is-selected") === true;
    if (scene instanceof HTMLElement) {
      scene.classList.toggle("scene--about-active", active);
    }
    if (aboutPage instanceof HTMLElement) {
      aboutPage.hidden = !active;
      aboutPage.setAttribute("aria-hidden", active ? "false" : "true");
    }
  };

  const collageGroup = document.querySelector(".about-page__collage-group");
  const MOBILE_COLLAGE_MAX_PX = 640;

  const isMobileCollageViewport = () =>
    window.matchMedia(`(max-width: ${MOBILE_COLLAGE_MAX_PX}px)`).matches;

  let collageDragPointerId = null;
  let collageDragStartX = 0;
  let collageDragStartY = 0;
  let collageOffsetX = 0;
  let collageOffsetY = 0;

  const resetCollageDrag = () => {
    collageDragPointerId = null;
    collageOffsetX = 0;
    collageOffsetY = 0;
    if (collageGroup instanceof HTMLElement) {
      collageGroup.classList.remove("about-page__collage-group--dragging");
      collageGroup.style.setProperty("--collage-x", "0px");
      collageGroup.style.setProperty("--collage-y", "0px");
    }
  };

  const applyCollageDragOffset = () => {
    if (!(collageGroup instanceof HTMLElement)) return;
    collageGroup.style.setProperty("--collage-x", `${collageOffsetX}px`);
    collageGroup.style.setProperty("--collage-y", `${collageOffsetY}px`);
  };

  const clearSelection = () => {
    for (const el of stickies) el.classList.remove("is-selected");
    body.classList.remove("theme-dark");
    body.classList.remove("theme-focus-light");
    syncScenePatentCube();
    syncAboutPage();
    syncStarStickyLabel();
    resetCollageDrag();
  };

  const setSelected = (target) => {
    for (const el of stickies) {
      el.classList.toggle("is-selected", el === target);
    }
    body.classList.remove("theme-dark");
    body.classList.remove("theme-focus-light");
    if (target === starSticky) {
      body.classList.add("theme-focus-light");
    } else {
      body.classList.add("theme-dark");
    }
    syncScenePatentCube();
    syncAboutPage();
    syncStarStickyLabel();
  };

  const activateSticky = (sticky) => {
    if (sticky === starSticky && sticky.classList.contains("is-selected") === true) {
      openCalendly();
      return;
    }
    toggleStickySelection(sticky);
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
        activateSticky(sticky);
        return;
      }
      const moved = distance(start, { x: e.clientX, y: e.clientY });
      if (moved > 6) return;

      activateSticky(sticky);
    });

    sticky.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      activateSticky(sticky);
    });
  }

  const aboutBack = document.querySelector(".about-page__back");

  if (collageGroup instanceof HTMLElement) {
    collageGroup.addEventListener("pointerdown", (e) => {
      if (!(e instanceof PointerEvent)) return;
      if (!isMobileCollageViewport()) return;
      if (!body.classList.contains("theme-focus-light")) return;

      collageDragPointerId = e.pointerId;
      collageDragStartX = e.clientX - collageOffsetX;
      collageDragStartY = e.clientY - collageOffsetY;
      collageGroup.setPointerCapture(e.pointerId);
      collageGroup.classList.add("about-page__collage-group--dragging");
      e.stopPropagation();
    });

    collageGroup.addEventListener("pointermove", (e) => {
      if (collageDragPointerId === null || e.pointerId !== collageDragPointerId) return;
      collageOffsetX = e.clientX - collageDragStartX;
      collageOffsetY = e.clientY - collageDragStartY;
      applyCollageDragOffset();
    });

    const endCollageDrag = (e) => {
      if (!(e instanceof PointerEvent)) return;
      if (collageDragPointerId === null || e.pointerId !== collageDragPointerId) return;
      try {
        collageGroup.releasePointerCapture(collageDragPointerId);
      } catch {
        // ignore
      }
      collageDragPointerId = null;
      collageGroup.classList.remove("about-page__collage-group--dragging");
    };

    collageGroup.addEventListener("pointerup", endCollageDrag);
    collageGroup.addEventListener("pointercancel", endCollageDrag);
  }

  if (aboutBack instanceof HTMLButtonElement) {
    aboutBack.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSelection();
    });
  }

  document.addEventListener("pointerdown", (e) => {
    if (!(e instanceof PointerEvent)) return;
    const target = e.target;
    if (!(target instanceof Element)) return;

    // About view — use the back button (or Escape), not empty-canvas clicks.
    if (body.classList.contains("theme-focus-light")) return;

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
  syncAboutPage();
  syncStarStickyLabel();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStickyTheme);
} else {
  initStickyTheme();
}
