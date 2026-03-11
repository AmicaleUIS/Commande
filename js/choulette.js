import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.getElementById("webgl");

const CONFIG = {
  mainBottleModel: "./assets/brune.glb",

  mainBottleScale: {
    desktop: 0.45,
    tablet: 0.4,
    mobile: 0.4
  },

  sectionColors: [
    "#14233a",
    "#4e2d1d",
    "#1d3557",
    "#6b4123"
  ],

  poses: {
    desktop: [
      { bottleX: 0.75, bottleY: -1.05, bottleZ: 0, rotY: -0.2, rotZ: 0, camY: 0.15, camZ: 3 },
      { bottleX: 0.45, bottleY: -1.08, bottleZ: 0.08, rotY: 2.9, rotZ: 0.0, camY: 0.03, camZ: 5.5 },
      { bottleX: 0.05, bottleY: -1.12, bottleZ: 0.0, rotY: -0.15, rotZ: 0.03, camY: -0.03, camZ: 5.2 },
      { bottleX: 1.15, bottleY: -1.32, bottleZ: 0.0, rotY: 0.0, rotZ: 0.0, camY: -0.06, camZ: 6.6 }
    ],
    tablet: [
      { bottleX: 0.5, bottleY: -1.1, bottleZ: 0.12, rotY: 1.15, rotZ: 0, camY: 0.12, camZ: 6.8 },
      { bottleX: 0.35, bottleY: -1, bottleZ: 0.06, rotY: 0.08, rotZ: 0.0, camY: 0.02, camZ: 5.9 },
      { bottleX: 0.0, bottleY: -1.18, bottleZ: 0.0, rotY: -0.12, rotZ: 0.02, camY: -0.03, camZ: 5.6 },
      { bottleX: 0.9, bottleY: -1.35, bottleZ: 0.0, rotY: 0.0, rotZ: 0.0, camY: -0.05, camZ: 6.8 }
    ],
    mobile: [
      { bottleX: 0.5, bottleY: -1.5, bottleZ: 0.1, rotY: 0.2, rotZ: 0, camY: 0.08, camZ: 4 },
      { bottleX: 0.2, bottleY: -1.4, bottleZ: 0, rotY: 3.2, rotZ: 0, camY: 0.01, camZ: 6.4 },
      { bottleX: -0.05, bottleY: -1.28, bottleZ: 0.0, rotY: -0.1, rotZ: 0.02, camY: -0.02, camZ: 6.0 },
      { bottleX: -1.2, bottleY: -1.4, bottleZ: 0.0, rotY: 0.0, rotZ: 0.0, camY: -0.04, camZ: 10.0 }
    ]
  },

  finalBottles: [
    { containerId: "card-blanche", model: "./assets/blanche.glb", scale: 0.4, y: -1.05, z: 0, speed: 0.006, startRotY: 0.4 },
    { containerId: "card-blonde", model: "./assets/blonde.glb", scale: 0.4, y: -1.08, z: 0, speed: 0.011, startRotY: 1.1 },
    { containerId: "card-ambree", model: "./assets/brune.glb", scale: 0.4, y: -1.1, z: 0, speed: 0.008, startRotY: -0.6 }
  ]
};

function getDeviceType() {
  const w = window.innerWidth;
  if (w <= 640) return "mobile";
  if (w <= 900) return "tablet";
  return "desktop";
}

function getMainBottleScale() {
  return CONFIG.mainBottleScale[getDeviceType()];
}

function getPoses() {
  return CONFIG.poses[getDeviceType()];
}

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffe1b0, 2.5);
keyLight.position.set(3, 6, 5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xffc070, 2);
rimLight.position.set(-4, 3, -2);
scene.add(rimLight);

const bottomLight = new THREE.PointLight(0xffb84d, 1.5);
bottomLight.position.set(0, -2, 2);
scene.add(bottomLight);

scene.background = new THREE.Color(CONFIG.sectionColors[0]);
const bgCurrentColor = new THREE.Color(CONFIG.sectionColors[0]);
const bgTargetColor = new THREE.Color(CONFIG.sectionColors[0]);

function setBackgroundColorByProgress(progress) {
  if (progress < 0.32) {
    bgTargetColor.set(CONFIG.sectionColors[0]);
  } else if (progress < 0.62) {
    bgTargetColor.set(CONFIG.sectionColors[1]);
  } else if (progress < 0.88) {
    bgTargetColor.set(CONFIG.sectionColors[2]);
  } else {
    bgTargetColor.set(CONFIG.sectionColors[3]);
  }

  bgCurrentColor.lerp(bgTargetColor, 0.05);
  scene.background = bgCurrentColor;
}

const loader = new GLTFLoader();
let mainBottle = null;
let poses = getPoses();

loader.load(
  CONFIG.mainBottleModel,
  (gltf) => {
    mainBottle = gltf.scene;
    mainBottle.scale.setScalar(getMainBottleScale());
    scene.add(mainBottle);
  },
  undefined,
  (error) => {
    console.error("Erreur chargement bouteille principale :", error);
  }
);

