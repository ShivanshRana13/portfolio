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

  const refreshAboutDetail = () => {
    if (typeof window.__refreshAboutDetailScale === "function") {
      window.__refreshAboutDetailScale();
    }
    if (typeof window.__refreshAboutDetailScroll === "function") {
      window.__refreshAboutDetailScroll();
    }
  };

  const syncAboutPage = () => {
    const active =
      starSticky instanceof HTMLElement && starSticky.classList.contains("is-selected") === true;
    if (scene instanceof HTMLElement) {
      scene.classList.toggle("scene--about-active", active);
    }
    body.classList.toggle("about-view", active);
    body.classList.toggle("theme-focus-light", active);
    if (aboutPage instanceof HTMLElement) {
      aboutPage.hidden = !active;
      aboutPage.setAttribute("aria-hidden", active ? "false" : "true");
    }
    if (active) {
      window.requestAnimationFrame(refreshAboutDetail);
    }
  };

  const clearSelection = () => {
    for (const el of stickies) el.classList.remove("is-selected");
    body.classList.remove("theme-dark");
    body.classList.remove("theme-focus-light");
    body.classList.remove("about-view");
    syncScenePatentCube();
    syncAboutPage();
    syncStarStickyLabel();
    syncNowPlayingPill();
    if (typeof window.__resetAboutScroll === "function") {
      window.__resetAboutScroll();
    }
  };

  const setSelected = (target) => {
    for (const el of stickies) {
      el.classList.toggle("is-selected", el === target);
    }
    body.classList.remove("theme-dark");
    body.classList.remove("theme-focus-light");
    body.classList.remove("about-view");
    if (target === starSticky) {
      body.classList.add("theme-focus-light");
      body.classList.add("about-view");
    } else {
      body.classList.add("theme-dark");
    }
    syncScenePatentCube();
    syncAboutPage();
    syncStarStickyLabel();
    syncNowPlayingPill();
    if (target === starSticky) {
      window.requestAnimationFrame(refreshAboutDetail);
    }
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

  for (const backBtn of document.querySelectorAll(".about-page__back")) {
    if (!(backBtn instanceof HTMLButtonElement)) continue;
    backBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSelection();
    });
  }

  document.addEventListener("pointerdown", (e) => {
    if (!(e instanceof PointerEvent)) return;
    const target = e.target;
    if (!(target instanceof Element)) return;

    if (body.classList.contains("about-view")) return;

    if (target.closest(".sticky") !== null) return;
    if (target.closest(".patent-cube") !== null) return;

    clearSelection();
  });

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
