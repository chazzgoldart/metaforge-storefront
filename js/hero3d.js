/* ═══════════════════════════════════════════════════════════
   METAFORGE — Reusable Floating 3D Scene Factory
   - createFloatingScene({ canvas, modelPath, saveKey, showControls })
   - Loads GLB, auto-centers/scales, stable orientation, cool lighting
   - Optional live rotation HUD + arrow-key controls (with localStorage)
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ═══════════════════════════════════════════════════════════
   Global loading tracker — all scenes register their progress
   so the loader UI shows real progress and dismisses when done.
   ═══════════════════════════════════════════════════════════ */
const LOADER = {
  el:      document.getElementById('loader'),
  fill:    document.getElementById('loader-bar-fill'),
  pct:     document.getElementById('loader-pct'),
  status:  document.getElementById('loader-status'),
  scenes:  new Map(),    // sceneId -> { loaded, total, done }
  startAt: performance.now(),

  register(id) {
    this.scenes.set(id, { loaded: 0, total: 0, done: false });
  },

  update(id, loaded, total) {
    const s = this.scenes.get(id);
    if (!s) return;
    s.loaded = loaded;
    if (total) s.total = total;
    this.render();
  },

  finish(id) {
    const s = this.scenes.get(id);
    if (s) { s.done = true; s.loaded = s.total = Math.max(s.total, 1); }
    this.render();
    if ([...this.scenes.values()].every(x => x.done)) this.dismiss();
  },

  render() {
    const totals = [...this.scenes.values()];
    if (totals.length === 0) return;
    // If total bytes are unknown, fall back to per-scene "done" weighting
    const knownTotals = totals.every(s => s.total > 0);
    let pct = 0;
    if (knownTotals) {
      const sum = totals.reduce((a, s) => a + s.total, 0);
      const got = totals.reduce((a, s) => a + s.loaded, 0);
      pct = sum ? (got / sum) * 100 : 0;
    } else {
      const done = totals.filter(s => s.done).length;
      pct = (done / totals.length) * 100;
    }
    pct = Math.min(99, pct);
    if (totals.every(s => s.done)) pct = 100;

    if (this.fill) this.fill.style.width = pct.toFixed(1) + '%';
    if (this.pct)  this.pct.textContent  = Math.round(pct) + '%';
    if (this.status) {
      const phase = pct < 30 ? 'STREAMING ASSETS'
                  : pct < 70 ? 'FORGING SCENES'
                  : pct < 100 ? 'CALIBRATING LIGHTS'
                  : 'READY';
      this.status.textContent = phase + '…';
    }
  },

  dismiss() {
    if (!this.el) return;
    // Minimum visible time so it doesn't flash
    const elapsed = performance.now() - this.startAt;
    const wait = Math.max(0, 700 - elapsed);
    setTimeout(() => {
      this.status && (this.status.textContent = 'READY');
      this.fill && (this.fill.style.width = '100%');
      this.pct && (this.pct.textContent = '100%');
      setTimeout(() => this.el.classList.add('gone'), 250);
    }, wait);
  },
};

// Safety net — dismiss after 30s no matter what (e.g. if a GLB fails)
setTimeout(() => LOADER?.el && LOADER.el.classList.add('gone'), 30000);

/* ───────── Reveal saved rotations (so you can bake them as defaults) ───────── */
(function showSavedRotations() {
  const keys = ['mf_hero_rot', 'mf_mask_rot', 'mf_bot_rot', 'mf_xn_rot'];
  const out = {};
  keys.forEach(k => {
    try { out[k] = JSON.parse(localStorage.getItem(k)) || null; } catch { out[k] = null; }
  });
  console.log('%c🔧 METAFORGE SAVED ROTATIONS', 'background:#b7c9ff;color:#000;padding:6px 14px;font-weight:700;border-radius:4px;font-size:12px;');
  Object.entries(out).forEach(([k, v]) => {
    if (v) {
      const yd = (v.y * 180 / Math.PI).toFixed(1);
      const xd = (v.x * 180 / Math.PI).toFixed(1);
      console.log(`  ${k}:  Y: ${yd}°  X: ${xd}°    →    { y: ${v.y.toFixed(4)}, x: ${v.x.toFixed(4)} }`);
    } else {
      console.log(`  ${k}:  (not set)`);
    }
  });
  console.log('%c💡 Copy these values and tell Claude to bake them in for the live site.', 'color:#8a8f9c;font-style:italic;');
})();

