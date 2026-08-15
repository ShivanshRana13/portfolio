const ABOUT_AUDIO_SRC = "./assets/adore-u.mp3";

/** @type {HTMLAudioElement | null} */
let audio = null;
let shouldBePlaying = false;

async function tryPlay() {
  shouldBePlaying = true;
  if (!(audio instanceof HTMLAudioElement)) {
    return;
  }
  audio.loop = true;
  try {
    await audio.play();
  } catch {
    // Blocked until the visitor interacts (browser autoplay policy).
  }
}

function pauseAboutAudio() {
  shouldBePlaying = false;
  if (audio instanceof HTMLAudioElement) {
    audio.pause();
  }
}

function initAboutAudio() {
  audio = document.getElementById("about-audio");
  if (!(audio instanceof HTMLAudioElement)) {
    return;
  }

  audio.src = ABOUT_AUDIO_SRC;
  audio.loop = true;
  audio.preload = "auto";

  audio.addEventListener("canplaythrough", () => {
    if (shouldBePlaying) {
      tryPlay();
    }
  });

  const spotifyImg = document.querySelector(".about-page__spotify");
  if (spotifyImg instanceof HTMLElement) {
    spotifyImg.setAttribute("role", "button");
    spotifyImg.setAttribute("tabindex", "0");
    spotifyImg.setAttribute("aria-label", "Play adore u by Fred again..");
    spotifyImg.addEventListener("click", () => {
      tryPlay();
    });
    spotifyImg.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") {
        return;
      }
      e.preventDefault();
      tryPlay();
    });
  }
}

window.__playAboutSpotify = tryPlay;
window.__pauseAboutSpotify = pauseAboutAudio;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAboutAudio);
} else {
  initAboutAudio();
}
