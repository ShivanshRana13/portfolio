/** Per-tile titles + fallback body copy for the detail page (expand anytime). */
const TILE_COPY = {
  education: {
    title: "Redesign of a modular character rigging tool",
    year: "2026",
  },
  "case-tilt": {
    title: "Designing a patented 3d tool",
    year: "2026",
  },
  case: {
    title: "Redesign of a modular character rigging tool",
    year: "2026",
  },
  college: {
    title: "Redesign of a modular character rigging tool",
    year: "2026",
  },
  passions: {
    title: "Redesign of a modular character rigging tool",
    year: "2026",
  },
  instagram: {
    title: "Redesign of a modular character rigging tool",
    year: "2026",
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
  const yearEl = document.getElementById("detail-year");
  if (titleEl && meta) {
    titleEl.textContent = meta.title;
    document.title = `${meta.title} · Portfolio`;
  }
  if (yearEl && meta && meta.year) {
    yearEl.textContent = meta.year;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDetailPage);
} else {
  initDetailPage();
}
