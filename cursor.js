(function () {
  const finePointerMq = window.matchMedia("(pointer: fine)");
  const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  /** Exponential smoothing factor per frame (lower = heavier damping). */
  const DAMPING = 0.14;

  /** Surfaces darker than this (WCAG relative luminance) use a white ring. */
  const LUM_THRESHOLD_DARK_SURFACE = 0.45;

  /**
   * @param {string} value
   * @returns {{ r: number; g: number; b: number; a: number } | null}
   */
  function parseCssRgb(value) {
    if (value === "transparent" || value === undefined || value === "") {
      return null;
    }
    const m = value.match(
      /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/u,
    );
    if (m === null) {
      return null;
    }
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    const a = m[4] !== undefined ? Number(m[4]) : 1;
    if (
      !Number.isFinite(r) ||
      !Number.isFinite(g) ||
      !Number.isFinite(b) ||
      !Number.isFinite(a)
    ) {
      return null;
    }
    return { r, g, b, a };
  }

  /**
   * @param {number} c 0–255 sRGB channel
   */
  function linearizeSrgbChannel(c) {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }

  /**
   * WCAG 2.x relative luminance (sRGB).
   * @param {number} r
   * @param {number} g
   * @param {number} b
   */
  function relativeLuminance(r, g, b) {
    return (
      0.2126 * linearizeSrgbChannel(r) +
      0.7152 * linearizeSrgbChannel(g) +
      0.0722 * linearizeSrgbChannel(b)
    );
  }

  /**
   * Walk up from the hit target until we find a non-transparent background-color.
   * @param {Element | null} hitEl
   * @returns {{ r: number; g: number; b: number }}
   */
  function rgbUnderElement(hitEl) {
    let node = hitEl;
    while (node !== null && node.nodeType === Node.ELEMENT_NODE) {
      const bg = window.getComputedStyle(node).backgroundColor;
      const parsed = parseCssRgb(bg);
      if (parsed !== null && parsed.a >= 0.08) {
        return { r: parsed.r, g: parsed.g, b: parsed.b };
      }
      node = node.parentElement;
    }
    const htmlBg = parseCssRgb(window.getComputedStyle(document.documentElement).backgroundColor);
    if (htmlBg !== null) {
      return { r: htmlBg.r, g: htmlBg.g, b: htmlBg.b };
    }
    const bodyBg = parseCssRgb(window.getComputedStyle(document.body).backgroundColor);
    if (bodyBg !== null) {
      return { r: bodyBg.r, g: bodyBg.g, b: bodyBg.b };
    }
    return { r: 255, g: 255, b: 255 };
  }

  function init() {
    const el = document.createElement("div");
    el.className = "cursor-ring";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    document.body.classList.add("has-custom-cursor");

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let hasAnchor = false;
    let rafId = 0;

    /** @type {number} */
    let contrastRaf = 0;
    let pendingContrastX = 0;
    let pendingContrastY = 0;

    function applyTransform(px, py) {
      el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
    }

    function applyContrastAt(cx, cy) {
      const px = Math.max(0, Math.min(Math.floor(cx), window.innerWidth - 1));
      const py = Math.max(0, Math.min(Math.floor(cy), window.innerHeight - 1));
      const hit = document.elementFromPoint(px, py);
      if (hit === null) {
        el.classList.remove("cursor-ring--light");
        return;
      }
      const { r, g, b } = rgbUnderElement(hit);
      const lum = relativeLuminance(r, g, b);
      if (lum < LUM_THRESHOLD_DARK_SURFACE) {
        el.classList.add("cursor-ring--light");
      } else {
        el.classList.remove("cursor-ring--light");
      }
    }

    function scheduleContrastUpdate(cx, cy) {
      pendingContrastX = cx;
      pendingContrastY = cy;
      if (contrastRaf !== 0) {
        return;
      }
      contrastRaf = window.requestAnimationFrame(() => {
        contrastRaf = 0;
        applyContrastAt(pendingContrastX, pendingContrastY);
      });
    }

    function tick() {
      if (reduceMotionMq.matches === true) {
        rafId = 0;
        return;
      }

      x += (targetX - x) * DAMPING;
      y += (targetY - y) * DAMPING;
      applyTransform(x, y);

      const dx = targetX - x;
      const dy = targetY - y;
      if (dx * dx + dy * dy > 0.25) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        x = targetX;
        y = targetY;
        applyTransform(x, y);
        rafId = 0;
      }
    }

    function scheduleTick() {
      if (reduceMotionMq.matches === true) {
        return;
      }
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(tick);
      }
    }

    function onPointerMove(e) {
      if (!(e instanceof PointerEvent)) {
        return;
      }
      if (e.pointerType !== "mouse") {
        return;
      }

      targetX = e.clientX;
      targetY = e.clientY;

      if (hasAnchor !== true) {
        hasAnchor = true;
        x = targetX;
        y = targetY;
        applyTransform(x, y);
        el.classList.add("cursor-ring--visible");
        scheduleContrastUpdate(targetX, targetY);
        return;
      }

      if (reduceMotionMq.matches === true) {
        x = targetX;
        y = targetY;
        applyTransform(x, y);
        el.classList.add("cursor-ring--visible");
        scheduleContrastUpdate(targetX, targetY);
        return;
      }

      scheduleTick();
      el.classList.add("cursor-ring--visible");
      scheduleContrastUpdate(targetX, targetY);
    }

    function onPointerLeaveDoc() {
      el.classList.remove("cursor-ring--visible");
      el.classList.remove("cursor-ring--light");
    }

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onPointerLeaveDoc);

    /**
     * Cross-origin iframes do not bubble pointer events to the parent, so the ring
     * freezes at the last document position. Hide it while the pointer is inside
     * marked iframes and snap it to the exit point on leave.
     */
    function wireEmbedCursorSuppression() {
      const frames = document.querySelectorAll("iframe[data-cursor-suppress]");
      frames.forEach((frame) => {
        frame.addEventListener(
          "pointerenter",
          (e) => {
            if (!(e instanceof PointerEvent)) {
              return;
            }
            if (e.pointerType !== "mouse") {
              return;
            }
            document.body.classList.add("cursor-ring--over-embed");
            el.classList.remove("cursor-ring--visible");
            el.classList.remove("cursor-ring--light");
            if (rafId !== 0) {
              window.cancelAnimationFrame(rafId);
              rafId = 0;
            }
          },
          { passive: true },
        );
        frame.addEventListener(
          "pointerleave",
          (e) => {
            if (!(e instanceof PointerEvent)) {
              return;
            }
            if (e.pointerType !== "mouse") {
              return;
            }
            document.body.classList.remove("cursor-ring--over-embed");
            targetX = e.clientX;
            targetY = e.clientY;
            x = targetX;
            y = targetY;
            applyTransform(x, y);
            el.classList.add("cursor-ring--visible");
            scheduleContrastUpdate(targetX, targetY);
          },
          { passive: true },
        );
      });
    }

    wireEmbedCursorSuppression();

    reduceMotionMq.addEventListener("change", () => {
      if (reduceMotionMq.matches === true && rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
        x = targetX;
        y = targetY;
        applyTransform(x, y);
      }
    });
  }

  if (finePointerMq.matches !== true) {
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
