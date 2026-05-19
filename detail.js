/** Per-tile left-rail copy for the detail page (Figma node 73:2227 layout). */
const TILE_COPY = {
  education: {
    title: "Redesign of a modular character rigging tool",
    meta: "Case study | 2026",
  },
  "case-tilt": {
    title: "Designing a patent pending intuitive manipulator for future generation of 3d tools",
    meta: "Autodesk - Project Falcon | 2026",
  },
  case: {
    title: "Redesign of a modular character rigging tool",
    meta: "Case study | 2026",
  },
  college: {
    title: "Redesign of a modular character rigging tool",
    meta: "College projects | 2026",
  },
  passions: {
    title: "Redesign of a modular character rigging tool",
    meta: "Passions | 2026",
  },
  instagram: {
    title: "Redesign of a modular character rigging tool",
    meta: "Instagram | 2026",
  },
};

const ALLOWED_TILES = Object.keys(TILE_COPY);

/** Desktop scrolled title: 21px (Fibonacci / φ step with section labels). */
const TITLE_MIN_PX = 21;

/** Downward movement (one frame) past title → hide mini title section. */
const MOBILE_MINI_TITLE_HIDE_DOWN_PX = 2;
/** Cumulative upward movement before revealing mini title section. */
const MOBILE_MINI_TITLE_REVEAL_UP_PX = 6;

function initDetailPage() {
  const params = new URLSearchParams(window.location.search);
  let tile = params.get("tile") || "education";
  if (!ALLOWED_TILES.includes(tile)) {
    tile = "education";
  }

  const meta = TILE_COPY[tile];
  const titleEl = document.getElementById("detail-title");
  const metaEl = document.getElementById("detail-meta");
  const miniTitleTextEl = document.getElementById("detail-mini-title-text");
  if (titleEl && meta) {
    titleEl.textContent = meta.title;
    document.title = `${meta.title} · Portfolio`;
    if (miniTitleTextEl !== null) {
      miniTitleTextEl.textContent = meta.title;
    }
  }
  if (metaEl && meta && meta.meta) {
    metaEl.textContent = meta.meta;
  }
}

/**
 * Scroll offset — body is the scroll container on the detail page.
 */
function getDetailScrollY() {
  const w = window.scrollY || window.pageYOffset || 0;
  const root = document.documentElement;
  const b = document.body;
  const r = root !== null && typeof root.scrollTop === "number" ? root.scrollTop : 0;
  const bodyTop = b !== null && typeof b.scrollTop === "number" ? b.scrollTop : 0;
  const se = document.scrollingElement;
  const seTop = se !== null && typeof se.scrollTop === "number" ? se.scrollTop : 0;
  const y = Math.max(w, r, bodyTop, seTop);
  return y < 0 ? 0 : y;
}

function getDetailMaxScrollPx() {
  const el = document.documentElement;
  const b = document.body;
  const sh = Math.max(el.scrollHeight, b.scrollHeight);
  const vh =
    window.visualViewport !== undefined && typeof window.visualViewport.height === "number"
      ? window.visualViewport.height
      : window.innerHeight;
  return Math.max(0, sh - vh);
}

function bindDetailScroll(onScroll) {
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  document.addEventListener("scroll", onScroll, { passive: true, capture: true });
  document.documentElement.addEventListener("scroll", onScroll, { passive: true });
  if (document.body !== null) {
    document.body.addEventListener("scroll", onScroll, { passive: true });
  }
}

/** Pixels from the bottom treated as “scroll complete” for the scroll-up control. */
const SCROLL_END_THRESHOLD_PX = 4;

/**
 * Scroll back to the first fold (top of the detail page / hero rail).
 * `body.detail` is the scroll container (`overflow-y: auto`); set every root to 0.
 */
