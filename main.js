/*
 * JASEEM NIZARDEEN // PORTFOLIO OS
 * Three.js globe, GSAP scroll choreography, cursor telemetry, and UI controls.
 */
import * as THREE from 'three';

const { gsap, ScrollTrigger } = window;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });

/* -------------------------------------------------------------------------- */
/* Boot sequence                                                              */
/* -------------------------------------------------------------------------- */
const bootScreen = document.querySelector('#boot-screen');
const bootProgress = document.querySelector('#boot-progress');
const bootValue = document.querySelector('#boot-value');
let bootAmount = 0;

const bootTimer = window.setInterval(() => {
  bootAmount = Math.min(100, bootAmount + 8 + Math.random() * 18);
  const value = Math.round(bootAmount);
  bootProgress.style.width = `${value}%`;
  bootValue.textContent = `${String(value).padStart(3, '0')}%`;
  if (value >= 100) {
    window.clearInterval(bootTimer);
    window.setTimeout(() => bootScreen.classList.add('is-complete'), prefersReducedMotion ? 0 : 280);
  }
}, prefersReducedMotion ? 12 : 70);

/* -------------------------------------------------------------------------- */
/* Three.js world                                                             */
/* -------------------------------------------------------------------------- */
const canvas = document.querySelector('#webgl');
let renderer;
let scene;
let camera;
let worldGroup;
let globeSurface;
let atmosphere;
let stars;
let orbitRig;
let nodeGroups = [];
let orbitalClouds = [];
let renderEnabled = true;

const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 };
const scrollState = { progress: 0 };
const threeClock = new THREE.Clock();
const cameraLookAt = new THREE.Vector3(0, 0, 0);

function createRenderer() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x05050d, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
  } catch (error) {
    renderEnabled = false;
    document.documentElement.classList.add('no-webgl');
    console.warn('WebGL is unavailable; the interface fallback is active.', error);
  }
}

function latLonVector(lat, lon, radius = 2.075) {
  const latitude = THREE.MathUtils.degToRad(lat);
  const longitude = THREE.MathUtils.degToRad(lon);
  const cosLat = Math.cos(latitude);
  return new THREE.Vector3(
    radius * cosLat * Math.cos(longitude),
    radius * Math.sin(latitude),
    radius * cosLat * Math.sin(longitude)
  );
}

function makeLine(points, material, closed = false) {
  const path = [...points];
  if (closed && path.length) path.push(path[0].clone());
  const geometry = new THREE.BufferGeometry().setFromPoints(path);
  return new THREE.Line(geometry, material);
}

