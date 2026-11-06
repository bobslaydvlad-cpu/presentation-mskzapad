import * as THREE from '../vendor/three.module.min.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const outCubic = t => 1 - Math.pow(1 - t, 3);
const seg = (p, a, b) => clamp((p - a) / (b - a));
const phone = () => Math.min(innerWidth, innerHeight) < 600;
const AMBER = 0xF2A62B;

/* ---------- сцена ---------- */
class Stage {
  constructor(canvas, { ortho = false, fov = 26, shadow = true } = {}) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.08;
    r.shadowMap.enabled = shadow;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = ortho ? new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 800) : new THREE.PerspectiveCamera(fov, 1, .1, 300);
    this.w = this.h = 1;
    this.quality = 1; this.slow = false; this.fTime = 0; this.fCount = 0;
    this.visible = false;
    this.dirty = true;
    this.onResize = null;
    this.onFrame = null;
    this.animating = null;
    new ResizeObserver(() => this.resize()).observe(canvas);
    new IntersectionObserver(es => {
      this.visible = es[0].isIntersecting;
      if (this.visible) { this.dirty = true; this.start(); }
    }).observe(canvas);
    this.resize();
  }
  resize() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.applyQuality();
    this.renderer.setSize(w, h, false);
    if (this.camera.isPerspectiveCamera) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    this.onResize?.(w, h);
    this.dirty = true;
    this.start();
  }
  // Ограничиваем число пикселей: на телевизоре 4K и слабых устройствах 3D остаётся плавным
  applyQuality() {
    const dpr = devicePixelRatio || 1;
    const cap = Math.sqrt(2400000 / Math.max(1, this.w * this.h));
    this.renderer.setPixelRatio(Math.min(dpr, phone() ? 1.5 : 1.75, cap) * this.quality);
  }
  // Если кадры долгие, снижаем качество и убираем фоновые движения
  watchSpeed(dt) {
    this.fTime += dt; this.fCount++;
    if (this.fCount < 24) return;
    const avg = this.fTime / this.fCount;
    this.fTime = this.fCount = 0;
    if (avg > .042 && this.quality > .55) {
      this.quality *= .75;
      this.slow = true;
      this.applyQuality();
      this.renderer.setSize(this.w, this.h, false);
      this.dirty = true;
    }
  }
  // Первый кадр вне экрана: шейдеры компилируются заранее, а не при переходе
  warm() {
    this.renderer.render(this.scene, this.camera);
  }
  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const loop = now => {
      if (!this.visible) { this.running = false; return; }
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      const more = this.animating?.(dt, now / 1000);
      if (this.dirty || more) {
        this.dirty = false;
        this.watchSpeed(dt);
        this.renderer.render(this.scene, this.camera);
        this.onFrame?.();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  project(v, out = new THREE.Vector3()) {
    out.copy(v).project(this.camera);
    return { x: (out.x + 1) / 2 * this.w, y: (1 - out.y) / 2 * this.h, z: out.z };
  }
}

function sun(scene, { x = -26, y = 46, z = 22, size = 40, intensity = 2.5, map = phone() ? 1024 : 2048 } = {}) {
  const hemi = new THREE.HemisphereLight(0xfff4e4, 0x6a6157, 1.05);
  const d = new THREE.DirectionalLight(0xffedd6, intensity);
  d.position.set(x, y, z);
  d.castShadow = true;
  d.shadow.mapSize.set(map, map);
  d.shadow.bias = -.0004;
  d.shadow.normalBias = .02;
  const c = d.shadow.camera;
  c.left = c.bottom = -size; c.right = c.top = size; c.near = 1; c.far = 240;
  scene.add(hemi, d, d.target);
  return d;
}

/* ---------- фактуры, нарисованные в коде ---------- */
const texCache = {};
function canvasTex(key, size, draw, rx = 1, ry = 1) {
  if (!texCache[key]) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 6;
    texCache[key] = t;
  }
  const t = texCache[key].clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}
let seed = 7;
const rnd = (a = 1, b) => { seed = (seed * 16807) % 2147483647; const v = (seed - 1) / 2147483646; return b === undefined ? v * a : a + v * (b - a); };
const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;

