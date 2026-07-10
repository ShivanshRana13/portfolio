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
  const nowPlayingPill = document.querySelector(".now-playing-pill");
  const starLabel = starSticky?.querySelector(".sticky-star__label");
  const CALENDLY_URL = "https://calendly.com/shivanshrana13/coffee-chat-w-shivansh";

  const syncNowPlayingPill = () => {
    if (!(nowPlayingPill instanceof HTMLElement)) return;
    const onHomepage =
      body.classList.contains("theme-dark") === false &&
      body.classList.contains("theme-focus-light") === false;
    nowPlayingPill.hidden = !onHomepage;
    nowPlayingPill.setAttribute("aria-hidden", onHomepage ? "false" : "true");
  };

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

  const collageGroup = document.querySelector(".about-page__collage-group");
  const aboutCollage = document.querySelector(".about-page__collage");
  const MOBILE_COLLAGE_MAX_PX = 640;
  const COLLAGE_SCALE_MIN = 0.45;
  const COLLAGE_SCALE_MAX = 2.2;

  const isMobileCollageViewport = () =>
    window.matchMedia(`(max-width: ${MOBILE_COLLAGE_MAX_PX}px)`).matches;

  const viewportMeta = document.querySelector('meta[name="viewport"]');
  const DEFAULT_VIEWPORT = "width=device-width, initial-scale=1.0";
  const LOCKED_VIEWPORT = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";

  const syncMobileAboutViewport = (aboutActive) => {
    if (!(viewportMeta instanceof HTMLMetaElement)) return;
    if (aboutActive && isMobileCollageViewport()) {
      viewportMeta.setAttribute("content", LOCKED_VIEWPORT);
      return;
    }
    viewportMeta.setAttribute("content", DEFAULT_VIEWPORT);
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
    syncMobileAboutViewport(active);
  };

  window.addEventListener("resize", () => {
    if (!body.classList.contains("theme-focus-light")) return;
    syncMobileAboutViewport(true);
  });

  const clampCollage = (value, min, max) => Math.max(min, Math.min(max, value));

  /** @type {Map<number, { x: number; y: number }>} */
  const collagePointers = new Map();

  let collageDragPointerId = null;
  let collageDragStartX = 0;
  let collageDragStartY = 0;
  let collageOffsetX = 0;
  let collageOffsetY = 0;
  let collageScale = 1;
  let collagePinchStartDistance = 0;
  let collagePinchStartScale = 1;

  const pointerDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const resetCollageDrag = () => {
    collagePointers.clear();
    collageDragPointerId = null;
    collageOffsetX = 0;
    collageOffsetY = 0;
    collageScale = 1;
    collagePinchStartDistance = 0;
    if (collageGroup instanceof HTMLElement) {
      collageGroup.classList.remove("about-page__collage-group--dragging");
      collageGroup.style.setProperty("--collage-x", "0px");
      collageGroup.style.setProperty("--collage-y", "0px");
      collageGroup.style.setProperty("--collage-scale", "1");
    }
    syncMobileAboutViewport(body.classList.contains("theme-focus-light"));
  };

  const applyCollageTransform = () => {
    if (!(collageGroup instanceof HTMLElement)) return;
    collageGroup.style.setProperty("--collage-x", `${collageOffsetX}px`);
    collageGroup.style.setProperty("--collage-y", `${collageOffsetY}px`);
    collageGroup.style.setProperty("--collage-scale", String(collageScale));
  };

  const syncCollagePinch = () => {
    if (collagePointers.size < 2) return;
    const pts = Array.from(collagePointers.values());
    const dist = pointerDistance(pts[0], pts[1]);
    if (collagePinchStartDistance <= 0) return;
    collageScale = clampCollage(
      collagePinchStartScale * (dist / collagePinchStartDistance),
      COLLAGE_SCALE_MIN,
      COLLAGE_SCALE_MAX,
    );
    applyCollageTransform();
  };

  const beginCollageDragFromPointer = (pointerId) => {
    const pt = collagePointers.get(pointerId);
    if (!pt) return;
    collageDragPointerId = pointerId;
    collageDragStartX = pt.x - collageOffsetX;
    collageDragStartY = pt.y - collageOffsetY;
  };

  const beginCollagePinch = () => {
    collageDragPointerId = null;
    const pts = Array.from(collagePointers.values());
    if (pts.length < 2) return;
    collagePinchStartDistance = pointerDistance(pts[0], pts[1]);
    collagePinchStartScale = collageScale;
  };

  const clearSelection = () => {
    for (const el of stickies) el.classList.remove("is-selected");
    body.classList.remove("theme-dark");
    body.classList.remove("theme-focus-light");
    syncScenePatentCube();
    syncAboutPage();
    syncStarStickyLabel();
    syncNowPlayingPill();
    resetCollageDrag();
    syncMobileAboutViewport(false);
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
    syncNowPlayingPill();
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

  const isAboutCollageInteractionActive = () =>
    isMobileCollageViewport() && body.classList.contains("theme-focus-light") === true;

  const bindCollageSurface = (surface) => {
    if (!(surface instanceof HTMLElement)) return;

    surface.addEventListener(
      "touchmove",
      (e) => {
        if (!isAboutCollageInteractionActive()) return;
        if (collagePointers.size > 0 || e.touches.length > 1) {
          e.preventDefault();
        }
      },
      { passive: false },
    );

    surface.addEventListener("pointerdown", (e) => {
      if (!(e instanceof PointerEvent)) return;
      if (!isAboutCollageInteractionActive()) return;

      collagePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      surface.setPointerCapture(e.pointerId);
      if (collageGroup instanceof HTMLElement) {
        collageGroup.classList.add("about-page__collage-group--dragging");
      }

      if (collagePointers.size === 1) {
        beginCollageDragFromPointer(e.pointerId);
      } else if (collagePointers.size === 2) {
        beginCollagePinch();
      }

      e.preventDefault();
      e.stopPropagation();
    });

    surface.addEventListener("pointermove", (e) => {
      if (!(e instanceof PointerEvent)) return;
      if (!collagePointers.has(e.pointerId)) return;

      collagePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (collagePointers.size >= 2) {
        syncCollagePinch();
        e.preventDefault();
        return;
      }

      if (collageDragPointerId === null || e.pointerId !== collageDragPointerId) return;
      collageOffsetX = e.clientX - collageDragStartX;
      collageOffsetY = e.clientY - collageDragStartY;
      applyCollageTransform();
      e.preventDefault();
    });

    const endCollagePointer = (e) => {
      if (!(e instanceof PointerEvent)) return;
      if (!collagePointers.has(e.pointerId)) return;

      try {
        surface.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      collagePointers.delete(e.pointerId);

      if (collagePointers.size === 1) {
        const remainingId = collagePointers.keys().next().value;
        if (typeof remainingId === "number") {
          beginCollageDragFromPointer(remainingId);
        }
        collagePinchStartDistance = 0;
      } else if (collagePointers.size >= 2) {
        beginCollagePinch();
      } else {
        collageDragPointerId = null;
        collagePinchStartDistance = 0;
        if (collageGroup instanceof HTMLElement) {
          collageGroup.classList.remove("about-page__collage-group--dragging");
        }
      }
    };

    surface.addEventListener("pointerup", endCollagePointer);
    surface.addEventListener("pointercancel", endCollagePointer);
  };

  bindCollageSurface(aboutCollage);

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
  syncNowPlayingPill();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStickyTheme);
} else {
  initStickyTheme();
}
