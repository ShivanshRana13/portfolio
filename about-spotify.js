const ABOUT_TRACK_URI = "spotify:track:1rf4SX7dduNbrNnOmupLzi";
const LOOP_THRESHOLD_MS = 800;

/** @type {{ play?: () => void; pause?: () => void; seek?: (ms: number) => void; addListener?: (event: string, cb: (payload: unknown) => void) => void } | null} */
let controller = null;
let controllerReady = false;
let shouldBePlaying = false;
let loopGuard = false;

function tryPlay() {
  shouldBePlaying = true;
  if (controller && controllerReady && typeof controller.play === "function") {
    controller.play();
  }
}

function pauseAboutSpotify() {
  shouldBePlaying = false;
  if (controller && controllerReady && typeof controller.pause === "function") {
    controller.pause();
  }
}

function initAboutSpotify() {
  const mount = document.getElementById("about-spotify-embed");
  if (!(mount instanceof HTMLElement)) {
    return;
  }

  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    IFrameAPI.createController(
      mount,
      {
        uri: ABOUT_TRACK_URI,
        width: "300",
        height: "80",
      },
      (EmbedController) => {
        controller = EmbedController;

        EmbedController.addListener("ready", () => {
          controllerReady = true;
          if (shouldBePlaying) {
            tryPlay();
          }
        });

        EmbedController.addListener("playback_update", (event) => {
          if (shouldBePlaying !== true || loopGuard) {
            return;
          }
          if (typeof event !== "object" || event === null || !("data" in event)) {
            return;
          }
          const data = /** @type {{ duration?: number; position?: number; isPaused?: boolean }} */ (
            event.data
          );
          const duration = data.duration ?? 0;
          const position = data.position ?? 0;
          const isPaused = data.isPaused === true;
          if (duration <= 0 || position <= 0 || isPaused) {
            return;
          }
          if (duration - position > LOOP_THRESHOLD_MS) {
            return;
          }
          loopGuard = true;
          if (typeof EmbedController.seek === "function") {
            EmbedController.seek(0);
          }
          if (typeof EmbedController.play === "function") {
            EmbedController.play();
          }
          window.setTimeout(() => {
            loopGuard = false;
          }, 500);
        });
      },
    );
  };

  const spotifyImg = document.querySelector(".about-page__spotify");
  if (spotifyImg instanceof HTMLElement) {
    spotifyImg.style.pointerEvents = "auto";
    spotifyImg.style.cursor = "pointer";
    spotifyImg.setAttribute("role", "button");
    spotifyImg.setAttribute("tabindex", "0");
    spotifyImg.setAttribute("aria-label", "Play adore u by Fred again.. on Spotify");
    spotifyImg.addEventListener("click", tryPlay);
    spotifyImg.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") {
        return;
      }
      e.preventDefault();
      tryPlay();
    });
  }

  const apiScript = document.createElement("script");
  apiScript.src = "https://open.spotify.com/embed/iframe-api/v1";
  apiScript.async = true;
  document.head.appendChild(apiScript);
}

window.__playAboutSpotify = tryPlay;
window.__pauseAboutSpotify = pauseAboutSpotify;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAboutSpotify);
} else {
  initAboutSpotify();
}
