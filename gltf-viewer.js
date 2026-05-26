import * as THREE from "three";
import { MOUSE, TOUCH } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";

/** Horizontal orbit (azimuth) past this accumulates a half-turn flip on the gizmo so arcs stay visible. */
const GIZMO_ORBIT_FLIP_STEP_RAD = THREE.MathUtils.degToRad(120);
const _worldYAxis = new THREE.Vector3(0, 1, 0);
const _gizmoFlipYawQuat = new THREE.Quaternion();
const _viewerFitTmpBox = new THREE.Box3();
const _pickPointerNdc = new THREE.Vector2();
const _cubePivotWorld = new THREE.Vector3();

function isDescendantOf(node, ancestor) {
  if (ancestor === null || ancestor === undefined) return false;
  let p = node;
  while (p) {
    if (p === ancestor) return true;
    p = p.parent;
  }
  return false;
}

/** True if this node or any ancestor is omitted from camera-fit / pivot bounds (e.g. floor grid). */
function subtreeExcludedFromViewerFit(node) {
  let p = node;
  while (p) {
    if (p.userData && p.userData.excludeFromViewerFit === true) return true;
    p = p.parent;
  }
  return false;
}

/**
 * World-space bounds for framing and pivots. Skips objects tagged `userData.excludeFromViewerFit`
 * so helpers like {@link THREE.GridHelper} do not affect camera distance or orbit centers.
 * @param {{ excludeSubtree?: THREE.Object3D | null }} [options]
 */
function setBoxFromObjectForViewerFit(box, root, options = {}) {
  const excludeSubtree = options.excludeSubtree ?? null;
  box.makeEmpty();
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    if (
      excludeSubtree !== null &&
      node !== root &&
      isDescendantOf(node, excludeSubtree) === true
    ) {
      return;
    }
    if (subtreeExcludedFromViewerFit(node)) return;
    const drawable =
      node.isMesh === true ||
      node.isLine === true ||
      node.isLineSegments === true ||
      node.isPoints === true;
    if (!drawable) return;
    const geom = node.geometry;
    if (!geom) return;
    if (geom.boundingBox == null) geom.computeBoundingBox();
    if (geom.boundingBox == null) return;
    _viewerFitTmpBox.copy(geom.boundingBox).applyMatrix4(node.matrixWorld);
    box.union(_viewerFitTmpBox);
  });
  if (box.isEmpty()) {
    box.setFromObject(root);
  }
}

/**
 * Resolves URLs for `assets/models/<name>` (default viewer file: model.glb).
 * @param {string[] | undefined} modelFilenames
 */
function modelUrlCandidates(modelFilenames) {
  const names =
    Array.isArray(modelFilenames) && modelFilenames.length > 0
      ? modelFilenames
      : ["model.glb"];
  const moduleBase = import.meta.url;
  const pageHref = window.location.href;
  const candidates = [];
  for (const name of names) {
    candidates.push(new URL(`./assets/models/${name}`, moduleBase).href);
    candidates.push(new URL(`assets/models/${name}`, pageHref).href);
  }
  return [...new Set(candidates)];
}

/** Strong emissive + no tone mapping so the gizmo stays vivid under ACES. */
function applyBrightGizmoMaterials(root, THREEref) {
  root.traverse((child) => {
    const drawable =
      child.isMesh === true ||
      child.isLine === true ||
      child.isLineSegments === true ||
      child.isPoints === true;
    if (!drawable) return;

    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const m of mats) {
      if (!m) continue;
      m.toneMapped = false;

      if (
        m.isMeshStandardMaterial === true ||
        m.isMeshPhysicalMaterial === true
      ) {
        m.color.setRGB(1, 1, 1);
        m.emissive.setRGB(1, 1, 1);
        m.emissiveIntensity = 16;
        m.metalness = 0;
        m.roughness = 1;
        m.envMapIntensity = 0;
        m.side = THREEref.DoubleSide;
      } else if (m.isMeshBasicMaterial === true) {
        m.color.setRGB(1, 1, 1);
      } else if (
        m.isLineBasicMaterial === true ||
        m.isLineDashedMaterial === true
      ) {
        m.color.setRGB(1, 1, 1);
      } else if (m.isPointsMaterial === true) {
        m.color.setRGB(1, 1, 1);
        m.size = Math.max(m.size, 6);
      } else if ("emissive" in m && m.emissive && m.emissive.isColor === true) {
        m.emissive.setRGB(1, 1, 1);
        if ("emissiveIntensity" in m) {
          m.emissiveIntensity = 16;
        }
        if ("color" in m && m.color && m.color.isColor === true) {
          m.color.setRGB(1, 1, 1);
        }
      } else if ("color" in m && m.color && m.color.isColor === true) {
        m.color.setRGB(1, 1, 1);
      }
      m.needsUpdate = true;
    }
  });
}

