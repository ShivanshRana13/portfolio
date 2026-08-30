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
  const ABOUT_HASH = "about";
  let syncingAboutUrl = false;

  const isAboutHash = () => location.hash === `#${ABOUT_HASH}`;

  const syncAboutUrl = (active) => {
    if (syncingAboutUrl) return;
    syncingAboutUrl = true;
    try {
      const base = `${location.pathname}${location.search}`;
      if (active === true && isAboutHash() !== true) {
        history.pushState({ about: true }, "", `${base}#${ABOUT_HASH}`);
      } else if (active !== true && isAboutHash() === true) {
        history.replaceState(null, "", base);
      }
    } finally {
      syncingAboutUrl = false;
    }
  };

  const syncNowPlayingPill = () => {
    if (!(nowPlayingPill instanceof HTMLElement)) return;
    const onHomepage =
      body.classList.contains("about-view") === false &&
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
    if (typeof window.__layoutStickyNotes === "function") {
      window.__layoutStickyNotes();
    }
  };

  const resetAboutMiniTitleBar = () => {
    const aboutMiniTitle = document.getElementById("about-mini-title");
    if (!(aboutMiniTitle instanceof HTMLElement)) {
      return;
    }
    aboutMiniTitle.hidden = true;
    aboutMiniTitle.setAttribute("aria-hidden", "true");
    aboutMiniTitle.classList.remove("detail__mini-title--entered");
    aboutMiniTitle.style.transform = "translateY(-100%)";
    aboutMiniTitle.style.visibility = "hidden";
    aboutMiniTitle.style.pointerEvents = "none";
  };

  const clearAboutMiniTitleBarInline = () => {
    const aboutMiniTitle = document.getElementById("about-mini-title");
    if (!(aboutMiniTitle instanceof HTMLElement)) {
      return;
    }
    aboutMiniTitle.style.removeProperty("transform");
    aboutMiniTitle.style.removeProperty("visibility");
    aboutMiniTitle.style.removeProperty("pointer-events");
  };

  const resetAboutViewState = () => {
    const root = document.documentElement;
    root.classList.remove("about-view");
    body.classList.remove(
      "about-view",
      "detail",
      "theme-focus-light",
      "theme-dark",
      "detail--mobile-landing",
      "detail--mobile-mini-title",
      "detail--mobile-mini-title-animate",
    );
    const starStickyEl = document.querySelector(".sticky--star");
    if (starStickyEl instanceof HTMLElement) {
      starStickyEl.style.removeProperty("opacity");
      starStickyEl.style.removeProperty("pointer-events");
    }
    if (typeof window.__clearAboutStarPositionLock === "function") {
      window.__clearAboutStarPositionLock();
    }
    if (scene instanceof HTMLElement) {
      scene.classList.remove("scene--about-active");
    }
    if (aboutPage instanceof HTMLElement) {
      aboutPage.hidden = true;
      aboutPage.setAttribute("aria-hidden", "true");
    }
    resetAboutMiniTitleBar();
  };

  const syncHomepageChrome = () => {
    const onHomepage =
      body.classList.contains("about-view") === false &&
      body.classList.contains("theme-dark") === false;
    if (onHomepage !== true) {
      return;
    }

    document.documentElement.style.setProperty("--bg", "#f6f6f6");
    document.documentElement.style.backgroundColor = "#f6f6f6";
    body.style.backgroundColor = "#f6f6f6";

    const stage = document.querySelector(".stage");
    if (stage instanceof HTMLElement) {
      stage.style.backgroundColor = "#f6f6f6";
    }
    if (scene instanceof HTMLElement) {
      scene.style.backgroundColor = "#f6f6f6";
    }

    resetAboutMiniTitleBar();
  };

  const clearHomepageChromeInline = () => {
    document.documentElement.style.removeProperty("--bg");
    document.documentElement.style.removeProperty("background-color");
    body.style.removeProperty("background-color");
    const stage = document.querySelector(".stage");
    if (stage instanceof HTMLElement) {
      stage.style.removeProperty("background-color");
    }
    if (scene instanceof HTMLElement) {
      scene.style.removeProperty("background-color");
    }
    clearAboutMiniTitleBarInline();
  };

  const finishHomepageReturn = (options = {}) => {
    clearSelection(options);
    window.requestAnimationFrame(() => {
      syncHomepageChrome();
    });
  };

  const syncAboutPage = (skipUrlSync = false) => {
    const active =
      starSticky instanceof HTMLElement && starSticky.classList.contains("is-selected") === true;
    const root = document.documentElement;
    if (scene instanceof HTMLElement) {
      scene.classList.toggle("scene--about-active", active);
    }
    root.classList.toggle("about-view", active);
    body.classList.toggle("about-view", active);
    body.classList.toggle("detail", active);
    body.classList.toggle("theme-focus-light", active);
    if (aboutPage instanceof HTMLElement) {
      aboutPage.hidden = !active;
      aboutPage.setAttribute("aria-hidden", active ? "false" : "true");
    }
    if (active) {
      clearHomepageChromeInline();
      window.requestAnimationFrame(refreshAboutDetail);
    } else {
      syncHomepageChrome();
    }
    if (skipUrlSync !== true) {
      syncAboutUrl(active);
    }
  };

  const clearSelection = (options = {}) => {
    const skipUrlSync = options.skipUrlSync === true;
    for (const el of stickies) el.classList.remove("is-selected");
    resetAboutViewState();
    syncScenePatentCube();
    syncAboutPage(skipUrlSync);
    syncStarStickyLabel();
    syncNowPlayingPill();
    if (typeof window.__resetAboutScroll === "function") {
      window.__resetAboutScroll();
    }
    syncHomepageChrome();
  };

  const markHomepageResetOnLeave = () => {
    try {
      sessionStorage.setItem("portfolio:reset-home", "1");
    } catch {
      // sessionStorage may be unavailable in private mode
    }
  };

  const restoreHomepageDefaultState = () => {
    if (isAboutHash() === true) {
      return;
    }

    const aboutShellOpen =
      aboutPage instanceof HTMLElement && aboutPage.hidden !== true;
    const needsReset =
      aboutShellOpen ||
      document.documentElement.classList.contains("about-view") === true ||
      body.classList.contains("about-view") === true ||
      body.classList.contains("detail") === true ||
      body.classList.contains("theme-focus-light") === true ||
      body.classList.contains("detail--mobile-landing") === true ||
      body.classList.contains("detail--mobile-mini-title") === true ||
      (starSticky instanceof HTMLElement && starSticky.classList.contains("is-selected") === true);

    if (needsReset !== true) {
      return;
    }

    finishHomepageReturn({ skipUrlSync: true });
  };

  window.__finishHomepageReturn = finishHomepageReturn;
  window.__markHomepageResetOnLeave = markHomepageResetOnLeave;

  const consumeHomepageResetFlag = () => {
    try {
      if (sessionStorage.getItem("portfolio:reset-home") !== "1") {
        return false;
      }
      sessionStorage.removeItem("portfolio:reset-home");
    } catch {
      return false;
    }
    return true;
  };

  const setSelected = (target) => {
    for (const el of stickies) {
      el.classList.toggle("is-selected", el === target);
    }
    body.classList.remove("theme-dark");
    body.classList.remove("theme-focus-light");
    body.classList.remove("about-view");
    body.classList.remove("detail");
    document.documentElement.classList.remove("about-view");
    if (target === starSticky) {
      body.classList.add("theme-focus-light");
      body.classList.add("about-view");
      body.classList.add("detail");
      document.documentElement.classList.add("about-view");
    } else {
      body.classList.add("theme-dark");
    }
    syncScenePatentCube();
    syncAboutPage();
    syncStarStickyLabel();
    syncNowPlayingPill();
    if (target === starSticky) {
      window.requestAnimationFrame(refreshAboutDetail);
      if (typeof window.__resetAboutScroll === "function") {
        window.__resetAboutScroll();
      }
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
      if (sticky === starSticky) {
        finishHomepageReturn();
        return;
      }
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
    if (body.classList.contains("about-view") === true) {
      finishHomepageReturn();
      return;
    }
    clearSelection();
  });

  const syncAboutFromUrl = () => {
    if (syncingAboutUrl) return;
    if (consumeHomepageResetFlag() === true) {
      finishHomepageReturn({ skipUrlSync: true });
      return;
    }
    const shouldShowAbout = isAboutHash();
    const showingAbout = body.classList.contains("about-view");
    if (shouldShowAbout && !showingAbout && starSticky instanceof HTMLElement) {
      setSelected(starSticky);
      return;
    }
    if (!shouldShowAbout && showingAbout) {
      finishHomepageReturn({ skipUrlSync: true });
      return;
    }
    restoreHomepageDefaultState();
  };

  window.addEventListener("hashchange", syncAboutFromUrl);
  window.addEventListener("popstate", syncAboutFromUrl);
  window.addEventListener("pageshow", () => {
    syncAboutFromUrl();
  });

  syncScenePatentCube();
  if (isAboutHash() && starSticky instanceof HTMLElement) {
    setSelected(starSticky);
  } else {
    restoreHomepageDefaultState();
    syncAboutPage();
    syncStarStickyLabel();
    syncNowPlayingPill();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStickyTheme);
} else {
  initStickyTheme();
}
