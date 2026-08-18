/* =====================================================
   JASEEM NIZARDEEN — HI-TECH 3D SCROLL PROFILE
   Three.js scene + GSAP ScrollTrigger animations
===================================================== */
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

/* ---------------- LOADER ---------------- */
const loader = document.getElementById('loader');
const loaderProgress = document.getElementById('loader-progress');
let fakeProgress = 0;
const loadInterval = setInterval(() => {
  fakeProgress = Math.min(fakeProgress + Math.random() * 22, 100);
  loaderProgress.style.width = fakeProgress + '%';
  if (fakeProgress >= 100) {
    clearInterval(loadInterval);
    setTimeout(() => loader.classList.add('done'), 350);
  }
}, 180);

/* ---------------- THREE.JS SCENE ---------------- */
const canvas = document.getElementById('webgl');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x04070d, 0.055);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 9);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

/* Lights */
scene.add(new THREE.AmbientLight(0x223355, 0.6));
const cyanLight = new THREE.PointLight(0x00f0ff, 60, 40);
cyanLight.position.set(6, 4, 6);
scene.add(cyanLight);
const magentaLight = new THREE.PointLight(0xff2bd6, 50, 40);
magentaLight.position.set(-6, -3, 4);
scene.add(magentaLight);
const purpleLight = new THREE.PointLight(0x7b2bff, 45, 40);
purpleLight.position.set(0, 6, -6);
scene.add(purpleLight);

/* ---- Central hero object: wireframe icosahedron + inner core ---- */
const heroGroup = new THREE.Group();

const icoGeo = new THREE.IcosahedronGeometry(2.2, 1);
const icoWire = new THREE.Mesh(
  icoGeo,
  new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.5 })
);
heroGroup.add(icoWire);

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.15, 2),
  new THREE.MeshStandardMaterial({
    color: 0x0a1428, metalness: 0.9, roughness: 0.15,
    emissive: 0x7b2bff, emissiveIntensity: 0.6
  })
);
heroGroup.add(core);

/* Orbiting rings */
const rings = [];
for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3 + i * 0.65, 0.015, 8, 120),
    new THREE.MeshBasicMaterial({
      color: i === 1 ? 0xff2bd6 : 0x00f0ff,
      transparent: true, opacity: 0.45 - i * 0.08
    })
  );
  ring.rotation.x = Math.PI / 2 + i * 0.4;
  ring.rotation.y = i * 0.6;
  rings.push(ring);
  heroGroup.add(ring);
}

/* Orbiting satellites (octahedrons) */
const satellites = [];
for (let i = 0; i < 6; i++) {
  const sat = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    new THREE.MeshStandardMaterial({
      color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 1.6,
      metalness: 0.8, roughness: 0.2
    })
  );
  sat.userData = { angle: (i / 6) * Math.PI * 2, radius: 3.4 + (i % 3) * 0.5, speed: 0.3 + (i % 3) * 0.12, tilt: i * 0.5 };
  satellites.push(sat);
  heroGroup.add(sat);
}
scene.add(heroGroup);

/* ---- Particle starfield ---- */
const starCount = 1600;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPos[i * 3] = (Math.random() - 0.5) * 70;
  starPos[i * 3 + 1] = (Math.random() - 0.5) * 70;
  starPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
  color: 0x77ccff, size: 0.05, transparent: true, opacity: 0.75, sizeAttenuation: true
}));
scene.add(stars);

/* ---- Neon grid floor ---- */
const grid = new THREE.GridHelper(80, 60, 0x00f0ff, 0x0a2a3a);
grid.material.transparent = true;
grid.material.opacity = 0.22;
grid.position.y = -5;
scene.add(grid);

/* ---- Floating tech shapes scattered through scroll space ---- */
const floaters = [];
const floaterGeos = [
  new THREE.TorusKnotGeometry(0.5, 0.16, 90, 14),
  new THREE.OctahedronGeometry(0.7),
  new THREE.DodecahedronGeometry(0.65),
  new THREE.TetrahedronGeometry(0.75),
  new THREE.TorusGeometry(0.6, 0.2, 14, 40),
  new THREE.BoxGeometry(0.8, 0.8, 0.8)
];
const floaterColors = [0x00f0ff, 0xff2bd6, 0x7b2bff, 0x00ff9d];
for (let i = 0; i < 14; i++) {
  const geo = floaterGeos[i % floaterGeos.length];
  const col = floaterColors[i % floaterColors.length];
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0x0a1428, metalness: 0.85, roughness: 0.2,
      emissive: col, emissiveIntensity: 0.55,
      wireframe: i % 3 === 0
    })
  );
  mesh.position.set(
    (Math.random() - 0.5) * 16,
    -6 - i * 4.2 + (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 8 - 2
  );
  mesh.userData = { rx: (Math.random() - 0.5) * 0.02, ry: (Math.random() - 0.5) * 0.02, floatOff: Math.random() * Math.PI * 2 };
  floaters.push(mesh);
  scene.add(mesh);
}

