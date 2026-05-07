const container = document.getElementById("gltf-viewer");
const statusEl = document.getElementById("gltf-viewer-status");

const setStatus = (msg) => {
  if (statusEl instanceof HTMLElement) {
    statusEl.textContent = msg;
  }
};

if (window.location.protocol === "file:") {
  setStatus(
    "Preview needs a local server (browsers block 3D files when you double-click HTML). In Terminal: cd this folder → python3 -m http.server 8765 → open http://localhost:8765/viewer.html",
  );
} else {
  try {
    const { initGltfViewer } = await import("./gltf-viewer.js");
    if (container instanceof HTMLElement) {
      initGltfViewer({
        container,
        statusElement: statusEl instanceof HTMLElement ? statusEl : null,
        transparentBackground: false,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setStatus(
      `Could not load Three.js (${msg}). Check your connection (needs unpkg.com) or try http://localhost.`,
    );
    console.error(e);
  }
}