function buildGraticule(parent) {
  const material = new THREE.LineBasicMaterial({
    color: 0x00cbd8,
    transparent: true,
    opacity: 0.105,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  for (let latitude = -75; latitude <= 75; latitude += 15) {
    const points = [];
    for (let longitude = -180; longitude <= 180; longitude += 3) {
      points.push(latLonVector(latitude, longitude, 2.07));
    }
    parent.add(makeLine(points, material));
  }

  for (let longitude = -165; longitude <= 180; longitude += 15) {
    const points = [];
    for (let latitude = -90; latitude <= 90; latitude += 3) {
      points.push(latLonVector(latitude, longitude, 2.071));
    }
    parent.add(makeLine(points, material));
  }
}

function buildFallbackContinents(parent) {
  // Lightweight coast silhouettes keep the planet recognizable before the detailed map arrives.
  const coastlines = [
    [[72,-168],[70,-142],[61,-129],[54,-128],[48,-124],[38,-122],[31,-114],[25,-106],[20,-99],[25,-89],[29,-82],[39,-75],[47,-66],[53,-58],[60,-64],[65,-82],[72,-105]],
    [[12,-81],[5,-78],[-5,-80],[-17,-75],[-31,-71],[-45,-74],[-55,-68],[-51,-55],[-34,-49],[-18,-40],[-4,-48],[7,-60]],
    [[36,-10],[44,-9],[51,1],[58,8],[68,20],[71,35],[65,50],[57,42],[52,29],[45,37],[41,50],[35,43],[31,32],[35,20]],
    [[35,-17],[28,-13],[15,-17],[5,-8],[-5,10],[-18,13],[-34,18],[-35,29],[-25,36],[-12,44],[5,43],[15,37],[27,33],[35,25]],
    [[31,32],[40,48],[51,60],[56,80],[67,100],[63,130],[56,142],[45,142],[35,129],[24,121],[11,106],[5,96],[8,80],[22,67]],
    [[-12,113],[-20,116],[-29,114],[-38,124],[-39,141],[-33,153],[-22,151],[-12,141],[-10,126]],
    [[60,-48],[68,-54],[78,-44],[82,-27],[74,-18],[64,-22]],
    [[45,141],[39,140],[34,136],[31,130]],
    [[-35,172],[-41,175],[-46,169],[-40,166]]
  ];
  const material = new THREE.LineBasicMaterial({
    color: 0x00f3ff,
    transparent: true,
    opacity: 0.26,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  coastlines.forEach((coast) => {
    const points = coast.map(([latitude, longitude]) => latLonVector(latitude, longitude, 2.082));
    parent.add(makeLine(points, material, true));
  });
}

function buildAtmosphere() {
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewDirection;
    void main() {
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewDirection = normalize(-viewPosition.xyz);
      gl_Position = projectionMatrix * viewPosition;
    }
  `;
  const fragmentShader = `
    varying vec3 vNormal;
    varying vec3 vViewDirection;
    void main() {
      float fresnel = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), 2.35);
      vec3 cyan = vec3(0.0, 0.953, 1.0);
      vec3 magenta = vec3(1.0, 0.0, 0.333);
      vec3 color = mix(cyan, magenta, fresnel * 0.24);
      gl_FragColor = vec4(color, fresnel * 0.58);
    }
  `;

  return new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 72, 72),
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    })
  );
}

function addLocationNode(lat, lon, primary = false) {
  const node = new THREE.Group();
  const normal = latLonVector(lat, lon, 1).normalize();
  node.position.copy(latLonVector(lat, lon, 2.1));
  node.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  const color = primary ? 0xff0055 : 0x00f3ff;
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(primary ? 0.045 : 0.029, 10, 10),
    new THREE.MeshBasicMaterial({ color, toneMapped: false })
  );
  dot.position.z = 0.012;
  node.add(dot);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(primary ? 0.075 : 0.055, primary ? 0.088 : 0.064, 28),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: primary ? 0.85 : 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    })
  );
  ring.position.z = 0.006;
  node.add(ring);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.016, primary ? 0.34 : 0.2, 6, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  beacon.rotation.x = Math.PI / 2;
  beacon.position.z = primary ? 0.17 : 0.1;
  node.add(beacon);

  node.userData = { ring, phase: Math.random() * Math.PI * 2, primary };
  nodeGroups.push(node);
  worldGroup.add(node);
}

function buildOrbitalSystem() {
  orbitRig = new THREE.Group();
  const colors = [0x00f3ff, 0xff0055, 0x00f3ff];

  [2.72, 3.06, 3.43].forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 1 ? 0.009 : 0.006, 5, 220),
      new THREE.MeshBasicMaterial({
        color: colors[index],
        transparent: true,
        opacity: index === 1 ? 0.28 : 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    ring.rotation.x = Math.PI * (0.53 + index * 0.14);
    ring.rotation.y = index * 0.68;
    ring.userData.speed = (index % 2 ? -1 : 1) * (0.035 + index * 0.012);
    orbitRig.add(ring);
  });

  for (let orbit = 0; orbit < 3; orbit += 1) {
    const count = 90;
    const positions = new Float32Array(count * 3);
    const radius = 2.65 + orbit * 0.39;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const variance = (Math.random() - 0.5) * 0.08;
      positions[i * 3] = Math.cos(angle) * (radius + variance);
      positions[i * 3 + 1] = Math.sin(angle) * (radius + variance);
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const cloud = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: orbit === 1 ? 0xff0055 : 0x00f3ff,
        size: 0.025,
        transparent: true,
        opacity: 0.64,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        toneMapped: false
      })
    );
    cloud.rotation.x = Math.PI * (0.53 + orbit * 0.14);
    cloud.rotation.y = orbit * 0.68;
    cloud.userData.speed = (orbit % 2 ? -1 : 1) * (0.05 + orbit * 0.02);
    orbitalClouds.push(cloud);
    orbitRig.add(cloud);
  }

  worldGroup.add(orbitRig);
}

function buildStarField() {
  const count = window.innerWidth < 700 ? 700 : 1500;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const radius = 12 + Math.random() * 28;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    sizes[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0x92dbe7,
      size: 0.032,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false
    })
  );
  scene.add(stars);
}

function buildFloorGrid() {
  const grid = new THREE.GridHelper(50, 50, 0x006c78, 0x08222b);
  grid.position.set(0, -5.5, -5);
  grid.material.transparent = true;
  grid.material.opacity = 0.18;
  scene.add(grid);
}

async function loadCountryBorders() {
  try {
    // Loaded dynamically so a blocked map CDN never prevents the core globe/UI from starting.
    const [{ mesh: createTopologyMesh }, response] = await Promise.all([
      import('topojson-client'),
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json', { mode: 'cors' })
    ]);
    if (!response.ok) throw new Error(`Map request returned ${response.status}`);
    const topology = await response.json();
    const boundaries = createTopologyMesh(topology, topology.objects.countries);
    const material = new THREE.LineBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });
    const borderGroup = new THREE.Group();
    boundaries.coordinates.forEach((coordinates) => {
      const points = coordinates.map(([longitude, latitude]) => latLonVector(latitude, longitude, 2.086));
      borderGroup.add(makeLine(points, material));
    });
    worldGroup.add(borderGroup);
  } catch (error) {
    console.warn('Geographic borders could not be loaded; graticule fallback remains active.', error);
  }
}

function initScene() {
  createRenderer();
  if (!renderEnabled) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050d);
  scene.fog = new THREE.FogExp2(0x05050d, 0.031);

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 9.1);

  scene.add(new THREE.AmbientLight(0x17475b, 0.85));
  const cyanLight = new THREE.PointLight(0x00f3ff, 18, 20, 2);
  cyanLight.position.set(4, 3, 5);
  scene.add(cyanLight);
  const magentaLight = new THREE.PointLight(0xff0055, 12, 18, 2);
  magentaLight.position.set(-4, -2, 3);
  scene.add(magentaLight);

  worldGroup = new THREE.Group();
  worldGroup.position.set(2.75, 0.12, 0);
  worldGroup.rotation.set(0.08, -0.08, -0.05);
  scene.add(worldGroup);

  globeSurface = new THREE.Mesh(
    new THREE.SphereGeometry(2.04, 72, 72),
    new THREE.MeshPhongMaterial({
      color: 0x071420,
      emissive: 0x002934,
      emissiveIntensity: 0.7,
      specular: 0x00a8b5,
      shininess: 45,
      transparent: true,
      opacity: 0.94
    })
  );
  worldGroup.add(globeSurface);

  const innerCore = new THREE.Mesh(
    new THREE.SphereGeometry(1.89, 40, 40),
    new THREE.MeshBasicMaterial({ color: 0x030813, transparent: true, opacity: 0.92 })
  );
  worldGroup.add(innerCore);

  atmosphere = buildAtmosphere();
  worldGroup.add(atmosphere);
  buildGraticule(worldGroup);
  buildFallbackContinents(worldGroup);
  buildOrbitalSystem();

  [
    [6.9271, 79.8612, true],
    [25.2048, 55.2708, false],
    [51.5072, -0.1276, false],
    [40.7128, -74.006, false],
    [35.6762, 139.6503, false],
    [-33.8688, 151.2093, false],
    [1.3521, 103.8198, false],
    [52.52, 13.405, false]
  ].forEach(([latitude, longitude, primary]) => addLocationNode(latitude, longitude, primary));

  buildStarField();
  buildFloorGrid();
  loadCountryBorders();
}

initScene();

/* -------------------------------------------------------------------------- */
/* Scroll-driven camera path                                                  */
/* -------------------------------------------------------------------------- */
const desktopFrames = [
  { p: 0.00, world: [2.75, 0.12, 0], camera: [0, 0, 9.1], scale: 1.00, spin: 0.0 },
  { p: 0.28, world: [-2.80, 0.05, -0.1], camera: [0.25, 0.05, 7.45], scale: 0.90, spin: 1.35 },
  { p: 0.63, world: [2.55, 0.38, -0.55], camera: [-0.2, 0.08, 9.65], scale: 1.05, spin: 3.20 },
  { p: 1.00, world: [-2.75, -0.08, -0.3], camera: [0.2, -0.1, 7.7], scale: 0.92, spin: 5.10 }
];

const mobileFrames = [
  { p: 0.00, world: [0, 1.95, -0.35], camera: [0, 0, 9.8], scale: 0.80, spin: 0.0 },
  { p: 0.28, world: [0, 0.75, -1.5], camera: [0.2, 0, 9.3], scale: 0.76, spin: 1.35 },
  { p: 0.63, world: [0, 0.2, -2.4], camera: [-0.2, 0, 9.8], scale: 0.84, spin: 3.20 },
  { p: 1.00, world: [0, -0.2, -1.7], camera: [0.1, 0, 9.1], scale: 0.75, spin: 5.10 }
];

function interpolateFrames(progress) {
  const frames = window.innerWidth <= 820 ? mobileFrames : desktopFrames;
  let left = frames[0];
  let right = frames[frames.length - 1];
  for (let i = 0; i < frames.length - 1; i += 1) {
    if (progress >= frames[i].p && progress <= frames[i + 1].p) {
      left = frames[i];
      right = frames[i + 1];
      break;
    }
  }
  const range = right.p - left.p || 1;
  const raw = THREE.MathUtils.clamp((progress - left.p) / range, 0, 1);
  const mix = raw * raw * (3 - 2 * raw);
  return {
    world: left.world.map((value, index) => THREE.MathUtils.lerp(value, right.world[index], mix)),
    camera: left.camera.map((value, index) => THREE.MathUtils.lerp(value, right.camera[index], mix)),
    scale: THREE.MathUtils.lerp(left.scale, right.scale, mix),
    spin: THREE.MathUtils.lerp(left.spin, right.spin, mix)
  };
}

if (ScrollTrigger) {
  ScrollTrigger.create({
    trigger: '#main-content',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      scrollState.progress = self.progress;
      const percent = Math.round(self.progress * 100);
      document.querySelector('#scroll-progress').style.height = `${percent}%`;
      document.querySelector('#scroll-readout').textContent = `SCROLL // ${String(percent).padStart(3, '0')}%`;
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Cursor HUD                                                                 */
/* -------------------------------------------------------------------------- */
const cursorHud = document.querySelector('#cursor-hud');
const cursorX = document.querySelector('#cursor-x');
const cursorY = document.querySelector('#cursor-y');
const pitchValue = document.querySelector('#pitch-value');
const yawValue = document.querySelector('#yaw-value');
const pitchBar = document.querySelector('#pitch-bar');
const yawBar = document.querySelector('#yaw-bar');
const cursorState = { x: window.innerWidth / 2, y: window.innerHeight / 2, targetX: window.innerWidth / 2, targetY: window.innerHeight / 2, velocity: 0 };
let previousPointer = { x: cursorState.x, y: cursorState.y, time: performance.now() };

function signed(value) {
  return `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(1).padStart(4, '0')}`;
}

function setAxisBar(element, normalized) {
  const amount = Math.abs(normalized) * 50;
  element.style.width = `${amount}%`;
  element.style.left = normalized < 0 ? `${50 - amount}%` : '50%';
}

window.addEventListener('pointermove', (event) => {
  const now = performance.now();
  const distance = Math.hypot(event.clientX - previousPointer.x, event.clientY - previousPointer.y);
  const elapsed = Math.max(16, now - previousPointer.time);
  cursorState.velocity = Math.min(1, distance / elapsed / 1.5);
  cursorState.targetX = event.clientX;
  cursorState.targetY = event.clientY;
  previousPointer = { x: event.clientX, y: event.clientY, time: now };

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);

  const pitch = pointer.y * 45;
  const yaw = pointer.x * 90;
  cursorX.textContent = `X ${String(Math.round(event.clientX)).padStart(4, '0')}`;
  cursorY.textContent = `Y ${String(Math.round(event.clientY)).padStart(4, '0')}`;
  pitchValue.textContent = signed(pitch);
  yawValue.textContent = signed(yaw);
  setAxisBar(pitchBar, pointer.y);
  setAxisBar(yawBar, pointer.x);

  const interactive = event.target.closest('a, button, input, textarea, .tilt-card');
  cursorHud.classList.toggle('is-active', Boolean(interactive));
}, { passive: true });

window.addEventListener('pointerleave', () => { cursorHud.style.opacity = '0'; });
window.addEventListener('pointerenter', () => { cursorHud.style.opacity = '1'; });

/* -------------------------------------------------------------------------- */
/* Render loop                                                                */
/* -------------------------------------------------------------------------- */
function animate() {
  const delta = Math.min(0.05, threeClock.getDelta());
  const elapsed = threeClock.elapsedTime;

  cursorState.x += (cursorState.targetX - cursorState.x) * 0.22;
  cursorState.y += (cursorState.targetY - cursorState.y) * 0.22;
  cursorState.velocity *= 0.9;
  const stretch = 1 + cursorState.velocity * 0.32;
  cursorHud.style.transform = `translate3d(${cursorState.x}px, ${cursorState.y}px, 0) rotate(${pointer.x * 4}deg) scale(${stretch}, ${2 - stretch})`;

  pointer.smoothX += (pointer.x - pointer.smoothX) * 0.035;
  pointer.smoothY += (pointer.y - pointer.smoothY) * 0.035;

  if (renderEnabled && renderer && scene && camera && worldGroup) {
    const frame = interpolateFrames(scrollState.progress);
    const motionFactor = prefersReducedMotion ? 0.08 : 1;

    worldGroup.position.x += (frame.world[0] - worldGroup.position.x) * 0.055;
    worldGroup.position.y += (frame.world[1] - worldGroup.position.y) * 0.055;
    worldGroup.position.z += (frame.world[2] - worldGroup.position.z) * 0.055;
    const targetScale = frame.scale;
    worldGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.055);

    camera.position.x += (frame.camera[0] + pointer.smoothX * 0.12 - camera.position.x) * 0.045;
    camera.position.y += (frame.camera[1] + pointer.smoothY * 0.08 - camera.position.y) * 0.045;
    camera.position.z += (frame.camera[2] - camera.position.z) * 0.045;
    camera.lookAt(cameraLookAt);

    worldGroup.rotation.x += ((0.08 - pointer.smoothY * 0.055) - worldGroup.rotation.x) * 0.035;
    worldGroup.rotation.y = -0.08 + frame.spin + elapsed * 0.045 * motionFactor + pointer.smoothX * 0.1;
    worldGroup.rotation.z += ((-0.05 + pointer.smoothX * 0.025) - worldGroup.rotation.z) * 0.035;

    if (!prefersReducedMotion) {
      orbitRig.children.forEach((object) => { object.rotation.z += object.userData.speed * delta; });
      nodeGroups.forEach((node) => {
        const pulse = 1 + Math.sin(elapsed * (node.userData.primary ? 3.1 : 2.1) + node.userData.phase) * (node.userData.primary ? 0.42 : 0.25);
        node.userData.ring.scale.setScalar(pulse);
      });
      const breath = 1 + Math.sin(elapsed * 1.2) * 0.006;
      atmosphere.scale.setScalar(breath);
      stars.rotation.y = elapsed * 0.004;
      stars.rotation.x = Math.sin(elapsed * 0.06) * 0.025;
    }

    renderer.render(scene, camera);
  }

  window.requestAnimationFrame(animate);
}
window.requestAnimationFrame(animate);

function handleResize() {
  if (renderer && camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  if (ScrollTrigger) ScrollTrigger.refresh();
}
window.addEventListener('resize', handleResize, { passive: true });

/* -------------------------------------------------------------------------- */
/* GSAP interface choreography                                                */
/* -------------------------------------------------------------------------- */
if (gsap && ScrollTrigger) {
  gsap.set('.hero__title .title-line > span', { yPercent: 112 });
  gsap.set('.hero .reveal-item', { opacity: 0, y: 22 });

  window.addEventListener('load', () => {
    const intro = gsap.timeline({ delay: prefersReducedMotion ? 0 : 0.7 });
    intro
      .to('.hero__title .title-line > span', { yPercent: 0, duration: prefersReducedMotion ? 0 : 1.05, stagger: 0.1, ease: 'power4.out' })
      .to('.hero .reveal-item', { opacity: 1, y: 0, duration: prefersReducedMotion ? 0 : 0.75, stagger: 0.09, ease: 'power3.out' }, '-=.6')
      .from('.globe-labels > *', { opacity: 0, x: 20, duration: prefersReducedMotion ? 0 : 0.65, stagger: 0.1, ease: 'power2.out' }, '-=.45');
  });

  document.querySelectorAll('.section-heading, .contact-copy').forEach((group) => {
    gsap.from(group.children, {
      scrollTrigger: { trigger: group, start: 'top 82%', once: true },
      opacity: 0,
      y: 32,
      duration: prefersReducedMotion ? 0 : 0.75,
      stagger: 0.09,
      ease: 'power3.out'
    });
  });

  document.querySelectorAll('.diagnostic-grid, .projects-grid').forEach((grid) => {
    const cards = grid.querySelectorAll('.reveal-card');
    gsap.from(cards, {
      scrollTrigger: { trigger: grid, start: 'top 82%', once: true },
      opacity: 0,
      y: 56,
      rotateX: prefersReducedMotion ? 0 : -8,
      duration: prefersReducedMotion ? 0 : 0.85,
      stagger: 0.1,
      ease: 'power3.out'
    });
  });

  gsap.from('.contact-terminal', {
    scrollTrigger: { trigger: '.contact-terminal', start: 'top 84%', once: true },
    opacity: 0,
    x: prefersReducedMotion ? 0 : 45,
    rotateY: prefersReducedMotion ? 0 : -7,
    duration: prefersReducedMotion ? 0 : 0.95,
    ease: 'power3.out'
  });

  gsap.from('.capability-strip', {
    scrollTrigger: { trigger: '.capability-strip', start: 'top 92%', once: true },
    opacity: 0,
    y: 15,
    duration: prefersReducedMotion ? 0 : 0.6,
    ease: 'power2.out'
  });

  document.querySelectorAll('.panel-section').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => setActiveSection(section.id),
      onEnterBack: () => setActiveSection(section.id)
    });
    ScrollTrigger.create({
      trigger: section,
      start: 'top 68%',
      once: true,
      onEnter: () => section.classList.add('in-view')
    });
  });
}

