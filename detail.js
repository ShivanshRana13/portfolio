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

/** Fully scrolled title: 21px (Fibonacci / φ step with section labels). */
const TITLE_MIN_PX = 21;

function initDetailPage() {
  const params = new URLSearchParams(window.location.search);
  let tile = params.get("tile") || "education";
  if (!ALLOWED_TILES.includes(tile)) {
    tile = "education";
  }

  const meta = TILE_COPY[tile];
  const titleEl = document.getElementById("detail-title");
  const metaEl = document.getElementById("detail-meta");
  if (titleEl && meta) {
    titleEl.textContent = meta.title;
    document.title = `${meta.title} · Portfolio`;
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

/**
 * Figma 97:2081 — bar width = fraction of page still below the fold (full at top, shrinks on scroll).
 */
function initScrollLevelIndicator() {
  const noop = function () {};

  if (!document.body.classList.contains("detail")) {
    return noop;
  }

  const wrapper = document.getElementById("detail-scroll-level");
  if (wrapper === null) {
    return noop;
  }

  const narrowLayoutMq = window.matchMedia("(max-width: 900px)");
  const visibleClass = "detail__scroll-level--visible";

  function apply() {
    const maxScroll = getDetailMaxScrollPx();
    const y = getDetailScrollY();
    let remaining = 1;
    if (maxScroll > 0.5) {
      const scrolled = Math.min(1, Math.max(0, y / maxScroll));
      remaining = 1 - scrolled;
    }

    wrapper.style.setProperty("--detail-scroll-remaining", remaining.toFixed(4));
    const pct = Math.max(0, Math.min(100, Math.round(remaining * 100)));
    wrapper.setAttribute("aria-valuenow", String(pct));

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

/**
 * While the page scrolls, shrink the sticky title from the hero clamp (up to 34px)
 * down to 21px (Fibonacci) so hierarchy stays on the golden scale.
 */
function initTitleScrollShrink() {
  const noop = function () {};

  if (!document.body.classList.contains("detail")) {
    return noop;
  }

  const titleEl = document.getElementById("detail-title");
  if (titleEl === null) {
    return noop;
  }

  const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrowLayoutMq = window.matchMedia("(max-width: 900px)");

  let maxPx = 34;
  let scrollRangePx = 200;

  function clearTitleScrollVars() {
    document.body.style.removeProperty("--detail-title-fs");
    document.body.style.removeProperty("--detail-title-fw");
  }

  function measureTitleMaxPx() {
    clearTitleScrollVars();
    const px = parseFloat(window.getComputedStyle(titleEl).fontSize);
    maxPx = Number.isFinite(px) && px > TITLE_MIN_PX ? px : 34;
    scrollRangePx = Math.min(280, Math.max(140, Math.round(window.innerHeight * 0.22)));
  }

  function apply() {
    if (reduceMotionMq.matches === true || narrowLayoutMq.matches === true) {
      clearTitleScrollVars();
      return;
    }
    const y = getDetailScrollY();
    const tRaw = scrollRangePx <= 0 ? 1 : y / scrollRangePx;
    const t = tRaw <= 0 ? 0 : tRaw >= 1 ? 1 : tRaw;
    const fs = maxPx - (maxPx - TITLE_MIN_PX) * t;
    document.body.style.setProperty("--detail-title-fs", `${fs}px`);
  }

  function scheduleMeasureAndApply() {
    window.requestAnimationFrame(() => {
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
