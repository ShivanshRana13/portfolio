function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function initDetailScale() {
  const stage = document.querySelector(".detail-stage");
  const layout = document.querySelector(".detail-layout");
  if (!(stage instanceof HTMLElement) || !(layout instanceof HTMLElement)) {
    return;
  }

  const BASE_W = 1440;
  const BASE_H = 1024;
  const LARGE_MIN_W = 1440;
  const LARGE_MIN_H = 1024;

  const apply = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    layout.style.removeProperty("transform");
    layout.style.removeProperty("transform-origin");
    stage.style.removeProperty("width");
    stage.style.removeProperty("min-height");
    document.body.classList.remove("detail--artboard-scale");

    if (vw < LARGE_MIN_W || vh < LARGE_MIN_H) {
      layout.dataset.scale = "1";
      layout.style.setProperty("--detail-scale", "1");
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

    stage.style.width = `${scaledW}px`;
    stage.style.minHeight = `${layout.offsetHeight * scale}px`;
    document.body.classList.add("detail--artboard-scale");
  };

  apply();

  window.addEventListener(
    "resize",
    () => {
      window.requestAnimationFrame(apply);
    },
    { passive: true },
  );

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(apply);
    });
    observer.observe(layout);
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
