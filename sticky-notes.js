function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getNumberAttr(el, name, fallback) {
  const v = el.getAttribute(name);
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function applyTransform(el, x, y, rotDeg) {
  el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotDeg}deg)`;
}

function setZ(el, z) {
  el.style.zIndex = String(z);
}

function magnitude(x, y) {
  return Math.hypot(x, y);
}

function initStickyNotes() {
  const stage = document.querySelector(".stage");
  const cards = document.querySelector(".cards");
  const scene = document.querySelector(".scene");
  const notes = Array.from(document.querySelectorAll(".sticky"));
  if (!stage || notes.length === 0) return;

  const MOBILE_BREAKPOINT_PX = 640;

  let topZ = 10;

  /** @type {number | null} */
  let resizeRaf = null;

  let pendingLayout = false;

  const NOTE_SIZE_PX = 246;

  /** Axis-aligned bounding-box fraction allowed past each stage/container edge (per side). */
  const EDGE_OVERFLOW_FRACTION = 0.5;

  function getSceneScale() {
    if (!(scene instanceof HTMLElement)) return 1;
    const raw = Number(scene.dataset.scale);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  }

  function readPreset(note) {
    const desktopX = getNumberAttr(note, "data-desktop-x", NaN);
    const desktopY = getNumberAttr(note, "data-desktop-y", NaN);
    const mobileX = getNumberAttr(note, "data-mobile-x", NaN);
    const mobileY = getNumberAttr(note, "data-mobile-y", NaN);

    return {
      desktopX,
      desktopY,
      mobileX,
      mobileY,
    };
  }

  /**
   * Interpolate between desktop (wide) and mobile (narrow) presets so positions track the viewport
   * smoothly instead of jumping only at a breakpoint.
   */
  function activePreset(note) {
    const p = readPreset(note);
    const hasDesktop = Number.isFinite(p.desktopX) && Number.isFinite(p.desktopY);
    const hasMobile = Number.isFinite(p.mobileX) && Number.isFinite(p.mobileY);

    if (hasDesktop && hasMobile) {
      const w = window.innerWidth;
      const t = clamp((w - MOBILE_BREAKPOINT_PX) / 520, 0, 1); // ~640–1160px blend zone
      return {
        x: p.mobileX + (p.desktopX - p.mobileX) * t,
        y: p.mobileY + (p.desktopY - p.mobileY) * t,
      };
    }

    if (hasDesktop) return { x: p.desktopX, y: p.desktopY };
    if (hasMobile) return { x: p.mobileX, y: p.mobileY };
    return { x: 0, y: 0 };
  }

  function rotRad(rotDeg) {
    return (rotDeg * Math.PI) / 180;
  }

  function axisAlignedBoundsForRotatedSquare(rotDeg, tx, ty, size = NOTE_SIZE_PX) {
    const rad = rotRad(rotDeg);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const corners = [
      [0, 0],
      [size, 0],
      [size, size],
      [0, size],
    ];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const [x, y] of corners) {
      const xr = x * cos - y * sin + tx;
      const yr = x * sin + y * cos + ty;
      minX = Math.min(minX, xr);
      minY = Math.min(minY, yr);
      maxX = Math.max(maxX, xr);
      maxY = Math.max(maxY, yr);
    }

    return { minX, minY, maxX, maxY };
  }

  function containerMetrics() {
    const target = cards instanceof HTMLElement ? cards : stage;
    const rect = target.getBoundingClientRect();
    const cs = window.getComputedStyle(target);
    const padL = Number.parseFloat(cs.paddingLeft) || 0;
    const padR = Number.parseFloat(cs.paddingRight) || 0;
    const innerW = Math.max(0, rect.width - padL - padR);
    return { rect, padL, padR, innerW, target };
  }

  /**
   * Fits sticky notes into the container width **locally**:
   * only notes whose rotated bounds cross an edge get their `x` nudged.
   * (No global “pile squish” / group translation.)
   */
  function fitPositionsToContainer(basePositions) {
    const { padL, innerW } = containerMetrics();
    if (innerW <= 1) return basePositions;

    const left = padL;
    const right = padL + innerW;

    let positions = basePositions.map((p) => ({ x: p.x, y: p.y }));

    for (let iter = 0; iter < 8; iter += 1) {
      let changed = false;

      for (let i = 0; i < positions.length; i += 1) {
        const rot = getNumberAttr(notes[i], "data-rot", 0);
        const p = positions[i];
        const b = axisAlignedBoundsForRotatedSquare(rot, p.x, p.y);
        let dx = 0;

        const bb0 = axisAlignedBoundsForRotatedSquare(rot, 0, 0);
        const aw = bb0.maxX - bb0.minX;
        const slack = EDGE_OVERFLOW_FRACTION * aw;
        const innerLeft = left - slack;
        const innerRight = right + slack;

        if (b.minX < innerLeft) dx += innerLeft - b.minX;
        if (b.maxX > innerRight) dx -= b.maxX - innerRight;

        if (dx !== 0) {
          positions[i].x += dx;
          changed = true;
        }
      }

      if (!changed) break;
    }

    return positions;
  }

  function layoutNotes() {
    const dragging = notes.some((n) => n.classList.contains("sticky--dragging")) === true;
    if (dragging) {
      pendingLayout = true;
      return;
    }

    pendingLayout = false;

    const base = notes.map((note) => activePreset(note));

    const fitted = fitPositionsToContainer(base);
    for (let i = 0; i < notes.length; i += 1) {
      applyCoords(notes[i], fitted[i].x, fitted[i].y);
    }
  }

  function applyCoords(note, x, y) {
    note.setAttribute("data-x", String(x));
    note.setAttribute("data-y", String(y));
    const rot = getNumberAttr(note, "data-rot", 0);
    applyTransform(note, x, y, rot);
  }

  /**
   * layoutNotes() recomputes from desktop/mobile presets — without this, any
   * post-drag layout would snap notes back. Sync presets to the live position.
   */
  function persistDraggedPosition(note) {
    const x = getNumberAttr(note, "data-x", 0);
    const y = getNumberAttr(note, "data-y", 0);
    note.setAttribute("data-desktop-x", String(x));
    note.setAttribute("data-desktop-y", String(y));
    const mx = getNumberAttr(note, "data-mobile-x", NaN);
    const my = getNumberAttr(note, "data-mobile-y", NaN);
    if (Number.isFinite(mx) && Number.isFinite(my)) {
      note.setAttribute("data-mobile-x", String(x));
      note.setAttribute("data-mobile-y", String(y));
    }
  }

  /** Drag coords (`data-x` / `data-y`) are relative to `.cards`; constrain using its box, not padded `.stage`. */
  function constrainBoundsSize() {
    const target = cards instanceof HTMLElement ? cards : stage;
    const r = target.getBoundingClientRect();
    return { width: r.width, height: r.height };
  }

  function constrainToStage(noteEl, x, y) {
    const sb = constrainBoundsSize();
    const rot = getNumberAttr(noteEl, "data-rot", 0);
    const bb0 = axisAlignedBoundsForRotatedSquare(rot, 0, 0);
    const w = bb0.maxX - bb0.minX;
    const h = bb0.maxY - bb0.minY;
    const sx = EDGE_OVERFLOW_FRACTION * w;
    const sy = EDGE_OVERFLOW_FRACTION * h;

    const minTx = -sx - bb0.minX;
    const maxTx = sb.width + sx - bb0.maxX;
    const minTy = -sy - bb0.minY;
    const maxTy = sb.height + sy - bb0.maxY;

    return {
      x: clamp(x, minTx, maxTx),
      y: clamp(y, minTy, maxTy),
    };
  }

  /** Patent (case-tilt) sticky sits above the rest on narrow viewports so it stays easy to spot. */
  function applyStickyStackOrder() {
    const narrow = window.innerWidth <= MOBILE_BREAKPOINT_PX;
    const patentNote =
      notes.find((n) => n.classList.contains("card--case-tilt")) ?? null;

    let maxDeclared = 10;
    for (const note of notes) {
      const sz = getNumberAttr(note, "data-stack-z", NaN);
      if (Number.isFinite(sz)) maxDeclared = Math.max(maxDeclared, sz);
    }

    topZ = 10;
    const patentZ = narrow && patentNote !== null ? maxDeclared + 1 : null;

    for (const note of notes) {
      const stackZ = getNumberAttr(note, "data-stack-z", NaN);
      let z = Number.isFinite(stackZ) ? stackZ : topZ;
      if (patentZ !== null && note === patentNote) {
        z = patentZ;
      }
      setZ(note, z);
      topZ = Math.max(topZ, z + 1);
    }
  }

  for (const note of notes) {
    const x0 = getNumberAttr(note, "data-x", 0);
    const y0 = getNumberAttr(note, "data-y", 0);
    note.setAttribute("data-desktop-x", String(x0));
    note.setAttribute("data-desktop-y", String(y0));
  }

  applyStickyStackOrder();

  layoutNotes();

  window.addEventListener("resize", () => {
    if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      applyStickyStackOrder();
      layoutNotes();
    });
  });

  function attachDrag(note) {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    const rot = getNumberAttr(note, "data-rot", 0);

    /** @type {Array<{ t: number; x: number; y: number }>} */
    let samples = [];
    let settleRaf = 0;
    let settleStart = 0;
    let settleLast = 0;

    const stopSettle = () => {
      if (settleRaf !== 0) {
        cancelAnimationFrame(settleRaf);
        settleRaf = 0;
      }
      settleStart = 0;
      settleLast = 0;
    };

    const pushSample = (t, x, y) => {
      samples.push({ t, x, y });
      const cutoff = t - 120;
      while (samples.length > 1 && samples[0].t < cutoff) samples.shift();
    };

    const estimateReleaseVelocityPxPerMs = () => {
      if (samples.length < 2) return { vx: 0, vy: 0 };
      const b = samples[samples.length - 1];

      // Prefer the freshest segment with a meaningful dt (some browsers can emit
      // duplicate timestamps for sequential events).
      let a = samples[samples.length - 2];
      for (let i = samples.length - 2; i >= 0; i -= 1) {
        if (b.t - samples[i].t >= 5) {
          a = samples[i];
          break;
        }
      }

      const dt = b.t - a.t;
      if (dt < 1) return { vx: 0, vy: 0 };
      let vx = (b.x - a.x) / dt;
      let vy = (b.y - a.y) / dt;

      // Make the glide subtle: damp inherited velocity and keep the cap low.
      const damp = 0.14;
      vx *= damp;
      vy *= damp;

      const cap = 0.28; // px/ms (~280 px/s)
      const speed = magnitude(vx, vy);
      if (speed > cap) {
        const s = cap / speed;
        return { vx: vx * s, vy: vy * s };
      }
      return { vx, vy };
    };

    /** @returns {boolean} whether a settle animation was scheduled */
    const settleFromVelocity = (vx, vy) => {
      stopSettle();

      // If the user basically stopped, don't add extra motion.
      if (magnitude(vx, vy) < 0.22) return false;

      let x = getNumberAttr(note, "data-x", 0);
      let y = getNumberAttr(note, "data-y", 0);

      // Subtle settle: strong braking + short hard cap (mostly just a tiny ease-out).
      const frictionPerMs = 0.0072; // higher = stops sooner
      const minSpeed = 0.09; // px/ms
      const maxMs = 200;

      const step = (now) => {
        if (settleStart === 0) settleStart = now;
        const elapsed = now - settleStart;
        if (settleLast === 0) {
          settleLast = now;
          settleRaf = requestAnimationFrame(step);
          return;
        }
        const dtRaw = now - settleLast;
        settleLast = now;
        const dt = clamp(dtRaw, 1, 32);

        const decay = Math.pow(1 - frictionPerMs, dt);
        vx *= decay;
        vy *= decay;

        x += vx * dt;
        y += vy * dt;

        const before = { x, y };
        const next = constrainToStage(note, x, y);
        x = next.x;
        y = next.y;

        // If we hit a boundary, kill velocity on that axis (simple, stable bounce feel).
        if (x !== before.x) vx = 0;
        if (y !== before.y) vy = 0;

        note.setAttribute("data-x", String(x));
        note.setAttribute("data-y", String(y));
        applyTransform(note, x, y, rot);

        const stillMoving = magnitude(vx, vy) > minSpeed;
        const hardStop = elapsed >= maxMs;
        if (!hardStop && stillMoving) {
          settleRaf = requestAnimationFrame(step);
        } else {
          settleRaf = 0;
          settleStart = 0;
          settleLast = 0;
          persistDraggedPosition(note);
          requestAnimationFrame(() => {
            layoutNotes();
          });
        }
      };

      settleRaf = requestAnimationFrame(step);
      return true;
    };

    const onPointerDown = (e) => {
      if (!(e instanceof PointerEvent)) return;
      if (pointerId !== null) return;
      pointerId = e.pointerId;
      note.setPointerCapture(pointerId);

      stopSettle();
      samples = [];

      note.classList.add("sticky--dragging");
      setZ(note, topZ++);

      startX = e.clientX;
      startY = e.clientY;
      originX = getNumberAttr(note, "data-x", 0);
      originY = getNumberAttr(note, "data-y", 0);

      pushSample(e.timeStamp, originX, originY);
    };

    const onPointerMove = (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      const s = getSceneScale();
      const dx = (e.clientX - startX) / s;
      const dy = (e.clientY - startY) / s;
      const next = constrainToStage(note, originX + dx, originY + dy);
      note.setAttribute("data-x", String(next.x));
      note.setAttribute("data-y", String(next.y));
      applyTransform(note, next.x, next.y, rot);
      pushSample(e.timeStamp, next.x, next.y);
    };

    const endDrag = (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      try {
        note.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
      pointerId = null;
      note.classList.remove("sticky--dragging");

      const { vx, vy } = estimateReleaseVelocityPxPerMs();
      const settled = settleFromVelocity(vx, vy);
      if (settled !== true) {
        persistDraggedPosition(note);
        requestAnimationFrame(() => {
          layoutNotes();
        });
      } else if (pendingLayout === true) {
        requestAnimationFrame(() => {
          layoutNotes();
        });
      }
    };

    note.addEventListener("pointerdown", onPointerDown);
    note.addEventListener("pointermove", onPointerMove);
    note.addEventListener("pointerup", endDrag);
    note.addEventListener("pointercancel", endDrag);
  }

  for (const note of notes) attachDrag(note);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStickyNotes);
} else {
  initStickyNotes();
}