/** Draw manipulator over the mesh (ignore depth), typical for DCC viewport widgets. */
function applyManipulatorDepthOverlay(root) {
  root.traverse((child) => {
    const drawable =
      child.isMesh === true ||
      child.isLine === true ||
      child.isLineSegments === true ||
      child.isPoints === true;
    if (!drawable) return;
    child.renderOrder = 1000;
    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const m of mats) {
      if (!m) continue;
      m.depthTest = false;
      m.depthWrite = false;
      m.needsUpdate = true;
    }
  });
}

function prepareManipulatorGizmoScale(gizmoRoot, cubeMax) {
  gizmoRoot.updateMatrixWorld(true);
  const preBox = new THREE.Box3().setFromObject(gizmoRoot);
  const preCenter = preBox.getCenter(new THREE.Vector3());
  gizmoRoot.position.sub(preCenter);
  const preSize = preBox.getSize(new THREE.Vector3());
  const preMax = Math.max(preSize.x, preSize.y, preSize.z, 1e-6);
  const targetMax = cubeMax * 2.2;
  gizmoRoot.scale.multiplyScalar(targetMax / preMax);
}

/**
 * Neutral grey matte read on the main GLB (no warm/clay tint).
 * Skipped when {@link initGltfViewer} uses `brightGizmo` (standalone vivid preview).
 * @param {{ brighten?: boolean }} [options] Brighter albedo for the patent-cube frame on dark canvas.
 */
function applyGreyPrimaryModelMaterials(root, THREEref, options = {}) {
  const brighten = options.brighten === true;
  const grey = new THREE.Color(brighten ? 0xd6d6d6 : 0xababab);
  const colorLerp = brighten ? 0.28 : 0.52;
  root.traverse((child) => {
    if (child.isMesh !== true) return;
    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const m of mats) {
      if (!m) continue;
      if (
        m.isMeshStandardMaterial === true ||
        m.isMeshPhysicalMaterial === true
      ) {
        m.color.lerp(grey, colorLerp);
        m.metalness = 0;
        m.roughness = THREEref.MathUtils.clamp(
          m.roughness * (brighten ? 0.34 : 0.42) + (brighten ? 0.28 : 0.42),
          brighten ? 0.52 : 0.72,
          brighten ? 0.82 : 0.96,
        );
        if ("envMapIntensity" in m) {
          m.envMapIntensity = brighten
            ? Math.max(m.envMapIntensity, 0.35)
            : Math.min(m.envMapIntensity, 0.1);
        }
        m.needsUpdate = true;
      } else if (m.isMeshBasicMaterial === true) {
        m.color.lerp(grey, brighten ? 0.26 : 0.48);
        m.needsUpdate = true;
      }
    }
  });
}

/**
 * Floor grid in the cube’s local XZ plane, slightly below the mesh AABB — follows cube orientation & orbit.
 * Edge fade is handled in CSS on `.patent-cube__viewport` / `.patent-cube__gltf`, not on the grid material.
 * @param {THREE.Object3D} cubeRoot Grid is parented here so it rotates with the cube.
 * @param {THREE.Object3D} boundsRoot World bounds for size/placement (e.g. content root = cube + gizmo); omitting uses cubeRoot only.
 */