function setActiveSection(id) {
  document.querySelectorAll('.desktop-nav a').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.section === id);
  });
}
setActiveSection('home');

/* Card tilt */
if (window.matchMedia('(pointer: fine)').matches && !prefersReducedMotion && gsap) {
  document.querySelectorAll('.tilt-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateY: x * 4.5,
        rotateX: -y * 4.5,
        x: x * 2,
        y: y * 2,
        duration: 0.42,
        ease: 'power2.out',
        transformPerspective: 1000,
        overwrite: 'auto'
      });
    });
    card.addEventListener('pointerleave', () => {
      gsap.to(card, { rotateY: 0, rotateX: 0, x: 0, y: 0, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
    });
  });

  document.querySelectorAll('.magnetic').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      gsap.to(element, {
        x: (event.clientX - rect.left - rect.width / 2) * 0.1,
        y: (event.clientY - rect.top - rect.height / 2) * 0.16,
        duration: 0.3,
        ease: 'power2.out'
      });
    });
    element.addEventListener('pointerleave', () => gsap.to(element, { x: 0, y: 0, duration: 0.55, ease: 'elastic.out(1, .4)' }));
  });
}

/* -------------------------------------------------------------------------- */
/* Interface controls                                                         */
/* -------------------------------------------------------------------------- */
const header = document.querySelector('#site-header');
const menuToggle = document.querySelector('#menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');