const drawWood = (base, dark) => (x, s) => {
  x.fillStyle = base; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 150; i++) {
    x.strokeStyle = dark; x.globalAlpha = rnd(.04, .22); x.lineWidth = rnd(.6, 2.6);
    let px = rnd(s); x.beginPath(); x.moveTo(px, 0);
    for (let y = 0; y <= s; y += s / 6) { px += rnd(-5, 5); x.lineTo(px, y); }
    x.stroke();
  }
  x.globalAlpha = 1;
};
function drawOSB(x, s) {
  x.fillStyle = '#c79d62'; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 1500; i++) {
    const l = rnd(14, 48), w = rnd(4, 10), a = rnd(Math.PI), g = rnd(-30, 26);
    x.save(); x.translate(rnd(s), rnd(s)); x.rotate(a);
    x.fillStyle = rgb(205 + g, 165 + g * .95, 104 + g * .8);
    x.globalAlpha = rnd(.55, 1);
    x.fillRect(-l / 2, -w / 2, l, w);
    x.restore();
  }
  x.globalAlpha = 1;
}
function drawWool(x, s) {
  x.fillStyle = '#b9a56b'; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 1900; i++) {
    const g = rnd(-34, 34);
    x.strokeStyle = rgb(186 + g, 166 + g, 106 + g * .8);
    x.globalAlpha = rnd(.25, .8); x.lineWidth = rnd(.5, 1.5);
    const px = rnd(s), py = rnd(s), l = rnd(8, 26), a = rnd(-.7, .7);
    x.beginPath(); x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(a) * l * .5 + rnd(-6, 6), py + Math.sin(a) * l * .5 + rnd(-6, 6), px + Math.cos(a) * l, py + Math.sin(a) * l);
    x.stroke();
  }
  x.globalAlpha = 1;
}
function drawProf(x, s) {
  x.fillStyle = '#26282b'; x.fillRect(0, 0, s, s);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const px = i / n * s;
    x.fillStyle = '#16171a'; x.fillRect(px, 0, s / n * .16, s);
    x.fillStyle = '#34373b'; x.fillRect(px + s / n * .16, 0, s / n * .06, s);
  }
}
const woodMat = (rx = 1, ry = 1, base = '#d8ad6d', dark = '#8b5f2c') => new THREE.MeshStandardMaterial({ map: canvasTex('wood' + base, 512, drawWood(base, dark), rx, ry), roughness: .78 });

/* ---------- сборка геометрии ---------- */
function merge(parts) {
  const pos = [], nor = [], uv = [];
  parts.forEach(g => {
    const n = g.index ? g.toNonIndexed() : g;
    pos.push(...n.attributes.position.array);
    nor.push(...n.attributes.normal.array);
    uv.push(...n.attributes.uv.array);
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}
const box = (w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx || ry || rz) g.rotateX(rx), g.rotateY(ry), g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
};

/* ---------- макет посёлка ---------- */
const SIZES = {
  'house-5x6': [5, 6, 2.7], 'house-5x12': [5, 12.2, 2.7], 'bath-2x6': [2.6, 6, 2.4], 'bath-5x6': [5, 6, 2.6], 'bath-5x8': [4.9, 7.7, 2.6],
};
function barn(key) {
  const [w, l, h] = SIZES[key];
  const rh = w * .36;
  const profile = new THREE.Shape([[-w / 2, 0], [w / 2, 0], [w / 2, h], [0, h + rh], [-w / 2, h]].map(p => new THREE.Vector2(...p)));
  const body = new THREE.ExtrudeGeometry(profile, { depth: l, bevelEnabled: false });
  body.translate(0, 0, -l / 2);
  const sl = Math.hypot(w / 2, rh), ang = Math.atan2(rh, w / 2), t = .14, ov = .22;
  const roofs = merge([
    box(sl + .28, t, l + ov * 2, -w / 4 - .05, h + rh / 2 + .1, 0, 0, 0, ang),
    box(sl + .28, t, l + ov * 2, w / 4 + .05, h + rh / 2 + .1, 0, 0, 0, -ang),
  ]);
  const zf = l / 2 + .03;
  const capF = new THREE.ShapeGeometry(profile); capF.translate(0, 0, zf);
  const capB = new THREE.ShapeGeometry(profile); capB.rotateY(Math.PI); capB.translate(0, 0, -zf);
  // Масштаб фактуры: развёртка по метрам
  [capF, capB].forEach(g => { const u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) / 2.2, u.getY(i) / 2.2); });
  const deckD = Math.min(2, w * .42);
  const wood = merge([capF, capB, box(w * .92, .16, deckD, 0, .2, zf + deckD / 2 - .02), box(w * .4, .1, .5, 0, .08, zf + deckD + .22)]);
  const winW = w > 3 ? 1.02 : .78, winH = h + .1;
  const glass = [
    box(winW, winH - .35, .05, -winW * .72, winH / 2 + .18, zf + .02),
    box(winW, winH - .35, .05, winW * .72, winH / 2 + .18, zf + .02),
  ];
  const nSide = Math.max(1, Math.round(l / 3.6));
  for (let i = 0; i < nSide; i++) {
    const z = -l / 2 + (i + .5) * l / nSide;
    glass.push(box(.05, 1.2, 1.5, w / 2 + .03, 1.55, z));
    glass.push(box(.05, 1.2, 1.5, -w / 2 - .03, 1.55, z));
  }
  return { body, roofs, wood, glass: merge(glass), l, w };
}
const barnCache = {};
const getBarn = key => (barnCache[key] ||= barn(key));