function scrollDetailToTop() {
  const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const behavior = reduceMotionMq.matches === true ? "auto" : "smooth";
  const scrollOpts = { top: 0, left: 0, behavior: behavior };

  const firstFold =
    document.querySelector(".detail__left-top") ||
    document.querySelector(".detail-layout");
  if (firstFold !== null) {
    firstFold.scrollIntoView({ behavior: behavior, block: "start", inline: "nearest" });
  }

  const roots = [document.scrollingElement, document.documentElement, document.body];
  for (let i = 0; i < roots.length; i += 1) {
    const el = roots[i];
    if (el === null) {
      continue;
    }
    if (typeof el.scrollTo === "function") {
      el.scrollTo(scrollOpts);
    } else {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  }

  window.scrollTo(scrollOpts);
}

/**
 * Figma 97:2081 — bar width = unread portion; at end → Figma 102:2105 scroll-up pill (desktop + mobile).
 */
function initScrollLevelIndicator() {
  const noop = function () {};

  if (!document.body.classList.contains("detail")) {
    return noop;
  }

  const wrapper = document.getElementById("detail-scroll-level");
  const track = document.getElementById("detail-scroll-track");
  const scrollUpBtn = document.getElementById("detail-scroll-up");
  if (wrapper === null) {
    return noop;
  }

  const narrowLayoutMq = window.matchMedia("(max-width: 900px)");
  const visibleClass = "detail__scroll-level--visible";
  const completeClass = "detail__scroll-level--complete";

  if (scrollUpBtn !== null) {
    scrollUpBtn.addEventListener("click", scrollDetailToTop);
  }

  function apply() {
    const maxScroll = getDetailMaxScrollPx();
    const y = getDetailScrollY();
    let remaining = 1;
    if (maxScroll > 0.5) {
      const scrolled = Math.min(1, Math.max(0, y / maxScroll));
      remaining = 1 - scrolled;
    }

    const atEnd =
      maxScroll > 0.5 && maxScroll - y <= SCROLL_END_THRESHOLD_PX;

    wrapper.style.setProperty("--detail-scroll-remaining", remaining.toFixed(4));
    wrapper.classList.toggle(completeClass, atEnd);

    if (scrollUpBtn !== null) {
      if (narrowLayoutMq.matches === true) {
        scrollUpBtn.hidden = !atEnd;
        scrollUpBtn.removeAttribute("tabindex");
      } else {
        scrollUpBtn.hidden = false;
        scrollUpBtn.setAttribute("aria-hidden", atEnd ? "false" : "true");
        scrollUpBtn.tabIndex = atEnd ? 0 : -1;
      }
    }

    if (track !== null) {
      track.setAttribute("aria-hidden", atEnd ? "true" : "false");
    }

    if (atEnd) {
      wrapper.removeAttribute("role");
      wrapper.removeAttribute("aria-valuemin");
      wrapper.removeAttribute("aria-valuemax");
      wrapper.removeAttribute("aria-valuenow");
      wrapper.removeAttribute("aria-label");
    } else {
      const pct = Math.max(0, Math.min(100, Math.round(remaining * 100)));
      wrapper.setAttribute("role", "progressbar");
      wrapper.setAttribute("aria-valuemin", "0");
      wrapper.setAttribute("aria-valuemax", "100");
      wrapper.setAttribute("aria-valuenow", String(pct));
      wrapper.setAttribute("aria-label", "How much content is left to scroll");
    }

    if (narrowLayoutMq.matches === true) {
      const hasScrolled = y > 0;
      wrapper.classList.toggle(visibleClass, hasScrolled);
      wrapper.setAttribute("aria-hidden", hasScrolled ? "false" : "true");
    } else {
      wrapper.classList.remove(visibleClass);
      wrapper.removeAttribute("aria-hidden");
    }
  }

  return apply;
}

const MOBILE_HEADER_LANDING = "detail--mobile-landing";
const MOBILE_HEADER_MINI_TITLE = "detail--mobile-mini-title";

/**
 * Desktop: hero title stays at max until 50% of the first fold, then shrinks gradually to 21px by 100%.
 * Mobile: mini title section (Figma 105:203) only while scrolling up past title section.
 */
function initTitleScrollShrink() {
  const noop = function () {};

  if (!document.body.classList.contains("detail")) {
    return noop;
  }

  const titleEl = document.getElementById("detail-title");
  const titleSectionEl = document.querySelector(".detail__left-top");
  const miniTitleEl = document.getElementById("detail-mini-title");
  if (titleEl === null) {
    return noop;
  }

  const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrowLayoutMq = window.matchMedia("(max-width: 900px)");

  let maxPx = 34;
  let lastScrollY = 0;
  let wasPastTitleSection = false;
  let mobileHeaderMode = MOBILE_HEADER_LANDING;
  let miniTitleRevealCarryPx = 0;

  function getFirstFoldPx() {
    if (
      window.visualViewport !== undefined &&
      window.visualViewport !== null &&
      typeof window.visualViewport.height === "number"
    ) {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  }

  function clearTitleScrollVars() {
    document.body.style.removeProperty("--detail-title-fs");
    document.body.style.removeProperty("--detail-title-fw");
  }

  function clearMobileHeaderModes() {
    document.body.classList.remove(MOBILE_HEADER_LANDING, MOBILE_HEADER_MINI_TITLE);
  }

  /** Only swap mobile header class when mode changes — avoids replaying CSS transitions every scroll tick. */
  function setMobileHeaderMode(nextMode) {
    if (document.body.classList.contains(nextMode) === true) {
      return;
    }
    clearMobileHeaderModes();
    document.body.classList.add(nextMode);
    if (miniTitleEl !== null) {
      const showMini = nextMode === MOBILE_HEADER_MINI_TITLE;
      miniTitleEl.hidden = !showMini;
      miniTitleEl.setAttribute("aria-hidden", showMini ? "false" : "true");
    }
  }

  function getMobileTitleSectionHeightPx() {
    if (titleSectionEl === null) {
      return 0;
    }
    return titleSectionEl.offsetHeight;
  }

  function measureTitleMaxPx() {
    const wasMobileModes = narrowLayoutMq.matches === true;
    if (wasMobileModes) {
      clearMobileHeaderModes();
      document.body.classList.add(MOBILE_HEADER_LANDING);
    } else {
      clearTitleScrollVars();
    }
    const px = parseFloat(window.getComputedStyle(titleEl).fontSize);
    const fallback = 34;
    maxPx = Number.isFinite(px) && px > TITLE_MIN_PX ? px : fallback;
    if (wasMobileModes) {
      clearMobileHeaderModes();
    }
  }

  function applyMobile() {
    if (titleSectionEl === null) {
      wasPastTitleSection = false;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = MOBILE_HEADER_LANDING;
      setMobileHeaderMode(MOBILE_HEADER_LANDING);
      return;
    }

    const y = getDetailScrollY();
    const titleSectionH = getMobileTitleSectionHeightPx();
    const pastTitleSection = titleSectionH > 0 && y > titleSectionH;

    if (pastTitleSection !== true) {
      wasPastTitleSection = false;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = MOBILE_HEADER_LANDING;
      setMobileHeaderMode(MOBILE_HEADER_LANDING);
      lastScrollY = y;
      return;
    }

    const deltaY = y - lastScrollY;
    lastScrollY = y;

    if (wasPastTitleSection === false) {
      wasPastTitleSection = true;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = MOBILE_HEADER_LANDING;
      setMobileHeaderMode(mobileHeaderMode);
      return;
    }

    if (deltaY > MOBILE_MINI_TITLE_HIDE_DOWN_PX) {
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = MOBILE_HEADER_LANDING;
    } else if (deltaY < 0) {
      miniTitleRevealCarryPx += -deltaY;
      if (miniTitleRevealCarryPx >= MOBILE_MINI_TITLE_REVEAL_UP_PX) {
        mobileHeaderMode = MOBILE_HEADER_MINI_TITLE;
      }
    }

    setMobileHeaderMode(mobileHeaderMode);
  }

  function applyDesktop() {
    const y = getDetailScrollY();
    const firstFoldPx = getFirstFoldPx();
    const shrinkStartPx = firstFoldPx * 0.5;
    const shrinkRangePx = firstFoldPx - shrinkStartPx;
    let t = 0;
    if (y > shrinkStartPx && shrinkRangePx > 0) {
      const tRaw = (y - shrinkStartPx) / shrinkRangePx;
      t = tRaw <= 0 ? 0 : tRaw >= 1 ? 1 : tRaw;
    }
    const fs = maxPx - (maxPx - TITLE_MIN_PX) * t;
    document.body.style.setProperty("--detail-title-fs", `${fs}px`);
  }

  function apply() {
    if (reduceMotionMq.matches === true) {
      clearTitleScrollVars();
      if (narrowLayoutMq.matches === true) {
        setMobileHeaderMode(MOBILE_HEADER_LANDING);
      } else {
        clearMobileHeaderModes();
      }
      return;
    }

    if (narrowLayoutMq.matches === true) {
      applyMobile();
      return;
    }

    clearMobileHeaderModes();
    applyDesktop();
  }

  function scheduleMeasureAndApply() {
    window.requestAnimationFrame(() => {
      lastScrollY = getDetailScrollY();
      wasPastTitleSection = false;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = MOBILE_HEADER_LANDING;
      measureTitleMaxPx();
      apply();
    });
  }

  scheduleMeasureAndApply();
  reduceMotionMq.addEventListener("change", scheduleMeasureAndApply);
  narrowLayoutMq.addEventListener("change", scheduleMeasureAndApply);
  window.addEventListener("resize", scheduleMeasureAndApply);

  return apply;
}

function initDetailScroll() {
  if (!document.body.classList.contains("detail")) {
    return;
  }

  const applyScrollLevel = initScrollLevelIndicator();
  const applyTitle = initTitleScrollShrink();
  let rafId = 0;

  function onScrollFrame() {
    applyScrollLevel();
    applyTitle();
  }

  function onScroll() {
    if (rafId !== 0) {
      return;
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      onScrollFrame();
    });
  }

  bindDetailScroll(onScroll);
  window.addEventListener("resize", () => {
    window.requestAnimationFrame(onScrollFrame);
  });
  window.addEventListener("orientationchange", () => {
    window.requestAnimationFrame(onScrollFrame);
  });
  if (window.visualViewport !== undefined && window.visualViewport !== null) {
    window.visualViewport.addEventListener("resize", () => {
      window.requestAnimationFrame(onScrollFrame);
    });
  }

  window.requestAnimationFrame(onScrollFrame);
}

function boot() {
  initDetailPage();
  initDetailScroll();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
