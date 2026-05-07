import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * Put your exported `.glb` at `assets/models/model.glb` (site root relative).
 */
function modelUrlCandidates() {
  const moduleBase = import.meta.url;
  const pageHref = window.location.href;
  const candidates = [
    new URL("./assets/models/model.glb", moduleBase).href,
    new URL("assets/models/model.glb", pageHref).href,
  ];
  return [...new Set(candidates)];
}

function frameObject(obj, camera, controls) {
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  const fitDist =
    maxDim / (2 * Math.tan((camera.fov * Math.PI) / 180 / 2));
  const dir = new THREE.Vector3(1.2, 0.85, 1.4).normalize();
  camera.position.copy(center.clone().add(dir.multiplyScalar(fitDist * 1.15)));
  camera.near = Math.max(0.01, fitDist / 200);
  camera.far = Math.max(1000, fitDist * 10);
  camera.updateProjectionMatrix();
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}

/** Try each candidate URL until one loads (helps GitHub Pages / odd bases). */
function loadGltfWithFallback(
  loader,
  urls,
  index,
  scene,
  camera,
  controls,
  setStatus,
) {
  if (index >= urls.length) {
    setStatus(
      `Could not load model.glb. Checked: ${urls.join(" · ")} — confirm the file exists at assets/models/model.glb.`,
    );
    return;
  }

  const url = urls[index];
  loader.load(
    url,
    (gltf) => {
      const root = gltf.scene;
      scene.add(root);
      frameObject(root, camera, controls);
      setStatus("Drag to orbit · scroll to zoom");
    },
    undefined,
    (err) => {
      console.warn("GLB load failed for", url, err);
      loadGltfWithFallback(
        loader,
        urls,
        index + 1,
        scene,
        camera,
        controls,
        setStatus,
      );
    },
  );
}

/**
 * @param {{
 *   container: HTMLElement;
 *   statusElement?: HTMLElement | null;
 *   transparentBackground?: boolean;
 * }} options
 */
export function initGltfViewer(options) {
  const container = options.container;
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const statusEl = options.statusElement ?? null;
  const transparentBackground = options.transparentBackground === true;

  const setStatus = (msg) => {
    if (statusEl instanceof HTMLElement) {
      statusEl.textContent = msg;
    }
  };

  const width = Math.max(container.clientWidth, 2);
  const height = Math.max(container.clientHeight, 2);

  const scene = new THREE.Scene();
  if (transparentBackground === true) {
    scene.background = null;
  } else {
    scene.background = new THREE.Color(0x141414);
  }

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 5000);
  camera.position.set(2, 1.5, 3);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: transparentBackground === true,
    premultipliedAlpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  if (transparentBackground === true) {
    renderer.setClearColor(0x000000, 0);
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = transparentBackground === true ? 1.15 : 1;
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 8, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb8c4ff, 0.45);
  fill.position.set(-5, 2, -4);
  scene.add(fill);

  const loader = new GLTFLoader();
  const urls = modelUrlCandidates();
  setStatus("Loading model…");

  loadGltfWithFallback(
    loader,
    urls,
    0,
    scene,
    camera,
    controls,
    setStatus,
  );

  const onResize = () => {
    const w = Math.max(container.clientWidth, 2);
    const h = Math.max(container.clientHeight, 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  window.addEventListener("resize", onResize);

  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          onResize();
        })
      : null;
  if (ro !== null) {
    ro.observe(container);
  }

  function tick() {
    requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  }
  tick();
}