window.addEventListener('scroll', () => {
  header.classList.toggle('is-scrolled', window.scrollY > 24);
}, { passive: true });

function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
  mobileNav.classList.remove('is-open');
  document.body.classList.remove('menu-open');
}

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  mobileNav.classList.toggle('is-open', !isOpen);
  document.body.classList.toggle('menu-open', !isOpen);
});
mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

/* Role typewriter */
const roleElement = document.querySelector('#typed-role');
const roles = ['WEB DEVELOPER', 'WEBSITE BUILDER', 'AUTOMATION EXPERT', 'PROBLEM SOLVER'];
let roleIndex = 0;
let roleCharacter = roles[0].length;
let deleting = true;

function updateRole() {
  if (prefersReducedMotion) return;
  const role = roles[roleIndex];
  roleElement.textContent = role.slice(0, roleCharacter);
  if (deleting) {
    roleCharacter -= 1;
    if (roleCharacter <= 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      window.setTimeout(updateRole, 320);
      return;
    }
  } else {
    roleCharacter += 1;
    if (roleCharacter > roles[roleIndex].length) {
      deleting = true;
      window.setTimeout(updateRole, 1600);
      return;
    }
  }
  window.setTimeout(updateRole, deleting ? 35 : 66);
}
window.setTimeout(updateRole, 2400);