function addSubtleAlignedFloorGrid(cubeRoot, boundsRoot) {
  const fitRoot = boundsRoot != null ? boundsRoot : cubeRoot;
  cubeRoot.updateMatrixWorld(true);
  fitRoot.updateMatrixWorld(true);
  const wb = new THREE.Box3();
  setBoxFromObjectForViewerFit(wb, fitRoot);
  const size = wb.getSize(new THREE.Vector3());
  const horizontal = Math.max(size.x, size.z, 1e-6);
  const gridWorldSize = horizontal * 2.35;
  const divisions = 14;

  const grid = new THREE.GridHelper(
    gridWorldSize,
    divisions,
    0xd2d2d2,
    0x949494,
  );
  grid.name = "portfolio-floor-grid";
  grid.userData.excludeFromViewerFit = true;

  const lift = 0.005 * horizontal;
  const bottomCenterWorld = new THREE.Vector3(
    (wb.min.x + wb.max.x) / 2,
    wb.min.y - lift,
    (wb.min.z + wb.max.z) / 2,
  );
  const inv = new THREE.Matrix4().copy(cubeRoot.matrixWorld).invert();
  bottomCenterWorld.applyMatrix4(inv);
  grid.position.copy(bottomCenterWorld);

  const gridMat = grid.material;
  if (gridMat !== null && gridMat !== undefined) {
    gridMat.transparent = true;
    gridMat.opacity = 0.58;
    gridMat.depthWrite = false;
    gridMat.toneMapped = false;
  }

  grid.renderOrder = -50;
  cubeRoot.add(grid);
}

/** Clone the primary cube at `scaleFactor` size and stack it on the parent’s top face (world +Y). */
function stackScaledCubeCloneOnTop(parentCube, scaleFactor = 0.5) {
  parentCube.updateMatrixWorld(true);
  const mainWorld = new THREE.Box3();
  setBoxFromObjectForViewerFit(mainWorld, parentCube);
  if (mainWorld.isEmpty()) return null;

  const mainWorldSize = mainWorld.getSize(new THREE.Vector3());
  const topHalfHeight = mainWorldSize.y * scaleFactor * 0.5;
  const stackCenterWorld = new THREE.Vector3(
    (mainWorld.min.x + mainWorld.max.x) * 0.5,
    mainWorld.max.y + topHalfHeight,
    (mainWorld.min.z + mainWorld.max.z) * 0.5,
  );

  const topCube = parentCube.clone(true);
  topCube.name = "portfolio-cube-stack";
  topCube.position.set(0, 0, 0);
  topCube.quaternion.identity();
  topCube.scale.set(scaleFactor, scaleFactor, scaleFactor);
  parentCube.worldToLocal(stackCenterWorld);
  topCube.position.copy(stackCenterWorld);

  parentCube.add(topCube);
  return topCube;
}

/** Move the manipulator gizmo to a cube’s bounding-box center (rig local space). */
function moveManipulatorToCubePivot(
  gizmoRoot,
  rig,
  cubeObject,
  excludeSubtree = null,
) {
  const box = new THREE.Box3();
  setBoxFromObjectForViewerFit(box, cubeObject, { excludeSubtree });
  if (box.isEmpty()) return;
  _cubePivotWorld.copy(box.getCenter(new THREE.Vector3()));
  rig.worldToLocal(_cubePivotWorld);
  gizmoRoot.position.copy(_cubePivotWorld);
}

/** Parent gizmo under the cube rig at the cube bbox center (local space). */
function parentManipulatorToRig(
  gizmoRoot,
  cubeRoot,
  rig,
  excludeSubtree = null,
) {
  rig.add(gizmoRoot);
  moveManipulatorToCubePivot(gizmoRoot, rig, cubeRoot, excludeSubtree);
}

function resolveSelectableCubeFromObject(object, mainCubeRef, topCubeRef) {
  let node = object;
  while (node) {
    if (topCubeRef !== null && node === topCubeRef) return topCubeRef;
    if (mainCubeRef !== null && node === mainCubeRef) return mainCubeRef;
    node = node.parent;
  }
  return null;
}

const CUBE_SELECTION_OUTLINE_COLOR = 0xffffff;

/** Meshes for {@link OutlinePass} (selected cube only; excludes stacked sibling when needed). */
function collectCubeOutlineMeshes(cubeRoot, excludeSubtree = null) {
  const meshes = [];
  if (!(cubeRoot instanceof THREE.Object3D)) return meshes;
  cubeRoot.traverse((node) => {
    if (
      excludeSubtree instanceof THREE.Object3D &&
      node !== cubeRoot &&
      isDescendantOf(node, excludeSubtree) === true
    ) {
      return;
    }
    if (subtreeExcludedFromViewerFit(node)) return;
    if (node.isMesh === true) meshes.push(node);
  });
  return meshes;
}

