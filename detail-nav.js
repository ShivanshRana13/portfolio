/**
 * Badge is an <a>; stop propagation so sticky drag / pointer handlers on the card
 * don't treat badge interaction as a drag on the note.
 */
function initDetailNav() {
  document.querySelectorAll("a.sticky-badge").forEach((badge) => {
    badge.addEventListener(
      "pointerdown",
      (e) => {
        e.stopPropagation();
      },
      true,
    );
    badge.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
      },
      true,
    );
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDetailNav);
} else {
  initDetailNav();
}