function createFloatingScene({
  canvas,
  modelPath,
  saveKey = 'mf_rot_default',
  showControls = false,
  targetSize = 1.8,
  hudLabel = '',
  lightBoost = 1.0,   // multiplier for all lights
  exposure   = 1.05,  // tone-mapping exposure
}) {
  if (!canvas) return;
  const parent = canvas.parentElement;

  /* ── Renderer ── */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.setClearColor(0x000000, 0);

  /* ── Scene + Camera ── */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.2, 4.2);
  camera.lookAt(0, 0, 0);

  /* ── Lights ── (all scaled by lightBoost) */
  const B = lightBoost;
  scene.add(new THREE.AmbientLight(0xb7c9ff, 0.45 * B));

  const key = new THREE.DirectionalLight(0xeaf0ff, 2.2 * B);
  key.position.set(2.5, 3.5, 2.5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xc8a8ff, 1.4 * B);
  rim.position.set(-3, 1.5, -2);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffcfa0, 0.4 * B);
  fill.position.set(-2, -1, 2);
  scene.add(fill);

  // Strong front fill so the face/details pop toward the user
  const front = new THREE.DirectionalLight(0xffffff, 0.9 * B);
  front.position.set(0, 0.3, 4);
  scene.add(front);

  const pulseA = new THREE.PointLight(0xb7c9ff, 6 * B, 8, 2);
  pulseA.position.set(1.5, 1.2, 1.2);
  scene.add(pulseA);

  const pulseB = new THREE.PointLight(0xc8a8ff, 5 * B, 8, 2);
  pulseB.position.set(-1.5, -0.8, 1.2);
  scene.add(pulseB);

  const pulseC = new THREE.PointLight(0x7ef0c0, 3 * B, 8, 2);
  pulseC.position.set(0, 1.6, -1.5);
  scene.add(pulseC);

  // Extra under-rim point light (warm pink) — accents the jawline / underside
  const pulseD = new THREE.PointLight(0xffa3d5, 3 * B, 8, 2);
  pulseD.position.set(0, -1.4, 1.6);
  scene.add(pulseD);

  // Save boost so the animation loop knows the scale
  scene.userData.B = B;

  /* ── Pivot ── */
  const pivot = new THREE.Group();
  scene.add(pivot);

  /* ── Saved rotation (persists across refreshes) ── */
  let saved = { y: 0, x: 0 };
  try { saved = JSON.parse(localStorage.getItem(saveKey)) || saved; } catch {}
  let userRotY = saved.y || 0;
  let userRotX = saved.x || 0;

  /* ── Load model ── */
  const loader = new GLTFLoader();
  let model = null;
  let modelReady = false;

  // Register this scene with the global loader UI
  LOADER.register(saveKey);

  loader.load(
    modelPath,
    (gltf) => {
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      model.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = targetSize / maxDim;
      model.scale.setScalar(scale);
      model.rotation.set(0, 0, 0);

      model.traverse((o) => {
        if (o.isMesh && o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            if ('metalness' in m) m.metalness = Math.max(m.metalness ?? 0, 0.65);
            if ('roughness' in m) m.roughness = Math.min(m.roughness ?? 1, 0.35);
            m.envMapIntensity = 1.3;
          });
        }
      });

      pivot.add(model);
      modelReady = true;
      canvas.classList.add('ready');
      LOADER.finish(saveKey);
    },
    (evt) => {
      // Real download progress (when Content-Length is available)
      if (evt && evt.lengthComputable) {
        LOADER.update(saveKey, evt.loaded, evt.total);
      } else if (evt) {
        LOADER.update(saveKey, evt.loaded || 0, 0);
      }
    },
    (err) => {
      console.warn(`GLB load failed for ${modelPath}, using fallback:`, err);
      const geo = new THREE.TorusKnotGeometry(0.7, 0.22, 180, 32);
      const mat = new THREE.MeshStandardMaterial({ color: 0xd0d8ea, metalness: 0.95, roughness: 0.15 });
      model = new THREE.Mesh(geo, mat);
      pivot.add(model);
      modelReady = true;
      LOADER.finish(saveKey);
    }
  );

  /* ── HUD + keyboard controls (optional) ── */
  if (showControls) {
    const hudId = `rot-hud-${saveKey}`;
    let hud = document.getElementById(hudId);
    if (!hud) {
      hud = document.createElement('div');
      hud.id = hudId;
      hud.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        z-index: 999; padding: 10px 16px; border-radius: 999px;
        background: rgba(10,12,18,0.92); color: #cdd7eb;
        font-family: 'JetBrains Mono', monospace; font-size: 11px;
        letter-spacing: 0.18em; border: 1px solid rgba(255,255,255,0.14);
        backdrop-filter: blur(10px);
      `;
      hud.innerHTML = `${hudLabel ? hudLabel + ' · ' : ''}↑↓←→ rotate · Shift = fine · R = reset · L = lock-in &nbsp; <b class="rot-vals">Y:0° X:0°</b>`;
      document.body.appendChild(hud);
    }
    const valsEl = hud.querySelector('.rot-vals');

    function updateHud() {
      const yd = (userRotY * 180 / Math.PI).toFixed(0);
      const xd = (userRotX * 180 / Math.PI).toFixed(0);
      valsEl.textContent = `Y:${yd}° X:${xd}°`;
    }
    updateHud();

    const STEP = Math.PI / 36;
    const FINE = Math.PI / 180;

    // Only respond to keys when the scene is visible (in viewport)
    let isActive = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { isActive = en.isIntersecting; });
    }, { threshold: 0.25 });
    io.observe(parent);

    window.addEventListener('keydown', (e) => {
      if (!isActive) return;
      const s = e.shiftKey ? FINE : STEP;
      if (e.key === 'ArrowLeft')  { userRotY -= s; e.preventDefault(); }
      if (e.key === 'ArrowRight') { userRotY += s; e.preventDefault(); }
      if (e.key === 'ArrowUp')    { userRotX -= s; e.preventDefault(); }
      if (e.key === 'ArrowDown')  { userRotX += s; e.preventDefault(); }
      if (e.key === 'r' || e.key === 'R') { userRotY = 0; userRotX = 0; }
      try { localStorage.setItem(saveKey, JSON.stringify({ y: userRotY, x: userRotX })); } catch {}
      if (e.key === 'l' || e.key === 'L') {
        const yd = (userRotY * 180 / Math.PI).toFixed(1);
        const xd = (userRotX * 180 / Math.PI).toFixed(1);
        console.log(`%c🔒 ${saveKey} → Y:${yd}° X:${xd}°`,
          'background:#6effb0;color:#000;padding:6px 12px;font-weight:700;border-radius:4px;');
        hud.style.borderColor = '#6effb0';
        setTimeout(() => hud.style.borderColor = 'rgba(255,255,255,0.14)', 800);
      }
      updateHud();
    });
  }

  /* ── Resize ── */
  function resize() {
    const r = parent.getBoundingClientRect();
    const w = r.width, h = r.height;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(parent);

  /* ── Animate (stable) ── */
  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();

    if (modelReady && pivot) {
      pivot.rotation.set(userRotX, userRotY, 0);
      pivot.position.set(0, 0, 0);
    }

    pulseA.intensity = (5 + Math.sin(t * 1.8) * 1.6) * B;
    pulseB.intensity = (4 + Math.sin(t * 2.3 + 1) * 1.4) * B;
    pulseC.intensity = (2.5 + Math.sin(t * 1.4 + 2) * 1.2) * B;
    pulseD.intensity = (2.5 + Math.sin(t * 1.7 + 0.5) * 1.0) * B;

    pulseA.position.x = Math.cos(t * 0.9) * 1.8;
    pulseA.position.z = Math.sin(t * 0.9) * 1.8;
    pulseB.position.x = Math.cos(t * 0.7 + Math.PI) * 1.8;
    pulseB.position.z = Math.sin(t * 0.7 + Math.PI) * 1.8;
    pulseC.position.y = 1.4 + Math.sin(t * 0.8) * 0.6;
    pulseD.position.x = Math.cos(t * 1.1) * 1.5;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ── Initialize both scenes ── */
// 1) Hero floating model — LOCKED (saved rotation auto-applied, no HUD)
createFloatingScene({
  canvas: document.getElementById('hero-3d'),
  modelPath: 'images/floating-above.glb',
  saveKey: 'mf_hero_rot',
  showControls: false,
  targetSize: 1.8,
});

// 2) Mask showcase — LOCKED, with boosted lighting so it pops off the screen
createFloatingScene({
  canvas: document.getElementById('mask-3d'),
  modelPath: 'images/futuristic-mask.glb',
  saveKey: 'mf_mask_rot',
  showControls: false,
  targetSize: 1.8,
  lightBoost: 1.8,
  exposure: 1.35,
});

// 3) Portal — L1L B0TZ (bot)
createFloatingScene({
  canvas: document.getElementById('portal-bot-3d'),
  modelPath: 'images/bot.glb',
  saveKey: 'mf_bot_rot',
  showControls: true,
  hudLabel: 'BOT',
  targetSize: 1.8,
  lightBoost: 1.4,
  exposure: 1.2,
});

// 4) Portal — XNORMIES
createFloatingScene({
  canvas: document.getElementById('portal-xn-3d'),
  modelPath: 'images/xnormie.glb',
  saveKey: 'mf_xn_rot',
  showControls: true,
  hudLabel: 'XN',
  targetSize: 1.8,
  lightBoost: 1.4,
  exposure: 1.2,
});
