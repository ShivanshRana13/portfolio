/**
 * Badge is an <a>; stop propagation so sticky drag / pointer handlers on the card
 * don't treat badge interaction as a drag on the note.
 *
 * Case-study back links set a one-shot flag so index.html can restore the grey
 * homepage after bfcache (common when leaving from the scroll mini title bar).
 */
function markHomepageResetOnLeave() {
  try {
    sessionStorage.setItem("portfolio:reset-home", "1");
  } catch {
    // sessionStorage may be unavailable in private mode
  }
}

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

  document.querySelectorAll("a.detail__back[href]").forEach((backLink) => {
    if (!(backLink instanceof HTMLAnchorElement)) {
      return;
    }
    const href = backLink.getAttribute("href") || "";
    if (href.includes("index.html") !== true && href !== "/" && href !== "./") {
      return;
    }
    backLink.addEventListener("click", () => {
      markHomepageResetOnLeave();
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDetailNav);
} else {
  initDetailNav();
}