function getScrollProgress() {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return 0;
  return THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
}

function easeInOut(t) {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerpPose(a, b, t) {
  return {
    bottleX: THREE.MathUtils.lerp(a.bottleX, b.bottleX, t),
    bottleY: THREE.MathUtils.lerp(a.bottleY, b.bottleY, t),
    bottleZ: THREE.MathUtils.lerp(a.bottleZ, b.bottleZ, t),
    rotY: THREE.MathUtils.lerp(a.rotY, b.rotY, t),
    rotZ: THREE.MathUtils.lerp(a.rotZ, b.rotZ, t),
    camY: THREE.MathUtils.lerp(a.camY, b.camY, t),
    camZ: THREE.MathUtils.lerp(a.camZ, b.camZ, t)
  };
}

function getCurrentPose(progress) {
  if (progress < 0.16) {
    const t = easeInOut(progress / 0.16);
    return lerpPose(poses[0], poses[1], t);
  }

  if (progress < 0.32) {
    return poses[1];
  }

  if (progress < 0.48) {
    const t = easeInOut((progress - 0.32) / 0.16);
    return lerpPose(poses[1], poses[2], t);
  }

  if (progress < 0.62) {
    return poses[2];
  }

  if (progress < 0.76) {
    const t = easeInOut((progress - 0.62) / 0.14);
    return lerpPose(poses[2], poses[3], t);
  }

  return poses[3];
}

const cards = document.querySelectorAll(".flavor-card");

let cardsVisible = false;

function updateCards(progress) {
  const isMobile = window.innerWidth <= 640;

  const showThreshold = isMobile ? 0.78 : 0.86;
  const hideThreshold = isMobile ? 0.70 : 0.80;

  if (!cardsVisible && progress >= showThreshold) {
    cardsVisible = true;
  }

  if (cardsVisible && progress < hideThreshold) {
    cardsVisible = false;
  }

  cards.forEach((card, index) => {
    if (cardsVisible) {
      setTimeout(() => {
        card.classList.add("show");
      }, index * 140);
    } else {
      card.classList.remove("show");
    }
  });
}

const miniScenes = [];

function createMiniBottle(config) {
  const container = document.getElementById(config.containerId);
  if (!container) return;

  const miniScene = new THREE.Scene();

  const miniCamera = new THREE.PerspectiveCamera(
    35,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  miniCamera.position.set(0, 0, 5);

  const miniRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  miniRenderer.setSize(container.clientWidth, container.clientHeight);
  miniRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(miniRenderer.domElement);

  const miniAmbient = new THREE.AmbientLight(0xffffff, 1.6);
  miniScene.add(miniAmbient);

  const miniKey = new THREE.DirectionalLight(0xffe4b8, 1.8);
  miniKey.position.set(3, 4, 5);
  miniScene.add(miniKey);

  let miniBottle = null;

  loader.load(
    config.model,
    (gltf) => {
      miniBottle = gltf.scene;
      miniBottle.scale.setScalar(config.scale);
      miniBottle.position.set(0, config.y, config.z);
      miniBottle.rotation.y = config.startRotY;
      miniScene.add(miniBottle);
    },
    undefined,
    (error) => {
      console.error(`Erreur chargement ${config.model} :`, error);
    }
  );

  miniScenes.push({
    container,
    scene: miniScene,
    camera: miniCamera,
    renderer: miniRenderer,
    bottle: () => miniBottle,
    config
  });
}

CONFIG.finalBottles.forEach(createMiniBottle);

function animate() {
  requestAnimationFrame(animate);

  const progress = getScrollProgress();
  const current = getCurrentPose(progress);

  setBackgroundColorByProgress(progress);

  if (mainBottle) {
    mainBottle.scale.setScalar(getMainBottleScale());
    mainBottle.position.set(
      current.bottleX,
      current.bottleY,
      current.bottleZ
    );
    mainBottle.rotation.set(0, current.rotY, current.rotZ);
  }

  camera.position.set(0, current.camY, current.camZ);

  updateCards(progress);

  renderer.render(scene, camera);

  miniScenes.forEach((mini) => {
    const bottle = mini.bottle();
    if (bottle) {
      bottle.rotation.y += mini.config.speed;
      bottle.rotation.z = Math.sin(performance.now() * 0.001 + mini.config.startRotY) * 0.02;
    }
    mini.renderer.render(mini.scene, mini.camera);
  });
}

animate();

window.addEventListener("resize", () => {
  poses = getPoses();

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if (mainBottle) {
    mainBottle.scale.setScalar(getMainBottleScale());
  }

  miniScenes.forEach((mini) => {
    const width = mini.container.clientWidth;
    const height = mini.container.clientHeight;

    mini.camera.aspect = width / height;
    mini.camera.updateProjectionMatrix();
    mini.renderer.setSize(width, height);
    mini.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
});