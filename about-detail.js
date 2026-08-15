/** About page — detail-rail scroll indicator + title shrink (mirrors detail.js). */

const ABOUT_TITLE_MIN_PX = 21;
const ABOUT_SCROLL_END_THRESHOLD_PX = 4;
const ABOUT_MOBILE_MINI_TITLE_HIDE_DOWN_PX = 2;
const ABOUT_MOBILE_MINI_TITLE_REVEAL_UP_PX = 6;
const ABOUT_MOBILE_HEADER_LANDING = "about--mobile-landing";
const ABOUT_MOBILE_HEADER_MINI_TITLE = "about--mobile-mini-title";

function getAboutScrollRoot() {
  const root = document.querySelector(".about-page");
  return root instanceof HTMLElement ? root : null;
}

function getAboutScrollY() {
  const root = getAboutScrollRoot();
  if (root !== null) {
    return root.scrollTop < 0 ? 0 : root.scrollTop;
  }
  return 0;
}

function getAboutMaxScrollPx() {
  const root = getAboutScrollRoot();
  if (root === null) {
    return 0;
  }
  const vh =
    window.visualViewport !== undefined && typeof window.visualViewport.height === "number"
      ? window.visualViewport.height
      : window.innerHeight;
  return Math.max(0, root.scrollHeight - vh);
}

function scrollAboutToTop() {
  const root = getAboutScrollRoot();
  if (root === null) {
    return;
  }
  const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const behavior = reduceMotionMq.matches === true ? "auto" : "smooth";
  root.scrollTo({ top: 0, left: 0, behavior: behavior });
}

function initAboutScrollLevelIndicator() {
  const noop = function () {};

  const wrapper = document.getElementById("about-scroll-level");
  const track = document.getElementById("about-scroll-track");
  const scrollUpBtn = document.getElementById("about-scroll-up");
  if (wrapper === null) {
    return noop;
  }

  const narrowLayoutMq = window.matchMedia("(max-width: 900px)");
  const visibleClass = "detail__scroll-level--visible";
  const completeClass = "detail__scroll-level--complete";

  if (scrollUpBtn !== null) {
    scrollUpBtn.addEventListener("click", scrollAboutToTop);
  }

  function apply() {
    if (document.body.classList.contains("about-view") !== true) {
      return;
    }

    const maxScroll = getAboutMaxScrollPx();
    const y = getAboutScrollY();
    let remaining = 1;
    if (maxScroll > 0.5) {
      const scrolled = Math.min(1, Math.max(0, y / maxScroll));
      remaining = 1 - scrolled;
    }

    const atEnd = maxScroll > 0.5 && maxScroll - y <= ABOUT_SCROLL_END_THRESHOLD_PX;

    wrapper.style.setProperty("--detail-scroll-remaining", remaining.toFixed(4));
    wrapper.classList.toggle(completeClass, atEnd);

    if (scrollUpBtn !== null) {
      if (narrowLayoutMq.matches === true) {
        scrollUpBtn.hidden = !atEnd;
        scrollUpBtn.removeAttribute("tabindex");
      } else {
        scrollUpBtn.hidden = false;
        scrollUpBtn.setAttribute("aria-hidden", atEnd ? "false" : "true");
        scrollUpBtn.tabIndex = atEnd ? 0 : -1;
      }
    }

    if (track !== null) {
      track.setAttribute("aria-hidden", atEnd ? "true" : "false");
    }

    if (atEnd) {
      wrapper.removeAttribute("role");
      wrapper.removeAttribute("aria-valuemin");
      wrapper.removeAttribute("aria-valuemax");
      wrapper.removeAttribute("aria-valuenow");
      wrapper.removeAttribute("aria-label");
    } else {
      const pct = Math.max(0, Math.min(100, Math.round(remaining * 100)));
      wrapper.setAttribute("role", "progressbar");
      wrapper.setAttribute("aria-valuemin", "0");
      wrapper.setAttribute("aria-valuemax", "100");
      wrapper.setAttribute("aria-valuenow", String(pct));
      wrapper.setAttribute("aria-label", "How much content is left to scroll");
    }

    const hasScrolled = y > 0;
    wrapper.classList.toggle(visibleClass, hasScrolled);
    wrapper.setAttribute("aria-hidden", hasScrolled || atEnd ? "false" : "true");
  }

  return apply;
}

