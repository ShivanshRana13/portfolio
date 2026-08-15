/** About page — same scroll / title behaviour as detail.js (document scroll). */

const TITLE_MIN_PX = 21;
const SCROLL_END_THRESHOLD_PX = 4;
const MOBILE_MINI_TITLE_HIDE_DOWN_PX = 2;
const MOBILE_MINI_TITLE_REVEAL_UP_PX = 6;
const MOBILE_HEADER_LANDING = "detail--mobile-landing";
const MOBILE_HEADER_MINI_TITLE = "detail--mobile-mini-title";

function getDetailScrollY() {
  const w = window.scrollY || window.pageYOffset || 0;
  const r = document.documentElement.scrollTop;
  const bodyTop = document.body.scrollTop;
  const se = document.scrollingElement;
  const seTop = se !== null && typeof se.scrollTop === "number" ? se.scrollTop : 0;
  const y = Math.max(w, r, bodyTop, seTop);
  return y < 0 ? 0 : y;
}

function getDetailMaxScrollPx() {
  const el = document.documentElement;
  const b = document.body;
  const sh = Math.max(el.scrollHeight, b.scrollHeight);
  const vh =
    window.visualViewport !== undefined && typeof window.visualViewport.height === "number"
      ? window.visualViewport.height
      : window.innerHeight;
  return Math.max(0, sh - vh);
}

function bindDetailScroll(onScroll) {
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  document.addEventListener("scroll", onScroll, { passive: true, capture: true });
  document.documentElement.addEventListener("scroll", onScroll, { passive: true });
  if (document.body !== null) {
    document.body.addEventListener("scroll", onScroll, { passive: true });
  }
}

function scrollDetailToTop() {
  const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const behavior = reduceMotionMq.matches === true ? "auto" : "smooth";
  const scrollOpts = { top: 0, left: 0, behavior: behavior };

  const firstFold =
    document.querySelector(".about-page .detail__left-top") ||
    document.querySelector(".about-page .detail-layout");
  if (firstFold !== null) {
    firstFold.scrollIntoView({ behavior: behavior, block: "start", inline: "nearest" });
  }

  const roots = [document.scrollingElement, document.documentElement, document.body];
  for (let i = 0; i < roots.length; i += 1) {
    const el = roots[i];
    if (el === null) {
      continue;
    }
    if (typeof el.scrollTo === "function") {
      el.scrollTo(scrollOpts);
    } else {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  }

  window.scrollTo(scrollOpts);
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
    scrollUpBtn.addEventListener("click", scrollDetailToTop);
  }

  function apply() {
    if (document.body.classList.contains("about-view") !== true) {
      return;
    }

    const maxScroll = getDetailMaxScrollPx();
    const y = getDetailScrollY();
    let remaining = 1;
    if (maxScroll > 0.5) {
      const scrolled = Math.min(1, Math.max(0, y / maxScroll));
      remaining = 1 - scrolled;
    }

    const atEnd = maxScroll > 0.5 && maxScroll - y <= SCROLL_END_THRESHOLD_PX;

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
  let mobileHeaderMode = MOBILE_HEADER_LANDING;
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
    document.body.style.removeProperty("--detail-title-fs");
    document.body.style.removeProperty("--detail-title-fw");
  }

  function clearMobileHeaderModes() {
    document.body.classList.remove(MOBILE_HEADER_LANDING, MOBILE_HEADER_MINI_TITLE);
  }

  function setMobileHeaderMode(nextMode) {
    if (document.body.classList.contains(nextMode) === true) {
      return;
    }
    clearMobileHeaderModes();
    document.body.classList.add(nextMode);
    if (miniTitleEl !== null) {
      const showMini = nextMode === MOBILE_HEADER_MINI_TITLE;
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
      document.body.classList.add(MOBILE_HEADER_LANDING);
    } else {
      clearTitleScrollVars();
    }
    const px = parseFloat(window.getComputedStyle(titleEl).fontSize);
    const fallback = 34;
    maxPx = Number.isFinite(px) && px > TITLE_MIN_PX ? px : fallback;
    if (wasMobileModes) {
      clearMobileHeaderModes();
    }
  }

  function applyMobile() {
    if (titleSectionEl === null) {
      wasPastTitleSection = false;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = MOBILE_HEADER_LANDING;
      setMobileHeaderMode(MOBILE_HEADER_LANDING);
      return;
    }

    const y = getDetailScrollY();
    const titleSectionH = getMobileTitleSectionHeightPx();
    const pastTitleSection = titleSectionH > 0 && y > titleSectionH;

    if (pastTitleSection !== true) {
      wasPastTitleSection = false;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = MOBILE_HEADER_LANDING;
      setMobileHeaderMode(MOBILE_HEADER_LANDING);
      lastScrollY = y;
      return;
    }

    const deltaY = y - lastScrollY;
    lastScrollY = y;

    if (wasPastTitleSection === false) {
      wasPastTitleSection = true;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = MOBILE_HEADER_LANDING;
      setMobileHeaderMode(mobileHeaderMode);
      return;
    }

    if (deltaY > MOBILE_MINI_TITLE_HIDE_DOWN_PX) {
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = MOBILE_HEADER_LANDING;
    } else if (deltaY < 0) {
      miniTitleRevealCarryPx += -deltaY;
      if (miniTitleRevealCarryPx >= MOBILE_MINI_TITLE_REVEAL_UP_PX) {
        mobileHeaderMode = MOBILE_HEADER_MINI_TITLE;
      }
    }

    setMobileHeaderMode(mobileHeaderMode);
  }

  function applyDesktop() {
    const y = getDetailScrollY();
    const firstFoldPx = getFirstFoldPx();
    const shrinkStartPx = firstFoldPx * 0.5;
    const shrinkRangePx = firstFoldPx - shrinkStartPx;
    let t = 0;
    if (y > shrinkStartPx && shrinkRangePx > 0) {
      const tRaw = (y - shrinkStartPx) / shrinkRangePx;
      t = tRaw <= 0 ? 0 : tRaw >= 1 ? 1 : tRaw;
    }
    const fs = maxPx - (maxPx - TITLE_MIN_PX) * t;
    document.body.style.setProperty("--detail-title-fs", `${fs}px`);
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
        setMobileHeaderMode(MOBILE_HEADER_LANDING);
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
      lastScrollY = getDetailScrollY();
      wasPastTitleSection = false;
      miniTitleRevealCarryPx = 0;
      mobileHeaderMode = MOBILE_HEADER_LANDING;
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
  if (document.querySelector(".about-page") === null) {
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

  bindDetailScroll(onScroll);
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
  scrollDetailToTop();
  document.body.style.removeProperty("--detail-title-fs");
  document.body.style.removeProperty("--detail-title-fw");
  document.body.classList.remove(MOBILE_HEADER_LANDING, MOBILE_HEADER_MINI_TITLE);
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