/* ---- DNA-like double helix of glowing points (mid-scroll) ---- */
const helixGroup = new THREE.Group();
for (let strand = 0; strand < 2; strand++) {
  for (let i = 0; i < 40; i++) {
    const t = i / 40 * Math.PI * 4;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: strand ? 0xff2bd6 : 0x00f0ff })
    );
    dot.position.set(Math.cos(t + strand * Math.PI) * 1.4, i * 0.35 - 7, Math.sin(t + strand * Math.PI) * 1.4);
    helixGroup.add(dot);
  }
}
helixGroup.position.set(6.5, -26, -3);
scene.add(helixGroup);

/* ---------------- SCROLL-DRIVEN CAMERA ---------------- */
const scrollState = { progress: 0 };
gsap.to(scrollState, {
  progress: 1,
  ease: 'none',
  scrollTrigger: { trigger: '#content', start: 'top top', end: 'bottom bottom', scrub: 1.2 }
});

/* Hero group reacts per-section */
ScrollTrigger.create({
  trigger: '#about', start: 'top 70%',
  onEnter: () => gsap.to(heroGroup.scale, { x: 0.55, y: 0.55, z: 0.55, duration: 1.2, ease: 'power2.out' }),
  onLeaveBack: () => gsap.to(heroGroup.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'power2.out' })
});
ScrollTrigger.create({
  trigger: '#contact', start: 'top 70%',
  onEnter: () => gsap.to(heroGroup.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 1.4, ease: 'power2.out' }),
  onLeaveBack: () => gsap.to(heroGroup.scale, { x: 0.55, y: 0.55, z: 0.55, duration: 1.2, ease: 'power2.out' })
});

/* Mouse parallax */
const mouse = { x: 0, y: 0 };
addEventListener('mousemove', e => {
  mouse.x = (e.clientX / innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / innerHeight - 0.5) * 2;
});

/* ---------------- RENDER LOOP ---------------- */
const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  const p = scrollState.progress;

  // Camera travels down + orbits slightly as you scroll
  const targetY = -p * 34;
  const orbit = p * Math.PI * 1.5;
  camera.position.x += ((Math.sin(orbit) * 3 + mouse.x * 1.2) - camera.position.x) * 0.05;
  camera.position.y += ((targetY - mouse.y * 0.8) - camera.position.y) * 0.06;
  camera.position.z += ((9 - Math.sin(p * Math.PI) * 2.5) - camera.position.z) * 0.05;
  camera.lookAt(0, targetY, 0);

  // Hero object follows the camera down (always in view) with lag
  heroGroup.position.y += ((targetY) - heroGroup.position.y) * 0.04;
  heroGroup.position.x += ((Math.sin(orbit) * -1.5) - heroGroup.position.x) * 0.03;
  heroGroup.rotation.y = t * 0.25 + p * Math.PI * 2;
  heroGroup.rotation.x = Math.sin(t * 0.3) * 0.15 + p * 0.8;

  icoWire.rotation.y = -t * 0.35;
  core.rotation.y = t * 0.5;
  core.rotation.z = t * 0.3;
  const pulse = 1 + Math.sin(t * 2.2) * 0.06;
  core.scale.setScalar(pulse);

  rings.forEach((r, i) => { r.rotation.z = t * (0.15 + i * 0.07); });

  satellites.forEach(s => {
    const a = s.userData.angle + t * s.userData.speed;
    s.position.set(
      Math.cos(a) * s.userData.radius,
      Math.sin(a * 1.3 + s.userData.tilt) * 0.9,
      Math.sin(a) * s.userData.radius
    );
    s.rotation.x = t; s.rotation.y = t * 1.4;
  });

  floaters.forEach(f => {
    f.rotation.x += f.userData.rx;
    f.rotation.y += f.userData.ry;
    f.position.x += Math.sin(t * 0.6 + f.userData.floatOff) * 0.004;
  });

  helixGroup.rotation.y = t * 0.4;

  stars.rotation.y = t * 0.012;
  grid.position.y = -5 + targetY * 0.9;
  grid.position.z = (t * 1.2) % 2.6;

  // Lights breathe
  cyanLight.intensity = 55 + Math.sin(t * 1.7) * 15;
  magentaLight.intensity = 45 + Math.cos(t * 1.3) * 15;
  cyanLight.position.y = 4 + targetY;
  magentaLight.position.y = -3 + targetY;
  purpleLight.position.y = 6 + targetY;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------------- GSAP UI ANIMATIONS ---------------- */