function initAboutTitleScrollShrink() {
  const noop = function () {};

  const titleEl = document.getElementById("about-title");
  const titleSectionEl = document.querySelector(".about-page .detail__left-top");
  const miniTitleEl = document.getElementById("about-mini-title");
  if (titleEl === null) {
    return noop;
  }

  const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrowLayoutMq = window.matchMedia("(max-width: 900px)");

  let maxPx = 34;
  let lastScrollY = 0;
  let wasPastTitleSection = false;
  let mobileHeaderMode = ABOUT_MOBILE_HEADER_LANDING;
  let miniTitleRevealCarryPx = 0;

  function getFirstFoldPx() {
    if (
      window.visualViewport !== undefined &&
      window.visualViewport !== null &&
      typeof window.visualViewport.height === "number"
    ) {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  }

  function clearTitleScrollVars() {
    document.body.style.removeProperty("--about-title-fs");
    document.body.style.removeProperty("--about-title-fw");
  }

  function clearMobileHeaderModes() {
    document.body.classList.remove(ABOUT_MOBILE_HEADER_LANDING, ABOUT_MOBILE_HEADER_MINI_TITLE);
  }

  function setMobileHeaderMode(nextMode) {
    if (document.body.classList.contains(nextMode) === true) {
      return;
    }
    clearMobileHeaderModes();
    document.body.classList.add(nextMode);
    if (miniTitleEl !== null) {
      const showMini = nextMode === ABOUT_MOBILE_HEADER_MINI_TITLE;
      miniTitleEl.hidden = !showMini;
      miniTitleEl.setAttribute("aria-hidden", showMini ? "false" : "true");
    }
  }

  function getMobileTitleSectionHeightPx() {
    if (titleSectionEl === null) {
      return 0;
    }
    return titleSectionEl.offsetHeight;
  }

  function measureTitleMaxPx() {
    const wasMobileModes = narrowLayoutMq.matches === true;
    if (wasMobileModes) {
      clearMobileHeaderModes();
      document.body.classList.add(ABOUT_MOBILE_HEADER_LANDING);
    } else {
      clearTitleScrollVars();
    }
    const px = parseFloat(window.getComputedStyle(titleEl).fontSize);
    const fallback = 34;
    maxPx = Number.isFinite(px) && px > ABOUT_TITLE_MIN_PX ? px : fallback;
    if (wasMobileModes) {
      clearMobileHeaderModes();
    }
  }

  function applyMobile() {
    if (titleSectionEl === null) {
      wasPastTitleSection = false;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = ABOUT_MOBILE_HEADER_LANDING;
      setMobileHeaderMode(ABOUT_MOBILE_HEADER_LANDING);
      return;
    }

    const y = getAboutScrollY();
    const titleSectionH = getMobileTitleSectionHeightPx();
    const pastTitleSection = titleSectionH > 0 && y > titleSectionH;

    if (pastTitleSection !== true) {
      wasPastTitleSection = false;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = ABOUT_MOBILE_HEADER_LANDING;
      setMobileHeaderMode(ABOUT_MOBILE_HEADER_LANDING);
      lastScrollY = y;
      return;
    }

    const deltaY = y - lastScrollY;
    lastScrollY = y;

    if (wasPastTitleSection === false) {
      wasPastTitleSection = true;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = ABOUT_MOBILE_HEADER_LANDING;
      setMobileHeaderMode(mobileHeaderMode);
      return;
    }

    if (deltaY > ABOUT_MOBILE_MINI_TITLE_HIDE_DOWN_PX) {
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = ABOUT_MOBILE_HEADER_LANDING;
    } else if (deltaY < 0) {
      miniTitleRevealCarryPx += -deltaY;
      if (miniTitleRevealCarryPx >= ABOUT_MOBILE_MINI_TITLE_REVEAL_UP_PX) {
        mobileHeaderMode = ABOUT_MOBILE_HEADER_MINI_TITLE;
      }
    }

    setMobileHeaderMode(mobileHeaderMode);
  }

  function applyDesktop() {
    const y = getAboutScrollY();
    const firstFoldPx = getFirstFoldPx();
    const shrinkStartPx = firstFoldPx * 0.5;
    const shrinkRangePx = firstFoldPx - shrinkStartPx;
    let t = 0;
    if (y > shrinkStartPx && shrinkRangePx > 0) {
      const tRaw = (y - shrinkStartPx) / shrinkRangePx;
      t = tRaw <= 0 ? 0 : tRaw >= 1 ? 1 : tRaw;
    }
    const fs = maxPx - (maxPx - ABOUT_TITLE_MIN_PX) * t;
    document.body.style.setProperty("--about-title-fs", `${fs}px`);
  }

  function apply() {
    if (document.body.classList.contains("about-view") !== true) {
      clearTitleScrollVars();
      clearMobileHeaderModes();
      if (miniTitleEl !== null) {
        miniTitleEl.hidden = true;
        miniTitleEl.setAttribute("aria-hidden", "true");
      }
      return;
    }

    if (reduceMotionMq.matches === true) {
      clearTitleScrollVars();
      if (narrowLayoutMq.matches === true) {
        setMobileHeaderMode(ABOUT_MOBILE_HEADER_LANDING);
      } else {
        clearMobileHeaderModes();
      }
      return;
    }

    if (narrowLayoutMq.matches === true) {
      applyMobile();
      return;
    }

    clearMobileHeaderModes();
    applyDesktop();
  }

  function scheduleMeasureAndApply() {
    window.requestAnimationFrame(() => {
      lastScrollY = getAboutScrollY();
      wasPastTitleSection = false;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = ABOUT_MOBILE_HEADER_LANDING;
      measureTitleMaxPx();
      apply();
    });
  }

  scheduleMeasureAndApply();
  reduceMotionMq.addEventListener("change", scheduleMeasureAndApply);
  narrowLayoutMq.addEventListener("change", scheduleMeasureAndApply);
  window.addEventListener("resize", scheduleMeasureAndApply);

  return apply;
}

function initAboutDetailScroll() {
  const aboutPage = getAboutScrollRoot();
  if (aboutPage === null) {
    return;
  }

  const applyScrollLevel = initAboutScrollLevelIndicator();
  const applyTitle = initAboutTitleScrollShrink();
  let rafId = 0;

  function onScrollFrame() {
    applyScrollLevel();
    applyTitle();
    if (typeof window.__refreshAboutDetailScale === "function") {
      window.__refreshAboutDetailScale();
    }
  }

  function onScroll() {
    if (rafId !== 0) {
      return;
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      onScrollFrame();
    });
  }

  aboutPage.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    window.requestAnimationFrame(onScrollFrame);
  });
  window.addEventListener("orientationchange", () => {
    window.requestAnimationFrame(onScrollFrame);
  });
  if (window.visualViewport !== undefined && window.visualViewport !== null) {
    window.visualViewport.addEventListener("resize", () => {
      window.requestAnimationFrame(onScrollFrame);
    });
  }

  window.__refreshAboutDetailScroll = onScrollFrame;
  window.requestAnimationFrame(onScrollFrame);
}

function resetAboutScroll() {
  const root = getAboutScrollRoot();
  if (root !== null) {
    root.scrollTop = 0;
  }
  document.body.style.removeProperty("--about-title-fs");
  document.body.style.removeProperty("--about-title-fw");
  document.body.classList.remove(ABOUT_MOBILE_HEADER_LANDING, ABOUT_MOBILE_HEADER_MINI_TITLE);
  const miniTitleEl = document.getElementById("about-mini-title");
  if (miniTitleEl !== null) {
    miniTitleEl.hidden = true;
    miniTitleEl.setAttribute("aria-hidden", "true");
  }
  if (typeof window.__refreshAboutDetailScroll === "function") {
    window.__refreshAboutDetailScroll();
  }
  if (typeof window.__refreshAboutDetailScale === "function") {
    window.__refreshAboutDetailScale();
  }
}

window.__resetAboutScroll = resetAboutScroll;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAboutDetailScroll);
} else {
  initAboutDetailScroll();
}
