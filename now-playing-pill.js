(() => {
  const pill = document.querySelector(".now-playing-pill");
  const label = pill?.querySelector(".now-playing-pill__label");
  if (!(pill instanceof HTMLElement) || !(label instanceof HTMLElement)) {
    return;
  }

  const FALLBACK_LABEL = "Listening to: Fred again";
  const POLL_MS = 8000;
  const configuredApi = document.documentElement.dataset.nowPlayingApi?.trim() ?? "";
  const apiUrl = configuredApi || "/.netlify/functions/now-playing";

  let pollTimer = 0;

  const setVisible = (visible) => {
    pill.hidden = !visible;
    pill.setAttribute("aria-hidden", visible ? "false" : "true");
  };

  const setLabel = (text) => {
    label.textContent = text;
  };

  const setLink = (url) => {
    if (typeof url === "string" && url.startsWith("https://")) {
      pill.href = url;
      pill.target = "_blank";
      pill.rel = "noreferrer";
    } else {
      pill.removeAttribute("href");
      pill.removeAttribute("target");
      pill.removeAttribute("rel");
    }
  };

  const applyPayload = (payload) => {
    if (payload?.error === "missing_env") {
      setLabel(FALLBACK_LABEL);
      setLink("");
      setVisible(true);
      return;
    }

    if (!payload || payload.isPlaying !== true) {
      setVisible(false);
      setLink("");
      return;
    }

    const nextLabel =
      typeof payload.label === "string" && payload.label.trim() !== ""
        ? payload.label
        : typeof payload.artist === "string" && payload.artist.trim() !== ""
          ? `Listening to: ${payload.artist}`
          : typeof payload.track === "string" && payload.track.trim() !== ""
            ? `Listening to: ${payload.track}`
            : FALLBACK_LABEL;

    setLabel(nextLabel);
    setLink(typeof payload.trackUrl === "string" ? payload.trackUrl : "");
    setVisible(true);
  };

  const fetchNowPlaying = async () => {
    try {
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        setVisible(false);
        return;
      }

      const payload = await response.json();
      applyPayload(payload);
    } catch {
      setVisible(false);
    }
  };

  const schedulePoll = () => {
    window.clearInterval(pollTimer);
    pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchNowPlaying();
      }
    }, POLL_MS);
  };

  setLabel(FALLBACK_LABEL);
  setVisible(false);
  void fetchNowPlaying();
  schedulePoll();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void fetchNowPlaying();
    }
  });
})();
