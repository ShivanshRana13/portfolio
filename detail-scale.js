function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function initDetailScale() {
  const stage = document.querySelector(".detail-stage");
  const layout = document.querySelector(".detail-layout");
  const leftAnchor = document.querySelector(".detail__left-spacer");
  const leftRail = document.querySelector(".detail__left");
  const rightCol = document.querySelector(".detail__right");
  const whiteBleed = document.querySelector(".detail__white-bleed");
  const greyBleed = document.querySelector(".detail__grey-bleed");
  const desktopRailMq = window.matchMedia("(min-width: 901px)");
  if (!(stage instanceof HTMLElement) || !(layout instanceof HTMLElement)) {
    return;
  }

  const BASE_W = 1440;
  const BASE_H = 1024;
  const LARGE_MIN_W = 1440;
  const LARGE_MIN_H = 1024;
  const LEFT_PAD = 64;

  const measureLeftColumnWidth = () => {
    const top = document.querySelector(".detail__left-top");
    const bottom = document.querySelector(".detail__left-bottom");
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
    const isScaled =
      document.body.classList.contains("detail--artboard-scale") === true;
    const scale = parseFloat(layout.dataset.scale || "1") || 1;

    if (isScaled && scale > 0) {
      const layoutRect = layout.getBoundingClientRect();
      x = (leftRect.left - layoutRect.left) / scale;
    }

    root.style.setProperty("--detail-left-x", `${x}px`);
    root.style.setProperty("--detail-left-w", `${width}px`);
  };

  const updateEdgeBleeds = () => {
    const fillHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    );

    if (document.body.classList.contains("detail--artboard-scale") !== true) {
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
    stage.style.removeProperty("width");
    stage.style.removeProperty("min-height");
    stage.style.removeProperty("margin-left");
    stage.style.removeProperty("margin-right");
    document.body.classList.remove("detail--artboard-scale");

    if (vw < LARGE_MIN_W || vh < LARGE_MIN_H) {
      layout.dataset.scale = "1";
      layout.style.setProperty("--detail-scale", "1");
      syncLeftRailAnchors();
      updateEdgeBleeds();
      return;
    }

    const scaleW = vw / BASE_W;
    const scaleH = vh / BASE_H;
    let scale = Math.min(scaleW, scaleH);
    scale = clamp(scale, 1, 3);

    let scaledW = BASE_W * scale;
    let scaledH = BASE_H * scale;
    if (scaledW > vw || scaledH > vh) {
      const fit = Math.min(vw / scaledW, vh / scaledH);
      scale *= fit;
      scaledW = BASE_W * scale;
    }

    scale = Math.max(scale, 1);

    layout.dataset.scale = String(scale);
    layout.style.setProperty("--detail-scale", String(scale));

    stage.style.width = "100%";
    stage.style.minHeight = `${layout.offsetHeight}px`;
    stage.style.marginLeft = "0";
    stage.style.marginRight = "0";
    document.body.classList.add("detail--artboard-scale");
    syncLeftRailAnchors();
    updateEdgeBleeds();
  };

  apply();

  window.addEventListener(
    "resize",
    () => {
      window.requestAnimationFrame(apply);
    },
    { passive: true },
  );

  window.addEventListener(
    "scroll",
    () => {
      window.requestAnimationFrame(() => {
        syncLeftRailAnchors();
        updateEdgeBleeds();
      });
    },
    { passive: true },
  );

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
    const leftTop = document.querySelector(".detail__left-top");
    const leftBottom = document.querySelector(".detail__left-bottom");
    if (leftTop instanceof HTMLElement) {
      observer.observe(leftTop);
    }
    if (leftBottom instanceof HTMLElement) {
      observer.observe(leftBottom);
    }
    const titleEl = document.getElementById("detail-title");
    if (titleEl instanceof HTMLElement) {
      observer.observe(titleEl);
    }
  }

  window.addEventListener(
    "load",
    () => {
      window.requestAnimationFrame(apply);
    },
    { passive: true },
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDetailScale);
} else {
  initDetailScale();
}