export function mountVillage(canvas, { spots = [], shiftX = 0, shiftY = 0, wf = 1, hf = 1, count = 12, pattern = ['house-5x6'], interactive = true } = {}) {
  const st = new Stage(canvas, { ortho: true });
  const { scene, camera } = st;
  const d = sun(scene, { size: 90 });
  const root = new THREE.Group();
  scene.add(root);
  scene.add(d.target);

  const mats = {
    body: new THREE.MeshStandardMaterial({ map: canvasTex('prof', 256, drawProf, .35, .35), roughness: .62, metalness: .12 }),
    roofs: new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: .55, metalness: .2 }),
    wood: woodMat(1, 1),
    glass: new THREE.MeshStandardMaterial({ color: 0x15171a, emissive: 0xffb062, emissiveIntensity: .55, roughness: .22 }),
    plot: new THREE.MeshStandardMaterial({ color: 0xcfc7b9, roughness: .95 }),
    path: new THREE.MeshStandardMaterial({ color: 0xa79e8f, roughness: .9 }),
    tree: new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: .9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: .9 }),
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShadowMaterial({ opacity: .3 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.02;
  ground.receiveShadow = true;
  root.add(ground);

  const PW = 12, PL = 20, GX = 2.6, GZ = 7;
  const MAX = 60;
  const plotGeo = new THREE.BoxGeometry(PW, .3, PL); plotGeo.translate(0, -.15, 0);
  const plotMesh = new THREE.InstancedMesh(plotGeo, mats.plot, MAX);
  plotMesh.receiveShadow = true;
  const pathGeo = new THREE.BoxGeometry(1.5, .04, 7); pathGeo.translate(0, .02, 0);
  const pathMesh = new THREE.InstancedMesh(pathGeo, mats.path, MAX);
  pathMesh.receiveShadow = true;
  const treeGeo = merge([new THREE.IcosahedronGeometry(1.15, 1).translate(0, 2.7, 0), new THREE.IcosahedronGeometry(.8, 1).translate(.7, 1.9, .2)]);
  const trunkGeo = new THREE.CylinderGeometry(.07, .1, 2, 6); trunkGeo.translate(0, 1, 0);
  const treeMesh = new THREE.InstancedMesh(treeGeo, mats.tree, MAX * 2);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, mats.trunk, MAX * 2);
  treeMesh.castShadow = true; trunkMesh.castShadow = true;
  root.add(plotMesh, pathMesh, treeMesh, trunkMesh);

  // Для каждого типа дома свои инстансы
  const inst = {};
  Object.keys(SIZES).forEach(key => {
    const b = getBarn(key);
    inst[key] = ['body', 'roofs', 'wood', 'glass'].map(part => {
      const m = new THREE.InstancedMesh(b[part], mats[part], MAX);
      m.castShadow = part !== 'glass';
      m.receiveShadow = part !== 'glass';
      m.frustumCulled = false;
      m.count = 0;
      root.add(m);
      return m;
    });
  });
  plotMesh.frustumCulled = pathMesh.frustumCulled = treeMesh.frustumCulled = trunkMesh.frustumCulled = false;

  let plots = [];
  let cols = 1, rows = 1;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  const Yup = new THREE.Vector3(0, 1, 0);

  function arrange(n, pat) {
    cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.1)));
    rows = Math.ceil(n / cols);
    const list = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
      const x = (c - (inRow - 1) / 2) * (PW + GX);
      const z = (r - (rows - 1) / 2) * (PL + GZ);
      const flip = r % 2 === 1;
      list.push({ x, z, flip, key: pat[i % pat.length], t: plots[i]?.t ?? 0, delay: plots[i] ? 0 : i * .045 + rnd(.05) });
    }
    plots = list;
    return Math.max(cols * (PW + GX), rows * (PL + GZ));
  }

  // Изометрический кадр
  let view = 30, viewTarget = 30, center = new THREE.Vector3();
  const dir = new THREE.Vector3(1, 1.02, 1).normalize();
  function frameCam() {
    const w = st.w, h = st.h, aspect = w / h;
    const hh = view, hw = hh * aspect;
    camera.left = -hw * (1 + 2 * shiftX);
    camera.right = hw * (1 - 2 * shiftX);
    camera.top = hh * (1 - 2 * shiftY);
    camera.bottom = -hh * (1 + 2 * shiftY);
    camera.position.copy(center).addScaledVector(dir, 220);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }
  function fit() {
    const aspect = st.w / st.h;
    // Описывающие размеры кластера в плоскости камеры
    const w = cols * (PW + GX), l = rows * (PL + GZ);
    const across = (w + l) * .7071;
    const up = (w + l) * .7071 * .6 + 8;
    viewTarget = Math.max(up / (2 * hf), across / (2 * aspect * wf));
  }

  function writeInstances() {
    const counts = {};
    Object.keys(inst).forEach(k => { counts[k] = 0; });
    let nTree = 0;
    plots.forEach((p, i) => {
      const e = outCubic(clamp(p.t));
      const key = p.key;
      const yaw = p.flip ? Math.PI : 0;
      Q.setFromAxisAngle(Yup, yaw);
      const b = getBarn(key);
      // Дом опускается на участок, как с манипулятора
      const drop = (1 - e) * 26;
      const sc = e < .01 ? .0001 : 1;
      const zOff = (p.flip ? 1 : -1) * 0;
      P.set(p.x, drop, p.z + zOff); S.set(sc, sc, sc);
      M.compose(P, Q, S);
      const n = counts[key]++;
      inst[key].forEach(m => m.setMatrixAt(n, M));
      // Участок и дорожка
      const pe = smooth(clamp(p.t * 3));
      P.set(p.x, (pe - 1) * .4, p.z); S.set(pe < .01 ? .0001 : 1, 1, pe < .01 ? .0001 : 1);
      M.compose(P, new THREE.Quaternion(), S);
      plotMesh.setMatrixAt(i, M);
      const dz = (b.l / 2 + 2.6 + 3.5) * (p.flip ? -1 : 1);
      P.set(p.x, 0, p.z + dz > 0 ? p.z + Math.min(dz, PL / 2 - 3.2) : p.z + Math.max(dz, -PL / 2 + 3.2));
      S.set(sc, 1, sc);
      M.compose(P, new THREE.Quaternion(), S);
      pathMesh.setMatrixAt(i, M);
      // Деревья
      [[-PW / 2 + 1.2, -PL / 2 + 1.6], [PW / 2 - 1.2, PL / 2 - 1.8]].forEach(([tx, tz], k) => {
        const ts = smooth(clamp(p.t * 2 - .5)) * (k ? .86 : 1.08);
        P.set(p.x + tx, 0, p.z + tz); S.set(Math.max(ts, .0001), Math.max(ts, .0001), Math.max(ts, .0001));
        M.compose(P, new THREE.Quaternion(), S);
        treeMesh.setMatrixAt(nTree, M);
        trunkMesh.setMatrixAt(nTree, M);
        nTree++;
      });
    });
    Object.keys(inst).forEach(k => inst[k].forEach(m => { m.count = counts[k]; m.instanceMatrix.needsUpdate = true; }));
    plotMesh.count = pathMesh.count = plots.length;
    treeMesh.count = trunkMesh.count = nTree;
    plotMesh.instanceMatrix.needsUpdate = pathMesh.instanceMatrix.needsUpdate = treeMesh.instanceMatrix.needsUpdate = trunkMesh.instanceMatrix.needsUpdate = true;
  }

  // Метки на макете
  const spotPoint = i => {
    const p = plots[i];
    if (!p) return null;
    const [w, , h] = SIZES[p.key];
    return new THREE.Vector3(p.x, h + w * .36 + 1.4, p.z);
  };
  st.onFrame = () => {
    spots.forEach((el, i) => {
      const pt = spotPoint(i);
      if (!pt || plots[i].t < .9) return;
      const s = st.project(root.localToWorld(pt));
      const onScreen = s.x > 20 && s.x < st.w - 40 && s.y > 60;
      el.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) translate(-.4em,-50%)`;
      el.classList.toggle('on', onScreen);
    });
  };

  let px = 0, py = 0, pxT = 0, pyT = 0;
  if (interactive && !phone()) {
    addEventListener('pointermove', e => {
      pxT = (e.clientX / innerWidth - .5);
      pyT = (e.clientY / innerHeight - .5);
    }, { passive: true });
  }
  st.animating = (dt, t) => {
    let busy = false;
    plots.forEach(p => {
      if (p.t < 1) {
        if (p.delay > 0) p.delay -= dt; else p.t = Math.min(1, p.t + dt / .95);
        busy = true;
      }
    });
    if (busy) writeInstances();
    if (Math.abs(view - viewTarget) > .01) { view = lerp(view, viewTarget, .09); busy = true; frameCam(); }
    px = lerp(px, pxT, .05); py = lerp(py, pyT, .05);
    if (interactive && !phone() && !st.slow) {
      root.rotation.y = px * .1 + Math.sin(t * .22) * .012;
      root.position.y = -py * 1.2;
      busy = true;
    }
    if (busy) st.dirty = true;
    return busy;
  };
  st.onResize = () => { fit(); view = viewTarget; frameCam(); };

  function setVillage(n, key) {
    arrange(n, key ? [key] : pattern);
    fit();
    st.dirty = true;
    writeInstances();
  }
  setVillage(count);
  view = viewTarget;
  // Свет следует за кластером
  st.onResize(st.w, st.h);
  st.warm();
  st.start();
  return { setVillage };
}

/* ---------- панель по слоям ---------- */
const W = 1.25, H = 2.5, T = .145, B = .035;

function buildPanel() {
  const group = new THREE.Group();
  const frameMat = woodMat(.4, 1.4);
  const boardMat = woodMat(1.1, 1, '#cf8f4d', '#7a4c1f');
  const osbMat = new THREE.MeshStandardMaterial({ map: canvasTex('osb', 768, drawOSB, 1, 2), roughness: .82 });
  const woolMat = new THREE.MeshStandardMaterial({ map: canvasTex('wool', 512, drawWool, 1, 2), roughness: 1 });
  const memMat = new THREE.MeshStandardMaterial({ color: 0x84878c, roughness: .45, metalness: .1 });
  const add = (parent, geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const layer = (name, ...meshes) => { const g = new THREE.Group(); g.name = name; group.add(g); meshes.forEach(([geo, mat]) => add(g, geo, mat)); return g; };

  // Паз 30 мм сверху и снизу: каркас короче обшивки
  const fh = 2.44, ow = W;
  const frame = layer('frame',
    [box(.035, fh, T, -ow / 2 + .0175, 0, 0), frameMat],
    [box(.035, fh, T, ow / 2 - .0175, 0, 0), frameMat],
    [box(.035, fh, T, 0, 0, 0), frameMat],
    [box(ow, .035, T, 0, fh / 2 - .0175, 0), frameMat],
    [box(ow, .035, T, 0, -fh / 2 + .0175, 0), frameMat],
    [box(ow, .035, T, 0, 0, 0), frameMat],
  );
  const cw = ow / 2 - .035, ch = fh / 2 - .035;
  const wool = layer('wool', ...[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => [box(cw - .006, ch - .006, T * .96, sx * ow / 4, sy * fh / 4, 0), woolMat]));
  const mem = layer('membrane', [box(ow - .02, H - .04, .004, 0, 0, 0), memMat]);
  const osb = layer('osb', [box(ow, H, .012, .02, 0, 0), osbMat]); // смещение OSB на 20 мм
  const planks = [];
  const n = 20, ph = H / n;
  for (let i = 0; i < n; i++) planks.push([box(ow - .004, ph - .006, .022, 0, -H / 2 + ph * (i + .5), 0), boardMat]);
  const finish = layer('finish', ...planks);

  return { group, frame, wool, mem, osb, finish };
}

export function mountPanel(canvas, { pin, onStep } = {}) {
  const st = new Stage(canvas, { fov: 24 });
  const { scene, camera } = st;
  const d = sun(scene, { x: -5, y: 8, z: 7, size: 5, intensity: 3 });
  d.target.position.set(0, 0, 0);
  const fill = new THREE.DirectionalLight(0xffc98d, .9); fill.position.set(6, 2, -3); scene.add(fill);
  const root = new THREE.Group();
  scene.add(root);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .42 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -H / 2 - .02; ground.receiveShadow = true;
  scene.add(ground);

  const A = buildPanel(), B2 = buildPanel();
  B2.finish.position.z = .094; B2.mem.position.z = .074; B2.osb.position.z = -.08;
  root.add(A.group);
  root.add(B2.group);
  B2.group.visible = false;
  const plateMat = new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: .25, roughness: .5 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + .3, .05, T - .01), plateMat);
  plate.castShadow = true; plate.visible = false;
  root.add(plate);
  // Стык панелей: шип OSB заходит в паз соседней панели
  const seam = new THREE.Mesh(new THREE.BoxGeometry(.014, H + .002, T + .05), new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: .55, roughness: .5 }));
  seam.visible = false;
  root.add(seam);

  // Порядок снаружи внутрь: отделка, мембрана, базальт, каркас, OSB
  const order = [A.finish, A.mem, A.wool, A.frame, A.osb];
  const zAt = { finish: .094, membrane: .074, wool: 0, frame: 0, osb: -.08 };
  const spreads = { finish: 2, membrane: 1, wool: .35, frame: -.35, osb: -1.35 };
  const steps = [
    { layer: A.frame, label: 'Доска 35×95/145/195 мм', spot: [-W / 2, H / 2, T / 2] },
    { layer: A.wool, label: 'Базальт 100–200 мм', spot: [W / 4, H / 4, T / 2] },
    { layer: A.mem, label: 'Пароизоляция', spot: [-W / 2, H / 2 - .1, 0] },
    { layer: A.osb, label: 'OSB-3, 9 или 12 мм', spot: [W / 2, H / 2 - .05, 0] },
    { layer: A.finish, label: 'Вагонка, профлист, имитация бруса', spot: [W / 2, H / 2 - .05, 0] },
  ];
  // Держим материалы для подсветки активного слоя
  const glow = (g, v) => g.traverse(o => { if (o.material?.emissive) { o.material.emissive.setHex(AMBER); o.material.emissiveIntensity = v; } });

  let p = 0, pTarget = 0, lastStep = -1;
  const pv = new THREE.Vector3();
  const isP = () => st.w / st.h < .9;

  function pose() {
    const a = smooth(seg(p, .02, .16));          // разлёт
    const c = smooth(seg(p, .8, .92));           // обратная сборка
    const spread = (isP() ? .36 : .5) * a * (1 - c);
    const k = Math.min(5, Math.floor(seg(p, .14, .8) * 5));
    const active = p > .8 ? 5 : k;
    if (active !== lastStep) {
      lastStep = active;
      const lbl = active < 5 ? steps[active].label : 'Паз 30 мм, смещение OSB 20 мм';
      onStep?.(active, lbl);
    }
    order.forEach(g => {
      const key = g.name;
      const isA = active < 5 && steps[active].layer === g;
      g.position.z = zAt[key] + spreads[key] * spread + (isA ? 0.1 * a * (1 - c) : 0);
      glow(g, isA ? .16 : 0);
    });

    // Вторая панель въезжает, сверху ложится обвязка
    const j = smooth(seg(p, .84, .96));
    const q = smooth(seg(p, .92, 1));
    B2.group.visible = j > 0;
    const shiftAll = lerp(0, -W / 2, j);
    A.group.position.x = shiftAll;
    B2.group.position.x = shiftAll + W + lerp(1.8, .0, j);
    plate.visible = q > 0;
    plate.position.set(0, lerp(H / 2 + 1.1, H / 2 - .01, outCubic(q)), 0);
    plate.material.opacity = 1;
    seam.visible = j > .92;
    seam.position.set(0, 0, .018);

    // Камера
    const portrait = isP();
    const yaw = lerp(lerp(-.52, portrait ? -1.12 : -1.02, a), -.38, c);
    root.rotation.y = yaw + (1 - a) * Math.sin(p * 9) * .02;
    const dist = lerp(portrait ? lerp(13, 17.5, a) : lerp(8.2, 8.6, a), portrait ? 16 : 9.6, c);
    const lookX = portrait ? 0 : -1.0 * (1 - 0) * lerp(1, .9, a);
    const yOff = portrait ? .55 : .08;
    camera.position.set(lookX + (portrait ? 0 : 0), yOff + .5, dist);
    camera.lookAt(lookX, yOff, 0);
    st.dirty = true;
  }

  st.animating = () => {
    if (Math.abs(p - pTarget) > .0004) {
      p = lerp(p, pTarget, .14);
      pose();
      return true;
    }
    return false;
  };
  st.onFrame = () => {
    if (!pin) return;
    const s = steps[lastStep];
    if (!s) { pin.classList.remove('on'); return; }
    pv.set(...s.spot);
    s.layer.localToWorld(pv);
    const sc = st.project(pv);
    pin.style.transform = `translate(${sc.x.toFixed(1)}px,${sc.y.toFixed(1)}px) translate(-.38em,-50%)`;
    pin.classList.toggle('on', p > .14);
  };
  st.onResize = () => { pose(); };
  pose();
  st.warm();
  st.start();
  return { setProgress(v) { pTarget = v; st.start(); } };
}

/* ---------- сборка дома ---------- */
export function mountAssembly(canvas, { onStep } = {}) {
  const st = new Stage(canvas, { fov: 24 });
  const { scene, camera } = st;
  const d = sun(scene, { x: -14, y: 20, z: 16, size: 14, intensity: 3 });
  const fill = new THREE.DirectionalLight(0xffc98d, .7); fill.position.set(12, 5, -8); scene.add(fill);
  const root = new THREE.Group();
  scene.add(root);

  const L = 10, Wd = 8, HW = 2.5, base = .55;
  const groundM = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x3a3733, roughness: 1 }));
  groundM.rotation.x = -Math.PI / 2; groundM.receiveShadow = true; root.add(groundM);

  const frameMat = woodMat(.3, 2);
  const beamMat = woodMat(2, .3);
  const osbMat = new THREE.MeshStandardMaterial({ map: canvasTex('osb', 768, drawOSB, 1, 2), roughness: .82 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8b8e92, roughness: .45, metalness: .6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: .55, metalness: .25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x15171a, emissive: 0xffb062, emissiveIntensity: 0, roughness: .2 });
  const profMat = new THREE.MeshStandardMaterial({ map: canvasTex('prof', 256, drawProf, 2.2, 1), roughness: .6, metalness: .12, transparent: true, opacity: 0 });

  const parts = [];
  const add = (geo, mat, stage, order = 0, from = [0, 7, 0]) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    parts.push({ m, stage, order, from, to: m.position.clone() });
    m.visible = false;
    return m;
  };

  // 0. Сваи и обвязка
  let o = 0;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 3; j++) {
    const g = new THREE.CylinderGeometry(.06, .06, base, 8);
    g.translate(-L / 2 + i * L / 4, base / 2, -Wd / 2 + j * Wd / 3);
    add(g, steel, 0, o++ * .6, [0, -base - .1, 0]);
  }
  const by = base + .1;
  add(box(L, .2, .15, 0, by, -Wd / 2 + .075), beamMat, 0, 20);
  add(box(L, .2, .15, 0, by, Wd / 2 - .075), beamMat, 0, 21);
  for (let i = 0; i <= 8; i++) add(box(.1, .2, Wd - .3, -L / 2 + .05 + i * (L - .1) / 8, by, 0), frameMat, 0, 22 + i * .5);
  add(box(L, .03, Wd, 0, by + .115, 0), osbMat, 0, 28);

  // 1. Панели стен, по кругу от угла
  const y0 = by + .13;
  const panel = (x, z, rot, type) => {
    const w = 1.25 - .012, t = .145;
    const geos = [];
    if (type === 'wall') geos.push([box(w, HW, t), osbMat]);
    if (type === 'win') { geos.push([box(w, .9, t, 0, -HW / 2 + .45, 0), osbMat]); geos.push([box(w, .35, t, 0, HW / 2 - .175, 0), osbMat]); geos.push([box(w, HW - .9 - .35, .05, 0, -HW / 2 + .9 + (HW - 1.25) / 2, 0), glassMat]); }
    if (type === 'door') { geos.push([box(w, .35, t, 0, HW / 2 - .175, 0), osbMat]); geos.push([box(w, HW - .35, .05, 0, -.175, 0), glassMat]); }
    return geos.map(([g, m]) => { const c = g.clone(); c.rotateY(rot); c.translate(x, y0 + HW / 2, z); return [c, m]; });
  };
  const sequence = [];
  const n10 = 8, n8 = 6;
  const typesFront = ['wall', 'win', 'win', 'wall', 'door', 'wall', 'win', 'wall'];
  const typesSide = ['wall', 'win', 'wall', 'wall', 'win', 'wall'];
  const typesBack = ['wall', 'win', 'wall', 'wall', 'wall', 'win', 'win', 'wall'];
  for (let i = 0; i < n10; i++) sequence.push(panel(-L / 2 + (i + .5) * L / n10, Wd / 2 - .0725, 0, typesFront[i]));
  for (let i = 0; i < n8; i++) sequence.push(panel(L / 2 - .0725, Wd / 2 - (i + .5) * Wd / n8, Math.PI / 2, typesSide[i]));
  for (let i = 0; i < n10; i++) sequence.push(panel(L / 2 - (i + .5) * L / n10, -Wd / 2 + .0725, 0, typesBack[i]));
  for (let i = 0; i < n8; i++) sequence.push(panel(-L / 2 + .0725, -Wd / 2 + (i + .5) * Wd / n8, Math.PI / 2, typesSide[i]));
  const facadeTargets = [];
  sequence.forEach((list, i) => list.forEach(([g, m]) => { const part = add(g, m, 1, i, [0, 3.2, 0]); if (m === osbMat) facadeTargets.push(part); }));

  // 2. Верхняя обвязка и перекрытие
  const yt = y0 + HW + .05;
  add(box(L, .1, .145, 0, yt, Wd / 2 - .0725), beamMat, 2, 0);
  add(box(L, .1, .145, 0, yt, -Wd / 2 + .0725), beamMat, 2, 1);
  add(box(.145, .1, Wd, L / 2 - .0725, yt, 0), frameMat, 2, 2);
  add(box(.145, .1, Wd, -L / 2 + .0725, yt, 0), frameMat, 2, 3);
  for (let i = 1; i < 10; i++) add(box(.06, .16, Wd - .25, -L / 2 + i * L / 10, yt + .1, 0), frameMat, 2, 4 + i);

  // 3. Стропильные фермы
  const rh = 2, ov = .45;
  const sl = Math.hypot(Wd / 2 + ov, rh * (Wd / 2 + ov) / (Wd / 2));
  const ang = Math.atan2(rh, Wd / 2);
  const baseY = yt + .05;
  const trussGeo = merge([
    box(Wd + ov * 2, .1, .05, 0, baseY + .03, 0),
    box(sl, .1, .05, -(Wd / 2 + ov) / 2, baseY + rh * (1 - ov / (Wd / 2)) / 2 + rh * ov / (Wd / 2) * 0, 0, 0, 0, ang),
    box(sl, .1, .05, (Wd / 2 + ov) / 2, baseY + rh * (1 - ov / (Wd / 2)) / 2, 0, 0, 0, -ang),
    box(.06, rh * .95, .05, 0, baseY + rh * .48, 0),
    box(Math.hypot(Wd / 4, rh / 2), .07, .05, -Wd / 8, baseY + rh / 4, 0, 0, 0, -Math.atan2(rh / 2, Wd / 4)),
    box(Math.hypot(Wd / 4, rh / 2), .07, .05, Wd / 8, baseY + rh / 4, 0, 0, 0, Math.atan2(rh / 2, Wd / 4)),
  ]);
  trussGeo.rotateY(Math.PI / 2);
  for (let i = 0; i <= 8; i++) {
    const g = trussGeo.clone();
    g.translate(-L / 2 + .03 + i * (L - .06) / 8, 0, 0);
    add(g, frameMat, 3, i, [0, 5, 0]);
  }

  // 4. Кровля
  const roofL = L + .6;
  const strips = 8;
  for (let i = 0; i < strips; i++) {
    const seg0 = roofL / strips, x = -roofL / 2 + seg0 * (i + .5);
    const y = baseY + rh * .5 + .08;
    const gA = box(sl + .1, .06, seg0 - .006, 0, 0, 0);
    gA.rotateZ(-ang); gA.rotateY(Math.PI / 2); gA.translate(x, y, -(Wd / 2 + ov) / 2);
    const gB = box(sl + .1, .06, seg0 - .006, 0, 0, 0);
    gB.rotateZ(ang); gB.rotateY(Math.PI / 2); gB.translate(x, y, (Wd / 2 + ov) / 2);
    add(gA, roofMat, 4, i, [0, 3.2, -2]);
    add(gB, roofMat, 4, i + .5, [0, 3.2, 2]);
  }

  // Фронтоны и фасад (5)
  const gableShape = new THREE.Shape([[-Wd / 2, 0], [Wd / 2, 0], [0, rh]].map(q => new THREE.Vector2(...q)));
  const gableWood = woodMat(1, 1, '#c98f4e', '#7a4c1f');
  [-1, 1].forEach(s => {
    const g = new THREE.ShapeGeometry(gableShape);
    const u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) / 2, u.getY(i) / 2);
    g.rotateY(s * Math.PI / 2);
    g.translate(s * (L / 2 + .01), baseY + .05, 0);
    add(g, gableWood, 3, 12);
  });
  // Обшивка: снаружи тёмный профлист
  const claddings = [];
  [[L + .06, HW + .1, .02, 0, y0 + HW / 2, Wd / 2 + .012], [L + .06, HW + .1, .02, 0, y0 + HW / 2, -Wd / 2 - .012], [.02, HW + .1, Wd + .06, L / 2 + .012, y0 + HW / 2, 0], [.02, HW + .1, Wd + .06, -L / 2 - .012, y0 + HW / 2, 0]].forEach(a => {
    const m = new THREE.Mesh(box(...a), profMat);
    m.visible = false; m.castShadow = true; root.add(m); claddings.push(m);
  });
  // Окна поверх обшивки: загораются в финале
  const facadeGlass = [];
  const windowsOf = (type, x, z, rot) => {
    if (type === 'wall') return;
    const h = type === 'door' ? HW - .4 : HW - 1.3, y = type === 'door' ? y0 + (HW - .4) / 2 : y0 + .9 + h / 2;
    const m = new THREE.Mesh(box(type === 'door' ? .95 : 1, h, .03), glassMat);
    m.rotation.y = rot;
    m.position.set(x, y, z);
    m.visible = false;
    root.add(m);
    facadeGlass.push(m);
  };
  typesFront.forEach((ty, i) => windowsOf(ty, -L / 2 + (i + .5) * L / n10, Wd / 2 + .03, 0));
  typesSide.forEach((ty, i) => windowsOf(ty, L / 2 + .03, Wd / 2 - (i + .5) * Wd / n8, Math.PI / 2));
  typesBack.forEach((ty, i) => windowsOf(ty, L / 2 - (i + .5) * L / n10, -Wd / 2 - .03, 0));
  typesSide.forEach((ty, i) => windowsOf(ty, -L / 2 - .03, -Wd / 2 + (i + .5) * Wd / n8, Math.PI / 2));

  // Стадии по прокрутке
  const stages = [[.0, .16], [.16, .5], [.5, .62], [.62, .78], [.78, .9], [.9, 1]];
  const maxOrder = [0, 0, 0, 0, 0, 0];
  parts.forEach(q => { maxOrder[q.stage] = Math.max(maxOrder[q.stage], q.order); });

  let p = 0, pTarget = 0, last = -1;
  function pose() {
    const k = stages.findIndex(([a, b]) => p >= a && p < b + (b === 1 ? 1 : 0));
    const cur = k < 0 ? 5 : k;
    if (cur !== last) { last = cur; onStep?.(cur); }
    parts.forEach(q => {
      const [a, b] = stages[q.stage];
      const span = b - a;
      const startAt = a + span * .82 * (q.order / Math.max(1, maxOrder[q.stage]));
      const t = outCubic(seg(p, startAt, startAt + span * .22));
      q.m.visible = t > .001;
      q.m.position.set(q.from[0] * (1 - t), q.from[1] * (1 - t), q.from[2] * (1 - t));
    });
    const f = smooth(seg(p, .9, .985));
    profMat.opacity = f;
    claddings.forEach(c => { c.visible = f > .001; });
    facadeGlass.forEach(c => { c.visible = f > .6; });
    glassMat.emissiveIntensity = f * .05;

    // Камера облетает дом
    const portrait = st.w / st.h < .9;
    const az = lerp(.62, 1.02, smooth(p));
    const el = lerp(.5, .24, smooth(p));
    const dist = portrait ? lerp(66, 58, smooth(p)) : lerp(30, 27, smooth(p));
    const lookY = lerp(1.1, 2.2, smooth(p));
    const off = portrait ? 0 : -3.2;
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist + lookY, Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(0, lookY, 0);
    // Смещаем картинку вправо, чтобы освободить место под текст
    camera.setViewOffset(st.w, st.h, off * st.w * .03, portrait ? -st.h * .02 : -st.h * .02, st.w, st.h);
    st.dirty = true;
  }
  st.animating = () => {
    if (Math.abs(p - pTarget) > .0004) { p = lerp(p, pTarget, .14); pose(); return true; }
    return false;
  };
  st.onResize = () => pose();
  pose();
  st.warm();
  st.start();
  return { setProgress(v) { pTarget = v; st.start(); } };
}