/* Clock */
const systemClock = document.querySelector('#system-clock');
function updateClock() {
  const utc = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
  systemClock.textContent = `${utc} UTC`;
}
updateClock();
window.setInterval(updateClock, 1000);

/* Netlify-compatible terminal form */
const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('#form-status');
const submitButton = contactForm.querySelector('button[type="submit"]');

const submitLabel = submitButton.querySelector('span');

contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  formStatus.classList.remove('is-error');
  formStatus.textContent = 'Sending your message...';
  if (submitLabel) submitLabel.textContent = 'SENDING...';

  try {
    const formData = new FormData(contactForm);
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString()
    });
    if (!response.ok) throw new Error(`Request returned ${response.status}`);
    contactForm.reset();
    formStatus.textContent = 'Thank you! Your message was sent — I will reply within 24 hours.';
    if (submitLabel) submitLabel.textContent = 'MESSAGE SENT';
    window.setTimeout(() => { if (submitLabel) submitLabel.textContent = 'SEND MESSAGE'; }, 4000);
  } catch (error) {
    console.warn('The message could not be sent.', error);
    formStatus.classList.add('is-error');
    formStatus.textContent = 'Sorry, that did not go through. Please try again or message me on WhatsApp.';
    if (submitLabel) submitLabel.textContent = 'SEND MESSAGE';
  } finally {
    submitButton.disabled = false;
  }
});

