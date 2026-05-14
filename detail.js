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
 * With `overflow-y: auto` on `body`, scroll offset is often on `document.body` or
 * `document.documentElement`, not `window.scrollY`. Use the max of all sources.
 */
function getDetailScrollY() {
  const w = window.scrollY || window.pageYOffset || 0;
  const root = document.documentElement;
  const b = document.body;
  const r = root !== null && typeof root.scrollTop === "number" ? root.scrollTop : 0;
  const bodyTop = b !== null && typeof b.scrollTop === "number" ? b.scrollTop : 0;
  const y = Math.max(w, r, bodyTop);
  return y < 0 ? 0 : y;
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
  let scrollRangePx = 200;
  let rafId = 0;

  function measureTitleMaxPx() {
    document.body.style.removeProperty("--detail-title-fs");
    document.body.style.removeProperty("--detail-title-fw");
    const px = parseFloat(window.getComputedStyle(titleEl).fontSize);
    maxPx = Number.isFinite(px) && px > TITLE_MIN_PX ? px : 50;
    /* Shorter band = visible shrink as soon as the user scrolls a few pixels. */
    scrollRangePx = Math.min(280, Math.max(140, Math.round(window.innerHeight * 0.22)));
  }

  function applyScrollDrivenTitle() {
    if (reduceMotionMq.matches === true) {
      document.body.style.removeProperty("--detail-title-fs");
      document.body.style.removeProperty("--detail-title-fw");
      return;
    }
    const y = getDetailScrollY();
    const tRaw = scrollRangePx <= 0 ? 1 : y / scrollRangePx;
    const t = tRaw <= 0 ? 0 : tRaw >= 1 ? 1 : tRaw;
    /* Linear = first scroll pixel maps immediately to size change (CSS transition smooths). */
    const fs = maxPx - (maxPx - TITLE_MIN_PX) * t;
    const fw = Math.round(TITLE_MAX_WEIGHT - (TITLE_MAX_WEIGHT - TITLE_MIN_WEIGHT) * t);
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

  function bindScrollTargets() {
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.documentElement.addEventListener("scroll", onScroll, { passive: true });
    if (document.body !== null) {
      document.body.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  function scheduleMeasureAndApply() {
    window.requestAnimationFrame(() => {
      measureTitleMaxPx();
      applyScrollDrivenTitle();
    });
  }

  scheduleMeasureAndApply();
  bindScrollTargets();

  window.addEventListener("resize", () => {
    scheduleMeasureAndApply();
  });

  reduceMotionMq.addEventListener("change", () => {
    scheduleMeasureAndApply();
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
