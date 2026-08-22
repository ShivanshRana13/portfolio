function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * @param {ParentNode} scope
 * @param {{
 *   artboardClass?: string;
 *   isEnabled?: () => boolean;
 *   scrollRoot?: HTMLElement | null;
 *   getScrollRoot?: () => HTMLElement | null;
 *   titleId?: string;
 * }} [config]
 * @returns {(() => void) | null}
 */
function initDetailScaleInRoot(scope, config = {}) {
  const artboardClass = config.artboardClass ?? "detail--artboard-scale";
  const isEnabled = config.isEnabled ?? (() => true);
  const getScrollRoot =
    config.getScrollRoot ??
    (() => (config.scrollRoot instanceof HTMLElement ? config.scrollRoot : null));
  const titleId = config.titleId ?? "detail-title";

  const resolveScrollRoot = () => {
    const root = getScrollRoot();
    return root instanceof HTMLElement ? root : null;
  };

  const stage = scope.querySelector(".detail-stage");
  const layout = scope.querySelector(".detail-layout");
  const leftAnchor = scope.querySelector(".detail__left-spacer");
  const leftRail = scope.querySelector(".detail__left");
  const rightCol = scope.querySelector(".detail__right");
  const whiteBleed = scope.querySelector(".detail__white-bleed");
  const greyBleed = scope.querySelector(".detail__grey-bleed");
  const desktopRailMq = window.matchMedia("(min-width: 901px)");
  if (!(stage instanceof HTMLElement) || !(layout instanceof HTMLElement)) {
    return null;
  }

  const BASE_W = 1440;
  const BASE_H = 1024;
  const LARGE_MIN_W = 1440;
  const LARGE_MIN_H = 1024;
  const LEFT_PAD = 64;

  const measureLeftColumnWidth = () => {
    const top = scope.querySelector(".detail__left-top");
    const bottom = scope.querySelector(".detail__left-bottom");
    let contentW = 44;

    if (top instanceof HTMLElement) {
      contentW = Math.max(contentW, top.offsetWidth);
    }
    if (bottom instanceof HTMLElement) {
      contentW = Math.max(contentW, bottom.offsetWidth);
    }

    return Math.ceil(contentW + 2 * LEFT_PAD);
  };

  const syncLeftRailAnchors = () => {
    const root = document.documentElement;
    const anchorEl =
      leftAnchor instanceof HTMLElement ? leftAnchor : leftRail;
    if (!(anchorEl instanceof HTMLElement) || desktopRailMq.matches !== true) {
      root.style.removeProperty("--detail-left-x");
      root.style.removeProperty("--detail-left-w");
      if (leftAnchor instanceof HTMLElement) {
        leftAnchor.style.removeProperty("width");
      }
      return;
    }

    const columnW = measureLeftColumnWidth();
    if (leftAnchor instanceof HTMLElement) {
      leftAnchor.style.width = `${columnW}px`;
    }

    const leftRect = anchorEl.getBoundingClientRect();
    let width = columnW;

    if (width <= 0) {
      width = leftRect.width;
      if (rightCol instanceof HTMLElement) {
        const rightRect = rightCol.getBoundingClientRect();
        if (rightRect.left > leftRect.left) {
          width = Math.min(width, rightRect.left - leftRect.left);
        }
      }
    }

    if (width <= 0) {
      return;
    }

    let x = leftRect.left;
    const isScaled = document.body.classList.contains(artboardClass) === true;
    const scale = parseFloat(layout.dataset.scale || "1") || 1;

    if (isScaled && scale > 0) {
      const layoutRect = layout.getBoundingClientRect();
      x = (leftRect.left - layoutRect.left) / scale;
    }

    root.style.setProperty("--detail-left-x", `${x}px`);
    root.style.setProperty("--detail-left-w", `${width}px`);
  };

  const getFillHeight = () => {
    const scrollRoot = resolveScrollRoot();
    if (scrollRoot instanceof HTMLElement) {
      return scrollRoot.scrollHeight;
    }
    return Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    );
  };

  const updateEdgeBleeds = () => {
    const fillHeight = getFillHeight();

    if (document.body.classList.contains(artboardClass) !== true) {
      if (whiteBleed instanceof HTMLElement) {
        whiteBleed.style.display = "none";
      }
      if (greyBleed instanceof HTMLElement) {
        greyBleed.style.display = "none";
      }
      return;
    }

    const rect = layout.getBoundingClientRect();
    const rightWidth = Math.max(0, document.documentElement.clientWidth - rect.right);
    const leftWidth = Math.max(0, rect.left);

    if (whiteBleed instanceof HTMLElement) {
      whiteBleed.style.display = "block";
      whiteBleed.style.left = `${rect.right + window.scrollX}px`;
      whiteBleed.style.width = `${rightWidth}px`;
      whiteBleed.style.minHeight = `${fillHeight}px`;
    }

    if (greyBleed instanceof HTMLElement) {
      greyBleed.style.display = "block";
      greyBleed.style.left = "0";
      greyBleed.style.width = `${leftWidth + window.scrollX}px`;
      greyBleed.style.minHeight = `${fillHeight}px`;
    }
  };

  const apply = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    layout.style.removeProperty("zoom");
    layout.style.removeProperty("--detail-scale");
    if (resolveScrollRoot() === null) {
      document.documentElement.style.removeProperty("--detail-scale");
    }
    stage.style.removeProperty("width");
    stage.style.removeProperty("min-height");
    stage.style.removeProperty("margin-left");
    stage.style.removeProperty("margin-right");
    document.body.classList.remove(artboardClass);

    if (isEnabled() !== true) {
      layout.dataset.scale = "1";
      layout.style.setProperty("--detail-scale", "1");
      syncLeftRailAnchors();
      updateEdgeBleeds();
      return;
    }

    if (vw < LARGE_MIN_W || vh < LARGE_MIN_H) {
      layout.dataset.scale = "1";
      if (resolveScrollRoot() === null) {
        document.documentElement.style.setProperty("--detail-scale", "1");
      }
      layout.style.setProperty("--detail-scale", "1");
      syncLeftRailAnchors();
      updateEdgeBleeds();
      return;
    }

    const scaleW = vw / BASE_W;
    const scaleH = vh / BASE_H;
    let scale = Math.min(scaleW, scaleH);
    scale = clamp(scale, 1, 2);

    let scaledW = BASE_W * scale;
    let scaledH = BASE_H * scale;
    if (scaledW > vw || scaledH > vh) {
      const fit = Math.min(vw / scaledW, vh / scaledH);
      scale *= fit;
      scaledW = BASE_W * scale;
    }

    scale = Math.max(scale, 1);
    scale = clamp(scale, 1, 2);

    layout.dataset.scale = String(scale);
    if (resolveScrollRoot() === null) {
      document.documentElement.style.setProperty("--detail-scale", String(scale));
    }
    layout.style.setProperty("--detail-scale", String(scale));

    stage.style.width = "100%";
    stage.style.minHeight = `${layout.offsetHeight}px`;
    stage.style.marginLeft = "0";
    stage.style.marginRight = "0";
    document.body.classList.add(artboardClass);
    syncLeftRailAnchors();
    updateEdgeBleeds();
  };

  const onScroll = () => {
    window.requestAnimationFrame(() => {
      syncLeftRailAnchors();
      updateEdgeBleeds();
    });
  };

  apply();

  window.addEventListener(
    "resize",
    () => {
      window.requestAnimationFrame(apply);
    },
    { passive: true },
  );

  if (rightCol instanceof HTMLElement) {
    rightCol.addEventListener("scroll", onScroll, { passive: true });
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  desktopRailMq.addEventListener("change", () => {
    window.requestAnimationFrame(apply);
  });

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(apply);
    });
    observer.observe(layout);
    if (leftAnchor instanceof HTMLElement) {
      observer.observe(leftAnchor);
    }
    if (leftRail instanceof HTMLElement) {
      observer.observe(leftRail);
    }
    if (rightCol instanceof HTMLElement) {
      observer.observe(rightCol);
    }
    const leftTop = scope.querySelector(".detail__left-top");
    const leftBottom = scope.querySelector(".detail__left-bottom");
    if (leftTop instanceof HTMLElement) {
      observer.observe(leftTop);
    }
    if (leftBottom instanceof HTMLElement) {
      observer.observe(leftBottom);
    }
    const titleEl = scope.querySelector(`#${titleId}`);
    if (titleEl instanceof HTMLElement) {
      observer.observe(titleEl);
    }
    if (rightCol instanceof HTMLElement) {
      observer.observe(rightCol);
    }
  }

  window.addEventListener(
    "load",
    () => {
      window.requestAnimationFrame(apply);
    },
    { passive: true },
  );

  return apply;
}

function bootDetailScale() {
  if (document.body.classList.contains("detail")) {
    initDetailScaleInRoot(document, { artboardClass: "detail--artboard-scale" });
  }

  const aboutPage = document.querySelector(".about-page");
  if (aboutPage instanceof HTMLElement) {
    const aboutNarrowMq = window.matchMedia("(max-width: 900px)");
    const applyAbout = initDetailScaleInRoot(aboutPage, {
      artboardClass: "about--artboard-scale",
      isEnabled: () => document.body.classList.contains("about-view") === true,
      getScrollRoot: () => {
        if (document.body.classList.contains("about-view") !== true) {
          return null;
        }
        if (aboutNarrowMq.matches === true) {
          const stage = aboutPage.querySelector(".detail-stage");
          return stage instanceof HTMLElement ? stage : null;
        }
        const right = aboutPage.querySelector(".detail__right");
        return right instanceof HTMLElement ? right : null;
      },
      titleId: "about-title",
    });
    if (typeof applyAbout === "function") {
      window.__refreshAboutDetailScale = applyAbout;
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootDetailScale);
} else {
  bootDetailScale();
}
