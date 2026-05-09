import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** Try page-relative URLs (covers trailing slash, subpaths). */
function candidateModelUrls() {
  const href = window.location.href;
  const bases = [
    new URL("./assets/models/model.glb", href).href,
    new URL("assets/models/model.glb", href).href,
  ];
  return [...new Set(bases)];
}

const CUBE_HALF = 70 * 0.01;

function boostMaterials(root, THREEref) {
  root.traverse((child) => {
    if (!(child instanceof THREEref.Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of mats) {
      if (!m) continue;
      m.side = THREEref.DoubleSide;
      m.depthWrite = true;
      m.transparent = false;
      m.opacity = 1;
      if (m.isMeshStandardMaterial === true || m.isMeshPhysicalMaterial === true) {
        m.metalness = Math.min(m.metalness, 0.35);
        m.roughness = Math.max(0.35, m.roughness);
        m.emissiveIntensity = Math.max(m.emissiveIntensity ?? 0, 0.5);
      }
      if (m.isMeshBasicMaterial === true) {
        if (m.color != null && m.color.getHex() < 0x111111) {
          m.color.setHex(0xdddddd);
        }
      }
    }
  });
}

function showShellError(shell, message) {
  shell.classList.add("patent-cube-gizmo-shell--error");
  const el = shell.querySelector(".patent-cube-gizmo-shell__err");
  if (el instanceof HTMLElement) {
    el.textContent = message;
  }
}

function isPatentCubeActive() {
  const scene = document.querySelector(".scene");
  return (
    document.body.classList.contains("theme-dark") === true &&
    scene instanceof HTMLElement &&
    scene.classList.contains("scene--patent-cube-active") === true
  );
}

function initPatentGizmo() {
  const shell = document.querySelector(".patent-cube-gizmo-shell");
  const container = document.querySelector(".patent-cube__gizmo-root");
  const viewport = document.querySelector(".patent-cube__viewport");
  if (!(shell instanceof HTMLElement) || !(container instanceof HTMLElement)) return;
  if (!(viewport instanceof HTMLElement)) return;

  let lastShellW = 0;
  let lastShellH = 0;

  const applyRendererSize = () => {
    const w = Math.max(1, shell.clientWidth);
    const h = Math.max(1, shell.clientHeight);
    if (w === lastShellW && h === lastShellH) return;
    lastShellW = w;
    lastShellH = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };

  /** Pin shell to the cube viewport in screen space (survives `.scene` scale transforms). */
  const anchorShellToViewport = () => {
    if (!isPatentCubeActive()) return;
    const r = viewport.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    shell.classList.add("patent-cube-gizmo-shell--fixed");
    shell.style.left = `${Math.round(r.left)}px`;
    shell.style.top = `${Math.round(r.top)}px`;
    shell.style.width = `${Math.round(r.width)}px`;
    shell.style.height = `${Math.round(r.height)}px`;
    // Shell had zero in-flow height (only absolute children); without this the canvas stays 1×1px.
    applyRendererSize();
  };

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.02, 500);
  camera.position.set(2.55, 2.05, 3.95);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    premultipliedAlpha: false,
  });

  const gl = renderer.getContext();
  if (!gl) {
    showShellError(
      shell,
      "WebGL unavailable — try another browser or disable GPU blocklists.",
    );
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const world = new THREE.Group();
  scene.add(world);

  scene.add(new THREE.AmbientLight(0xffffff, 1));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(6, 14, 10);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8eeff, 0.65);
  fill.position.set(-10, 6, -8);
  scene.add(fill);

  /** Fixed camera aim — only spin `world` so lighting stays readable (avoid lookAt each frame). */
  camera.lookAt(0, CUBE_HALF * 0.45, 0);

  let rotXDeg = -20;
  let rotYDeg = 32;

  const syncRotation = () => {
    const rx = THREE.MathUtils.degToRad(rotXDeg);
    const ry = THREE.MathUtils.degToRad(rotYDeg);
    world.rotation.order = "YXZ";
    world.rotation.set(rx, ry, 0);
  };

  syncRotation();

  window.addEventListener("patent-cube-spin", (e) => {
    if (!(e instanceof CustomEvent) || !e.detail) return;
    const { rotX, rotY } = e.detail;
    if (typeof rotX === "number" && typeof rotY === "number") {
      rotXDeg = rotX;
      rotYDeg = rotY;
      syncRotation();
    }
    anchorShellToViewport();
  });

  const resize = () => {
    anchorShellToViewport();
    applyRendererSize();
  };

  async function loadModelFirstHit(loader) {
    const urls = candidateModelUrls();
    let lastErr = new Error("no urls");
    for (const url of urls) {
      try {
        if (typeof loader.loadAsync === "function") {
          return await loader.loadAsync(url);
        }
        return await new Promise((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }
    throw lastErr;
  }

  const loader = new GLTFLoader();

  loadModelFirstHit(loader)
    .then((gltf) => {
      const root = gltf.scene;
      boostMaterials(root, THREE);
      world.add(root);

      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      root.position.sub(center);

      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
      const targetSize = CUBE_HALF * 3.5;
      root.scale.multiplyScalar(targetSize / maxDim);

      const placed = new THREE.Box3().setFromObject(root);
      root.position.y += -placed.min.y + CUBE_HALF + CUBE_HALF * 0.08;

      queueMicrotask(resize);
    })
    .catch((err) => {
      /* eslint-disable no-console */
      console.warn("[patent-gizmo-3d] gizmo load failed", candidateModelUrls(), err);
      showShellError(
        shell,
        `Could not load model GLB. Serve the site over http(s) (not file://). Paths tried: ${candidateModelUrls().join(", ")}`,
      );
    });

  resize();
  const roVp = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      resize();
    });
  });
  roVp.observe(viewport);
  const patentCubeEl = document.querySelector(".patent-cube");
  if (patentCubeEl instanceof HTMLElement) {
    roVp.observe(patentCubeEl);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", () => requestAnimationFrame(anchorShellToViewport), {
    passive: true,
    capture: true,
  });

  const kickWhenVisible = () => {
    requestAnimationFrame(() => {
      anchorShellToViewport();
      resize();
      syncRotation();
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting && en.intersectionRatio > 0) {
          kickWhenVisible();
        }
      }
    },
    { threshold: [0, 0.01, 0.1, 1] },
  );
  io.observe(viewport);

  shell.addEventListener("transitionend", (ev) => {
    if (ev.propertyName === "opacity" || ev.propertyName === "visibility") {
      kickWhenVisible();
    }
  });

  function tick() {
    requestAnimationFrame(tick);
    if (isPatentCubeActive()) {
      anchorShellToViewport();
    }
    renderer.render(scene, camera);
  }
  tick();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPatentGizmo);
} else {
  initPatentGizmo();
}
