(() => {
  // Dev-only live reload for `server.py` (SSE at `/__live`). Off by default so the page
  // does not reload when tooling touches `.js`/`.css`/`.html` in the repo.
  // Enable: open http://127.0.0.1:5173/?devreload=1 (or add ?devreload=1 on any port).
  if (location.hostname !== "127.0.0.1" && location.hostname !== "localhost") return;
  if (new URLSearchParams(location.search).get("devreload") !== "1") return;

  const es = new EventSource("/__live");
  es.addEventListener("reload", () => {
    if (document.body.classList.contains("about-view") === true) {
      const base = `${location.pathname}${location.search}`;
      if (location.hash !== "#about") {
        history.replaceState({ about: true }, "", `${base}#about`);
      }
    }
    location.reload();
  });
})();

