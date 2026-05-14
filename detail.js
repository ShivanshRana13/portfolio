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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDetailPage);
} else {
  initDetailPage();
}
