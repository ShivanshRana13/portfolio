(() => {
  // Lightweight dev-only live reload (no dependencies).
  // Connects to the local server SSE endpoint and reloads on change.
  if (location.hostname !== "127.0.0.1" && location.hostname !== "localhost") return;

  const es = new EventSource("/__live");
  es.addEventListener("reload", () => {
    // If a stylesheet changed, a full reload is simplest for this page.
    location.reload();
  });
})();

