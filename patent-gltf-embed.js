let patentGltfStarted = false;

function tryStartPatentGltf() {
  if (patentGltfStarted === true) {
    return;
  }
  const scene = document.querySelector(".scene");
  if (!(scene instanceof HTMLElement)) {
    return;
  }
  if (scene.classList.contains("scene--patent-cube-active") !== true) {
    return;
  }

  patentGltfStarted = true;

  if (window.location.protocol === "file:") {
    console.warn(
      "[Portfolio 3D] Open the site via http://localhost (python3 -m http.server) or GLB files will not load.",
    );
    return;
  }

  const container = document.getElementById("patent-cube-gltf");
  if (!(container instanceof HTMLElement)) {
    return;
  }

  import("./gltf-viewer.js")
    .then(({ initGltfViewer }) => {
      initGltfViewer({
        container,
        statusElement: null,
        transparentBackground: true,
      });
    })
    .catch((err) => {
      console.error("[Portfolio 3D] Failed to load viewer:", err);
    });
}

const sceneEl = document.querySelector(".scene");
if (sceneEl instanceof HTMLElement) {
  const mo = new MutationObserver(tryStartPatentGltf);
  mo.observe(sceneEl, { attributes: true, attributeFilter: ["class"] });
}
tryStartPatentGltf();