function syncSelectedCubeOutline(
  outlinePass,
  mainCubeRef,
  topCubeRef,
  selectedCube,
) {
  if (outlinePass === null || outlinePass === undefined) return;
  if (!(selectedCube instanceof THREE.Object3D)) {
    outlinePass.selectedObjects = [];
    return;
  }
  const excludeSubtree =
    selectedCube === mainCubeRef && topCubeRef instanceof THREE.Object3D
      ? topCubeRef
      : null;
  outlinePass.selectedObjects = collectCubeOutlineMeshes(
    selectedCube,
    excludeSubtree,
  );
}

function createSelectionOutlinePass(width, height, scene, camera) {
  const outlinePass = new OutlinePass(
    new THREE.Vector2(width, height),
    scene,
    camera,
  );
  outlinePass.visibleEdgeColor.set(CUBE_SELECTION_OUTLINE_COLOR);
  outlinePass.hiddenEdgeColor.set(CUBE_SELECTION_OUTLINE_COLOR);
  outlinePass.edgeThickness = 1.25;
  outlinePass.edgeStrength = 8;
  outlinePass.edgeGlow = 0;
  outlinePass.pulsePeriod = 0;
  outlinePass.downSampleRatio = 1;
  return outlinePass;
}

function refreshComposerAndOutline(
  composer,
  outlinePass,
  container,
  camera,
  mainCubeRef,
  topCubeRef,
  selectedCube,
) {
  const w = Math.max(container.clientWidth, 2);
  const h = Math.max(container.clientHeight, 2);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  composer.setSize(w, h);
  syncSelectedCubeOutline(outlinePass, mainCubeRef, topCubeRef, selectedCube);
}

/**
 * iOS Safari can still treat two-finger gestures as page zoom unless touch
 * defaults are cancelled on the interactive surface (touch-action alone is not always enough).
 */
function preventBrowserTouchGestures(domElement) {
  if (!(domElement instanceof HTMLElement)) return;
  const block = (event) => {
    if (event.cancelable === true) {
      event.preventDefault();
    }
  };
  domElement.addEventListener("touchstart", block, { passive: false });
  domElement.addEventListener("touchmove", block, { passive: false });
}

/**
 * Tap a cube to move the gizmo pivot to its center (short click, not orbit drag).
 */
function initCubeGizmoSelection(options) {
  const {
    domElement,
    camera,
    rig,
    gizmoRoot,
    mainCubeRef,
    topCubeRef,
    outlinePass,
    onCubeSelected,
  } = options;
  if (
    !(domElement instanceof HTMLElement) ||
    !(camera instanceof THREE.Camera) ||
    !(rig instanceof THREE.Object3D) ||
    !(gizmoRoot instanceof THREE.Object3D) ||
    !(mainCubeRef instanceof THREE.Object3D)
  ) {
    return;
  }

  const raycaster = new THREE.Raycaster();
  let pointerDownX = 0;
  let pointerDownY = 0;
  let activePointers = 0;

  const onPointerDown = (event) => {
    if (!(event instanceof PointerEvent)) return;
    activePointers += 1;
    if (event.isPrimary === false) return;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
  };

  const onPointerUp = (event) => {
    if (!(event instanceof PointerEvent)) return;
    activePointers = Math.max(0, activePointers - 1);
    if (event.isPrimary === false) return;
    if (activePointers > 0) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const moved = Math.hypot(
      event.clientX - pointerDownX,
      event.clientY - pointerDownY,
    );
    if (moved > 6) return;

    const rect = domElement.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    _pickPointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    _pickPointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(_pickPointerNdc, camera);
    const hits = raycaster.intersectObject(mainCubeRef, true);
    if (hits.length === 0) return;

    const picked = resolveSelectableCubeFromObject(
      hits[0].object,
      mainCubeRef,
      topCubeRef,
    );
    if (picked === null) return;

    const excludeSubtree =
      picked === mainCubeRef && topCubeRef instanceof THREE.Object3D
        ? topCubeRef
        : null;
    moveManipulatorToCubePivot(gizmoRoot, rig, picked, excludeSubtree);
    syncSelectedCubeOutline(outlinePass, mainCubeRef, topCubeRef, picked);
    if (typeof onCubeSelected === "function") {
      onCubeSelected(picked);
    }
  };

  domElement.addEventListener("pointerdown", onPointerDown);
  domElement.addEventListener("pointerup", onPointerUp);
  domElement.addEventListener("pointercancel", onPointerUp);
}