/* Hero intro */
gsap.from('.hero-name .big', {
  yPercent: 110, duration: 1.2, stagger: 0.15, ease: 'power4.out', delay: 1.1
});
gsap.from('.hero .reveal', {
  opacity: 0, y: 40, duration: 1, stagger: 0.15, ease: 'power3.out', delay: 1.5
});
gsap.from('#nav', { y: -60, opacity: 0, duration: 1, delay: 1.0, ease: 'power3.out' });

/* Section heads slide in */
document.querySelectorAll('.section-head').forEach(head => {
  gsap.from(head.children, {
    scrollTrigger: { trigger: head, start: 'top 82%' },
    x: -60, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out'
  });
});

/* Cards fly in with 3D rotation */
document.querySelectorAll('.skills-grid .skill').forEach((el, i) => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 90%' },
    opacity: 0, y: 70, rotateX: -35, duration: 0.9, delay: (i % 4) * 0.09, ease: 'power3.out'
  });
});
document.querySelectorAll('.services-grid .service').forEach((el, i) => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 88%' },
    opacity: 0, y: 90, rotateY: i % 2 ? 25 : -25, duration: 1, delay: i * 0.12, ease: 'power3.out'
  });
});
gsap.from('.terminal', {
  scrollTrigger: { trigger: '.terminal', start: 'top 85%' },
  opacity: 0, x: -80, rotateY: 20, duration: 1, ease: 'power3.out'
});
gsap.from('.about-text > *', {
  scrollTrigger: { trigger: '.about-text', start: 'top 85%' },
  opacity: 0, x: 60, duration: 0.9, stagger: 0.12, ease: 'power3.out'
});
gsap.from('.contact-inner', {
  scrollTrigger: { trigger: '.contact-inner', start: 'top 85%' },
  opacity: 0, scale: 0.85, rotateX: 15, duration: 1.1, ease: 'power3.out'
});

/* Skill bars + counters trigger */
document.querySelectorAll('.section').forEach(sec => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 65%',
    onEnter: () => sec.classList.add('in-view')
  });
});

/* Number counters */
document.querySelectorAll('.stat-num').forEach(el => {
  const target = +el.dataset.count;
  ScrollTrigger.create({
    trigger: el, start: 'top 88%', once: true,
    onEnter: () => {
      gsap.to({ v: 0 }, {
        v: target, duration: 1.6, ease: 'power2.out',
        onUpdate: function () { el.textContent = Math.round(this.targets()[0].v); }
      });
    }
  });
});

/* Scroll progress + HUD */
const progressFill = document.getElementById('progress-fill');
const hudScroll = document.getElementById('hud-scroll');
ScrollTrigger.create({
  trigger: '#content', start: 'top top', end: 'bottom bottom',
  onUpdate: self => {
    progressFill.style.height = (self.progress * 100) + '%';
    hudScroll.textContent = 'SCROLL ' + String(Math.round(self.progress * 100)).padStart(3, '0') + '%';
  }
});

/* Active nav link */
document.querySelectorAll('.section').forEach(sec => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 50%', end: 'bottom 50%',
    onToggle: self => {
      if (self.isActive) {
        document.querySelectorAll('.nav-link').forEach(a =>
          a.classList.toggle('active', a.getAttribute('href') === '#' + sec.id));
      }
    }
  });
});

/* ---------------- TYPEWRITER ---------------- */
const roles = ['WEB DEVELOPER', 'REACT + TYPESCRIPT', 'WEB APP BUILDER', 'VBA AUTOMATION EXPERT', 'SQL + GOOGLE SCRIPT'];
const typedEl = document.getElementById('typed');
let roleIdx = 0, charIdx = 0, deleting = false;
function type() {
  const word = roles[roleIdx];
  typedEl.textContent = word.slice(0, charIdx);
  if (!deleting) {
    charIdx++;
    if (charIdx > word.length) { deleting = true; setTimeout(type, 1600); return; }
  } else {
    charIdx--;
    if (charIdx === 0) { deleting = false; roleIdx = (roleIdx + 1) % roles.length; }
  }
  setTimeout(type, deleting ? 40 : 85);
}
setTimeout(type, 1800);

/* ---------------- HUD CLOCK ---------------- */
const clockEl = document.getElementById('hud-clock');
setInterval(() => {
  const d = new Date();
  clockEl.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
}, 1000);

/* ---------------- 3D TILT ON CARDS ---------------- */
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(card, { rotateY: x * 16, rotateX: -y * 16, scale: 1.04, duration: 0.4, ease: 'power2.out', transformPerspective: 800 });
  });
  card.addEventListener('mouseleave', () => {
    gsap.to(card, { rotateY: 0, rotateX: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
  });
});
