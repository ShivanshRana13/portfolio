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

/** Matches .detail__lede / .detail__body (right column body copy). */
const TITLE_MIN_PX = 14;
const TITLE_MIN_WEIGHT = 400;
const TITLE_MAX_WEIGHT = 600;

function easeOutCubic(t) {
  const x = 1 - t;
  return 1 - x * x * x;
}

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
 * While the page scrolls, shrink the sticky title from hero size down to the
 * right-rail body size (14px / 400) so it does not compete visually while reading.
 */
function initTitleScrollShrink() {
  if (!document.body.classList.contains("detail")) {
    return;
  }

  const titleEl = document.getElementById("detail-title");
  if (titleEl === null) {
    return;
  }

  const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  let maxPx = 50;
  let scrollRangePx = 320;
  let rafId = 0;

  function measureTitleMaxPx() {
    document.body.style.removeProperty("--detail-title-fs");
    document.body.style.removeProperty("--detail-title-fw");
    const px = parseFloat(window.getComputedStyle(titleEl).fontSize);
    maxPx = Number.isFinite(px) && px > TITLE_MIN_PX ? px : 50;
    scrollRangePx = Math.min(420, Math.max(220, Math.round(window.innerHeight * 0.42)));
  }

  function applyScrollDrivenTitle() {
    if (reduceMotionMq.matches === true) {
      document.body.style.removeProperty("--detail-title-fs");
      document.body.style.removeProperty("--detail-title-fw");
      return;
    }
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const tRaw = scrollRangePx <= 0 ? 1 : y / scrollRangePx;
    const t = tRaw <= 0 ? 0 : tRaw >= 1 ? 1 : tRaw;
    const e = easeOutCubic(t);
    const fs = maxPx - (maxPx - TITLE_MIN_PX) * e;
    const fw = Math.round(TITLE_MAX_WEIGHT - (TITLE_MAX_WEIGHT - TITLE_MIN_WEIGHT) * e);
    document.body.style.setProperty("--detail-title-fs", `${fs}px`);
    document.body.style.setProperty("--detail-title-fw", String(fw));
  }

  function onScroll() {
    if (rafId !== 0) {
      return;
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      applyScrollDrivenTitle();
    });
  }

  measureTitleMaxPx();
  applyScrollDrivenTitle();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    measureTitleMaxPx();
    applyScrollDrivenTitle();
  });

  reduceMotionMq.addEventListener("change", () => {
    measureTitleMaxPx();
    applyScrollDrivenTitle();
  });
}

function boot() {
  initDetailPage();
  initTitleScrollShrink();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