/* -------------------------------------------------------------------------- */
/* WhatsApp quick contact                                                     */
/* -------------------------------------------------------------------------- */
const WHATSAPP_NUMBER = '94759825269';
const WHATSAPP_DEFAULT_TEXT = "Hi Jaseem, I saw your portfolio and I'd like to talk about a project.";

function whatsappLink(message = WHATSAPP_DEFAULT_TEXT) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Keep every WhatsApp entry point pointing at the same number and message.
document.querySelectorAll('a[href*="wa.me"]').forEach((link) => {
  link.href = whatsappLink();
  link.target = '_blank';
  link.rel = 'noopener';
});

// If the visitor already typed a brief, carry it into WhatsApp so nothing is retyped.
const formAltLink = document.querySelector('.form-alt a');
if (formAltLink) {
  formAltLink.addEventListener('click', () => {
    const name = contactForm.elements.name?.value.trim();
    const brief = contactForm.elements.message?.value.trim();
    if (!name && !brief) return;
    const intro = name ? `Hi Jaseem, this is ${name}.` : 'Hi Jaseem,';
    formAltLink.href = whatsappLink(brief ? `${intro} ${brief}` : `${intro} I'd like to talk about a project.`);
  });
}

// Tuck the floating button away while the contact section (which has its own
// buttons) is on screen, so it never covers the form or the footer.
const whatsappFab = document.querySelector('#whatsapp-fab');
const contactSection = document.querySelector('#contact');
if (whatsappFab && contactSection && 'IntersectionObserver' in window) {
  const fabObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      whatsappFab.classList.toggle('is-hidden', entry.isIntersecting && entry.intersectionRatio > 0.35);
    });
  }, { threshold: [0, 0.35, 0.6] });
  fabObserver.observe(contactSection);
}
