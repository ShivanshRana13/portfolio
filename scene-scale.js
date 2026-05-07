function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function initSceneScale() {
  const scene = document.querySelector(".scene");
  if (!(scene instanceof HTMLElement)) return;

  const BASE_W = 1440;
  const BASE_H = 1024;
  const LARGE_MIN_W = 1440;
  const LARGE_MIN_H = 1024;

  const apply = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Only scale up on truly large displays (don't zoom typical laptop/tablet layouts).
    if (vw < LARGE_MIN_W || vh < LARGE_MIN_H) {
      scene.dataset.scale = "1";
      scene.style.setProperty("--scene-scale", "1");
      scene.style.setProperty("--scene-translate-x", "0px");
      scene.style.setProperty("--scene-translate-y", "0px");
      return;
    }

    const scaleW = vw / BASE_W;
    const scaleH = vh / BASE_H;
    let scale = Math.min(scaleW, scaleH);
    scale = clamp(scale, 1, 3);

    // Ensure the scaled artboard fits entirely within the viewport (avoid clipping on ultra-wide).
    let scaledW = BASE_W * scale;
    let scaledH = BASE_H * scale;
    if (scaledW > vw || scaledH > vh) {
      const fit = Math.min(vw / scaledW, vh / scaledH);
      scale *= fit;
      scaledW = BASE_W * scale;
      scaledH = BASE_H * scale;
    }

    // Never shrink below 100% — fit can otherwise dip under 1 and the whole scene looks tiny.
    scale = Math.max(scale, 1);

    scene.dataset.scale = String(scale);
    scene.style.setProperty("--scene-scale", String(scale));

    /* Centering is handled in CSS: `.stage` flex-centers the artboard; `transform-origin: center` on `.scene`. */
    scene.style.setProperty("--scene-translate-x", "0px");
    scene.style.setProperty("--scene-translate-y", "0px");
  };

  apply();

  window.addEventListener(
    "resize",
    () => {
      window.requestAnimationFrame(apply);
    },
    { passive: true },
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSceneScale);
} else {
  initSceneScale();
}