/**
 * @param {THREE.Object3D} obj Bounds used for camera distance / fit.
 * @param {THREE.Vector3 | null | undefined} orbitPivotWorld If set, orbit target + look-at pivot (e.g. cube center only).
 * @param {number} [frameFill=0.3] Target fraction of frame height occupied by the model (higher = closer).
 * @param {number} [zoomInFactor=1] Values &gt; 1 move the camera closer (e.g. 1.6 = 60% more zoom).
 * @param {THREE.Box3 | null | undefined} [fitBox] Optional precomputed world bounds (skips re-traverse).
 */
function frameObject(
  obj,
  camera,
  controls,
  orbitPivotWorld,
  frameFill = 0.3,
  zoomInFactor = 1,
  fitBox = null,
) {
  const box = fitBox instanceof THREE.Box3 ? fitBox : new THREE.Box3();
  if (!(fitBox instanceof THREE.Box3)) {
    setBoxFromObjectForViewerFit(box, obj);
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  const fitDist =
    maxDim / (2 * Math.tan((camera.fov * Math.PI) / 180 / 2));
  const safeZoom = Math.max(zoomInFactor, 1e-6);
  const cameraDist = fitDist / frameFill / safeZoom;
  const dir = new THREE.Vector3(1.2, 0.85, 1.4).normalize();
  const pivot =
    orbitPivotWorld instanceof THREE.Vector3
      ? orbitPivotWorld.clone()
      : center.clone();
  camera.position.copy(pivot.clone().add(dir.multiplyScalar(cameraDist)));
  // Keep near small so zoom/orbit does not clip mesh faces; scaling near with fitDist
  // pushed it too high for large models (e.g. fitDist/200 → 0.5+ and cuts the cube).
  camera.near = 0.01;
  camera.far = Math.max(5000, fitDist * 25);
  camera.updateProjectionMatrix();
  camera.lookAt(pivot);
  controls.target.copy(pivot);
  controls.update();
}

/** Try each candidate URL until one loads (helps GitHub Pages / odd bases). */
function loadGltfFirstSuccess(loader, urls, onLoad, onAllFailed) {
  let index = 0;
  function attempt() {
    if (index >= urls.length) {
      onAllFailed();
      return;
    }
    const url = urls[index];
    index += 1;
    loader.load(
      url,
      onLoad,
      undefined,
      () => {
        console.warn("GLB load failed for", url);
        attempt();
      },
    );
  }
  attempt();
}

/**
 * @param {{
 *   container: HTMLElement;
 *   statusElement?: HTMLElement | null;
 *   transparentBackground?: boolean;
 *   modelFilenames?: string[];
 *   enableZoom?: boolean;
 *   enablePan?: boolean;
 *   frameNavigation?: boolean;
 *   controlElement?: HTMLElement;
 *   frameFill?: number;
 *   zoomInFactor?: number;
 *   brightGizmo?: boolean;
 *   companionModelFilenames?: string[];
 * }} options
 * Companion shares cube rig; after ±120° horizontal orbit (azimuth) steps, gizmo gets an extra π yaw (world Y).
 */
export function initGltfViewer(options) {
  const container = options.container;
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const statusEl = options.statusElement ?? null;
  const transparentBackground = options.transparentBackground === true;
  const modelFilenames = options.modelFilenames;
  const enableZoom = options.enableZoom !== false;
  const enablePan = options.enablePan !== false;
  const frameNavigation = options.frameNavigation === true;
  const frameFill =
    typeof options.frameFill === "number" && options.frameFill > 0
      ? options.frameFill
      : 0.3;
  const zoomInFactor =
    typeof options.zoomInFactor === "number" && options.zoomInFactor > 0
      ? options.zoomInFactor
      : frameNavigation === true
        ? 1.6
        : 1;
  const brightGizmo = options.brightGizmo === true;
  const companionModelFilenames = Array.isArray(options.companionModelFilenames)
    ? options.companionModelFilenames.filter(
        (n) => typeof n === "string" && n.length > 0,
      )
    : [];

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
  renderer.toneMappingExposure =
    brightGizmo === true
      ? 1.35
      : transparentBackground === true
        ? 0.98
        : 0.65;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);

  const controlElement =
    options.controlElement instanceof HTMLElement
      ? options.controlElement
      : renderer.domElement;

  const controls = new OrbitControls(camera, controlElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enableZoom = frameNavigation === true ? true : enableZoom;
  controls.enablePan = frameNavigation === true ? true : enablePan;
  if (frameNavigation === true) {
    controlElement.style.touchAction = "none";
    preventBrowserTouchGestures(controlElement);
    controls.mouseButtons = {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.PAN,
      RIGHT: MOUSE.PAN,
    };
    controls.touches = {
      ONE: TOUCH.ROTATE,
      TWO: TOUCH.DOLLY_ROTATE,
    };
    controls.zoomSpeed = 1.15;
  }

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  if (transparentBackground === true) {
    renderPass.clearAlpha = 0;
  } else {
    renderPass.clearColor = new THREE.Color(0x141414);
    renderPass.clearAlpha = 1;
  }
  composer.addPass(renderPass);

  let outlinePass = null;
  if (frameNavigation === true) {
    outlinePass = createSelectionOutlinePass(width, height, scene, camera);
    composer.addPass(outlinePass);
  }

  if (brightGizmo === true) {
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    const keyBright = new THREE.DirectionalLight(0xffffff, 1.85);
    keyBright.position.set(4, 8, 6);
    scene.add(keyBright);
    const fillBright = new THREE.DirectionalLight(0xb8c4ff, 0.9);
    fillBright.position.set(-5, 2, -4);
    scene.add(fillBright);
  } else {
    const patentFrame = transparentBackground === true;
    const hemi = new THREE.HemisphereLight(
      0xf8f8f8,
      0xd0d0d0,
      patentFrame ? 0.38 : 0.2,
    );
    scene.add(hemi);
    scene.add(
      new THREE.AmbientLight(0xffffff, patentFrame ? 0.42 : 0.2),
    );
    const keyGrey = new THREE.DirectionalLight(
      0xffffff,
      patentFrame ? 0.62 : 0.34,
    );
    keyGrey.position.set(5.2, 9, 4.8);
    scene.add(keyGrey);
    const fillGrey = new THREE.DirectionalLight(
      0xf0f0f0,
      patentFrame ? 0.32 : 0.18,
    );
    fillGrey.position.set(-4.5, 3.2, -4);
    scene.add(fillGrey);
    const bounceGrey = new THREE.DirectionalLight(
      0xe8e8e8,
      patentFrame ? 0.2 : 0.1,
    );
    bounceGrey.position.set(2, -3.5, 5);
    scene.add(bounceGrey);
  }

  const loader = new GLTFLoader();
  const primaryUrls = modelUrlCandidates(modelFilenames);
  setStatus("Loading model…");

  const contentRoot = new THREE.Group();
  scene.add(contentRoot);

  const applyReadyStatus = () => {
    if (frameNavigation === true) {
      setStatus("Drag to orbit · scroll/pinch to zoom · middle-drag to pan");
      return;
    }
    setStatus(
      enableZoom === false
        ? "Drag to orbit"
        : "Drag to orbit · scroll to zoom",
    );
  };

  let companionCubeRef = null;
  let companionGizmoRef = null;
  let mainCubeRef = null;
  let topCubeRef = null;
  let selectedCubeRef = null;
  let orbitAzimuthAccum = 0;
  let lastOrbitAzimuth = 0;
  let orbitAzimuthSamplingReady = false;
  let gizmoFlipParity = 0;

  loadGltfFirstSuccess(
    loader,
    primaryUrls,
    (primaryGltf) => {
      const root = primaryGltf.scene;
      contentRoot.add(root);

      if (brightGizmo === true) {
        applyBrightGizmoMaterials(root, THREE);
      } else {
        applyGreyPrimaryModelMaterials(root, THREE, {
          brighten: transparentBackground === true,
        });
      }

      if (companionModelFilenames.length === 0) {
        frameObject(contentRoot, camera, controls, undefined, frameFill, zoomInFactor);
        applyReadyStatus();
        return;
      }

      if (companionModelFilenames.length > 1) {
        console.warn(
          "[Portfolio 3D] Only the first companion model is used as the viewport manipulator.",
        );
      }

      root.updateMatrixWorld(true);
      const cubeBoxBeforeDouble = new THREE.Box3().setFromObject(root);
      const cubeSizeBeforeDouble = cubeBoxBeforeDouble.getSize(new THREE.Vector3());
      const cubeMaxForGizmoSizing = Math.max(
        cubeSizeBeforeDouble.x,
        cubeSizeBeforeDouble.y,
        cubeSizeBeforeDouble.z,
        1e-6,
      );

      /* 3× authored size: 2× from before, then +50% (×1.5). Gizmo sizing still uses pre-scale bbox. */
      root.scale.multiplyScalar(2 * 1.5);
      root.updateMatrixWorld(true);

      const companionName = companionModelFilenames[0];
      const companionUrls = modelUrlCandidates([companionName]);
      loadGltfFirstSuccess(
        loader,
        companionUrls,
        (compGltf) => {
          const gizmoRoot = compGltf.scene;
          prepareManipulatorGizmoScale(gizmoRoot, cubeMaxForGizmoSizing);
          applyBrightGizmoMaterials(gizmoRoot, THREE);
          applyManipulatorDepthOverlay(gizmoRoot);
          gizmoRoot.userData.excludeFromViewerFit = true;
          parentManipulatorToRig(gizmoRoot, root, contentRoot);
          topCubeRef = stackScaledCubeCloneOnTop(root, 0.5);
          mainCubeRef = root;
          companionCubeRef = root;
          companionGizmoRef = gizmoRoot;
          initCubeGizmoSelection({
            domElement: controlElement,
            camera,
            rig: contentRoot,
            gizmoRoot,
            mainCubeRef: root,
            topCubeRef,
            outlinePass,
            onCubeSelected: (picked) => {
              selectedCubeRef = picked;
            },
          });
          selectedCubeRef = root;
          syncSelectedCubeOutline(outlinePass, root, topCubeRef, root);
          requestAnimationFrame(() => {
            refreshComposerAndOutline(
              composer,
              outlinePass,
              container,
              camera,
              root,
              topCubeRef,
              selectedCubeRef,
            );
          });
          orbitAzimuthAccum = 0;
          orbitAzimuthSamplingReady = false;
          gizmoFlipParity = 0;
          root.updateMatrixWorld(true);
          contentRoot.updateMatrixWorld(true);
          addSubtleAlignedFloorGrid(root, contentRoot);
          const cubeFitBox = new THREE.Box3();
          setBoxFromObjectForViewerFit(cubeFitBox, root);
          const cubeOrbitPivot = cubeFitBox.getCenter(new THREE.Vector3());
          frameObject(
            root,
            camera,
            controls,
            cubeOrbitPivot,
            frameFill,
            zoomInFactor,
            cubeFitBox,
          );
          applyReadyStatus();
        },
        () => {
          console.warn("[Portfolio 3D] Companion GLB failed:", companionName);
          frameObject(contentRoot, camera, controls, undefined, frameFill, zoomInFactor);
          applyReadyStatus();
        },
      );
    },
    () => {
      setStatus(`Could not load 3D model. Tried: ${primaryUrls.join(" · ")}`);
    },
  );

  const onResize = () => {
    const w = Math.max(container.clientWidth, 2);
    const h = Math.max(container.clientHeight, 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    if (outlinePass !== null && selectedCubeRef !== null) {
      syncSelectedCubeOutline(
        outlinePass,
        mainCubeRef,
        topCubeRef,
        selectedCubeRef,
      );
    }
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
    if (companionCubeRef !== null && companionGizmoRef !== null) {
      const az = controls.getAzimuthalAngle();
      if (orbitAzimuthSamplingReady === true) {
        let deltaAz = az - lastOrbitAzimuth;
        while (deltaAz > Math.PI) deltaAz -= 2 * Math.PI;
        while (deltaAz < -Math.PI) deltaAz += 2 * Math.PI;
        orbitAzimuthAccum += deltaAz;
        let crossings = 0;
        while (orbitAzimuthAccum >= GIZMO_ORBIT_FLIP_STEP_RAD) {
          orbitAzimuthAccum -= GIZMO_ORBIT_FLIP_STEP_RAD;
          crossings += 1;
        }
        while (orbitAzimuthAccum <= -GIZMO_ORBIT_FLIP_STEP_RAD) {
          orbitAzimuthAccum += GIZMO_ORBIT_FLIP_STEP_RAD;
          crossings += 1;
        }
        gizmoFlipParity = (gizmoFlipParity + crossings) % 2;
      } else {
        orbitAzimuthSamplingReady = true;
      }
      lastOrbitAzimuth = az;
      const flipYaw = gizmoFlipParity * Math.PI;
      _gizmoFlipYawQuat.setFromAxisAngle(_worldYAxis, flipYaw);
      companionGizmoRef.quaternion.copy(companionCubeRef.quaternion);
      companionGizmoRef.quaternion.premultiply(_gizmoFlipYawQuat);
    }
    composer.render();
  }
  tick();
}
