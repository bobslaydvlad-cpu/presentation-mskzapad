import { MODELS, KIT_TEXT, INCLUDED, UNIT_PRICE, PRICE_DATE, pace } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rub = n => n == null ? 'по запросу' : n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';

/* ---------- сцены и якоря ---------- */
const scenes = $$('.scene');
const anchors = scenes.map(s => {
  const a = document.createElement('span');
  a.className = 'scene__anchor';
  a.id = s.id;
  s.removeAttribute('id');
  s.before(a);
  return a;
});
let vh = innerHeight;

function layout() {
  vh = innerHeight;
  scenes.forEach(s => {
    s.style.setProperty('--stick', reduced ? '0px' : Math.min(0, vh - s.offsetHeight) + 'px');
  });
}

const topOf = i => anchors[i].getBoundingClientRect().top + scrollY;
function currentIndex() {
  let cur = 0;
  anchors.forEach((a, i) => { if (a.getBoundingClientRect().top <= vh * .5) cur = i; });
  return cur;
}

/* ---------- плавный переход между сценами ---------- */
let tween = 0;
function scrollToY(y, ms = 950) {
  cancelAnimationFrame(tween);
  if (reduced) { scrollTo(0, y); return; }
  const from = scrollY, d = y - from, t0 = performance.now();
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = now => {
    const t = clamp((now - t0) / ms);
    scrollTo(0, from + d * ease(t));
    if (t < 1) tween = requestAnimationFrame(step);
  };
  tween = requestAnimationFrame(step);
}
['wheel', 'touchstart', 'pointerdown'].forEach(ev => addEventListener(ev, () => cancelAnimationFrame(tween), { passive: true }));

function goTo(i) { scrollToY(topOf(clamp(i, 0, scenes.length - 1))); }

// Шаг вперёд: длинную сцену проходим по частям, короткую сразу листаем
function step(dir) {
  const i = currentIndex();
  const s = scenes[i];
  const start = topOf(i);
  const extra = s.offsetHeight - vh;
  const inside = scrollY - start;
  if (extra > 8) {
    const n = +s.dataset.steps || Math.max(1, Math.ceil(extra / (vh * .8)));
    const len = extra / n;
    if (dir > 0 && inside < extra - 8) {
      return scrollToY(start + Math.min(extra, (Math.round(inside / len) + 1) * len), s.dataset.steps ? 1100 : 750);
    }
    if (dir < 0 && inside > 8) {
      return scrollToY(start + Math.max(0, (Math.round(inside / len) - 1) * len), s.dataset.steps ? 1100 : 750);
    }
  }
  if (dir < 0 && i > 0) {
    const pExtra = scenes[i - 1].offsetHeight - vh;
    return scrollToY(topOf(i - 1) + Math.max(0, pExtra));
  }
  goTo(i + dir);
}

addEventListener('keydown', e => {
  if (menuOpen()) { if (e.key === 'Escape') closeMenu(); return; }
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.target.closest('button,a,summary,[tabindex]'))) { e.preventDefault(); step(1); }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-1); }
  if (e.key === 'Home') { e.preventDefault(); goTo(0); }
  if (e.key === 'End') { e.preventDefault(); goTo(scenes.length - 1); }
});

document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const i = anchors.findIndex(x => '#' + x.id === a.getAttribute('href'));
  if (i < 0) return;
  e.preventDefault();
  closeMenu();
  goTo(i);
});

/* ---------- док и меню-фасад ---------- */
const dock = $('.dock');
dock.hidden = false;
const mini = $('[data-mini]');
const cols = 4, rows = 3;
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const x = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  x.setAttribute('x', 7 + c * 8.8); x.setAttribute('y', 16 + r * 8.8); x.setAttribute('width', 7.6); x.setAttribute('height', 7.6);
  mini.append(x);
}
const miniCells = $$('rect', mini);
$$('[data-go]').forEach(b => b.addEventListener('click', () => step(b.dataset.go === 'next' ? 1 : -1)));

const facade = $('.facade');
const wall = $('[data-facade]');
scenes.forEach((s, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'fpanel';
  b.style.setProperty('--i', i);
  b.innerHTML = `<span>${s.dataset.short}</span>`;
  b.setAttribute('aria-label', s.dataset.title);
  b.addEventListener('click', () => { closeMenu(); goTo(i); });
  wall.append(b);
});
const panels = $$('.fpanel', wall);
const menuOpen = () => !facade.hidden;
let lastFocus = null;
function openMenu() {
  lastFocus = document.activeElement;
  facade.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  void facade.offsetWidth;
  facade.classList.add('open');
  (panels[lastIdx] || panels[0]).focus({ preventScroll: true });
}
function closeMenu() {
  if (facade.hidden) return;
  facade.classList.remove('open');
  document.documentElement.style.overflow = '';
  setTimeout(() => { facade.hidden = true; }, reduced ? 0 : 320);
  lastFocus?.focus?.({ preventScroll: true });
}
$('[data-menu-open]').addEventListener('click', openMenu);
$('[data-menu-close]').addEventListener('click', closeMenu);
facade.addEventListener('click', e => { if (e.target === facade) closeMenu(); });
facade.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const f = $$('button', facade), a = document.activeElement;
  if (e.shiftKey && a === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
});

let lastIdx = -1;
function updateDock(i) {
  if (i === lastIdx) return;
  lastIdx = i;
  $('[data-dock-count]').textContent = `${i + 1} / ${scenes.length}`;
  $('[data-dock-title]').textContent = scenes[i].dataset.title;
  miniCells.forEach((c, k) => c.classList.toggle('on', k <= i));
  panels.forEach((p, k) => { p.classList.toggle('on', k === i); p.classList.toggle('done', k < i); });
}

/* ---------- кадр прокрутки ---------- */
const pinHandlers = new Map();
let ticking = false;
function frame() {
  ticking = false;
  const count = scenes.length;
  for (let i = 0; i < count; i++) {
    const s = scenes[i], r = s.getBoundingClientRect();
    const nx = i < count - 1 ? anchors[i + 1].getBoundingClientRect().top : Infinity;
    if (!reduced) {
      const o = clamp((vh - nx) / vh);
      const cur = +s.dataset.o || 0;
      if (Math.abs(cur - o) > .001) {
        s.dataset.o = o;
        s.style.setProperty('--dim', (o * .62).toFixed(3));
        s.style.setProperty('--sc', (1 - o * .045).toFixed(4));
        s.style.willChange = o > 0 && o < 1 ? 'transform' : 'auto';
      }
    }
    const h = pinHandlers.get(s);
    if (h) {
      const start = anchors[i].getBoundingClientRect().top;
      h(clamp(-start / Math.max(1, s.offsetHeight - vh)), r);
    }
  }
  updateDock(currentIndex());
}
// На телефоне шапка уходит при прокрутке вниз, чтобы не закрывать текст
const topBar = $('.top');
let lastY = scrollY;
function headerAway() {
  const y = scrollY, d = y - lastY;
  if (Math.abs(d) < 6) return;
  topBar.classList.toggle('is-away', innerWidth <= 760 && d > 0 && y > 40);
  lastY = y;
}
const onScroll = () => { headerAway(); if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { layout(); onScroll(); }, { passive: true });

/* ---------- заголовки по словам и появление ---------- */
$$('.split').forEach(el => {
  let n = 0;
  el.innerHTML = el.textContent.trim().split(/ +/).map(w => `<span class="w"><span style="--i:${n++}">${w}</span></span>`).join(' ');
});
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12 });
function watch(root = document) {
  $$('[data-r],[data-mount],.split', root).forEach(el => {
    if (el.dataset.seen) return;
    el.dataset.seen = 1;
    const sibs = el.parentElement ? [...el.parentElement.children].filter(c => c.matches('[data-r],[data-mount]')) : [];
    const k = sibs.indexOf(el);
    if (k > 0) el.style.setProperty('--d', k * (el.matches('[data-mount]') ? 90 : 80) + 'ms');
    io.observe(el);
  });
}

/* ---------- ролик короткий: плавный проход камеры при входе в сцену, затем стоп-кадр ---------- */
$$('video[data-once]').forEach(v => {
  if (reduced) return;
  new IntersectionObserver(es => {
    if (es[0].isIntersecting) {
      v.currentTime = 0;
      v.playbackRate = .3;
      v.play().catch(() => {});
    }
  }, { threshold: .35 }).observe(v);
});

/* ---------- стена портфолио ---------- */
$$('[data-wall]').forEach(w => {
  const open = p => { $$('.pane', w).forEach(x => x.classList.toggle('is-open', x === p)); };
  $$('.pane', w).forEach(p => {
    p.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') open(p); });
    p.addEventListener('focus', () => open(p));
    p.addEventListener('click', () => open(p));
  });
});

/* ---------- каталог ---------- */
function planSVG(p) {
  const fs = p.w > 900 ? 32 : 19, pad = fs * 3, ew = p.w > 900 ? 14 : 11, iw = p.w > 900 ? 8 : 6;
  const H = p.h + (p.extra || 0);
  const INK = '#F3ECDF', AM = '#F2A62B', DIM = 'rgba(243,236,223,.55)';
  const g = [`<rect width="${p.w}" height="${p.h}" fill="#26282b"/>`];
  if (p.porch) { const [x, y, w, h] = p.porch; g.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${DIM}" stroke-width="${iw / 2}" stroke-dasharray="${iw * 1.4} ${iw}"/>`); }
  p.walls.forEach(w => g.push(`<line x1="${w[0]}" y1="${w[1]}" x2="${w[2]}" y2="${w[3]}" stroke="${INK}" stroke-width="${iw}" stroke-linecap="square"/>`));
  g.push(`<rect width="${p.w}" height="${p.h}" fill="none" stroke="${INK}" stroke-width="${ew}"/>`);
  const seg = (s, a, b) => s === 't' ? [a, -ew / 2, b - a, ew] : s === 'b' ? [a, p.h - ew / 2, b - a, ew] : s === 'l' ? [-ew / 2, a, ew, b - a] : [p.w - ew / 2, a, ew, b - a];
  p.win.forEach(([s, a, b]) => {
    const [x, y, w, h] = seg(s, a, b);
    g.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${AM}"/>`);
  });
  p.door.forEach(([s, a, b]) => {
    const [x, y, w, h] = seg(s, a, b), r = b - a;
    g.push(`<rect x="${x}" y="${y - 1}" width="${w}" height="${h + 2}" fill="#26282b"/>`);
    g.push(`<line x1="${a}" y1="${p.h}" x2="${a}" y2="${p.h - r}" stroke="${INK}" stroke-width="2.5"/><path d="M${a} ${p.h - r}A${r} ${r} 0 0 1 ${b} ${p.h}" fill="none" stroke="${DIM}" stroke-width="1.5" stroke-dasharray="5 4"/>`);
  });
  p.labels.forEach(([x, y, t, a]) => {
    const small = t === 'Крыльцо' || t === 'Душ';
    g.push(`<text x="${x}" y="${y}" text-anchor="middle" font-family="Geologica,sans-serif" font-weight="400" font-size="${small ? fs * .82 : fs}" fill="${INK}">${t}</text>`);
    if (a) g.push(`<text x="${x}" y="${y + fs * 1.15}" text-anchor="middle" font-family="Geologica,sans-serif" font-weight="300" font-size="${fs * .84}" fill="${AM}">${a}</text>`);
  });
  const dy = -pad * .55, dx = -pad * .55, t = fs * .35;
  g.push(`<g stroke="${DIM}" stroke-width="1.5"><line x1="0" y1="${dy}" x2="${p.w}" y2="${dy}"/><line x1="0" y1="${dy - t}" x2="0" y2="${dy + t}"/><line x1="${p.w}" y1="${dy - t}" x2="${p.w}" y2="${dy + t}"/><line x1="${dx}" y1="0" x2="${dx}" y2="${p.h}"/><line x1="${dx - t}" y1="0" x2="${dx + t}" y2="0"/><line x1="${dx - t}" y1="${p.h}" x2="${dx + t}" y2="${p.h}"/></g>`);
  g.push(`<text x="${p.w / 2}" y="${dy - fs * .45}" text-anchor="middle" font-family="Geologica,sans-serif" font-size="${fs * .8}" fill="${DIM}">${p.dims[0]}</text>`);
  g.push(`<text transform="translate(${dx - fs * .45} ${p.h / 2}) rotate(-90)" text-anchor="middle" font-family="Geologica,sans-serif" font-size="${fs * .8}" fill="${DIM}">${p.dims[1]}</text>`);
  return `<svg viewBox="${-pad} ${-pad} ${p.w + pad * 1.6} ${H + pad * 1.5}" role="img" aria-label="Схема планировки">${g.join('')}</svg>`;
}

const img = (name, alt = '', cls = '') => `<img class="${cls}" loading="lazy" decoding="async" src="assets/img/${name}-860.webp" srcset="assets/img/${name}-860.webp 860w, assets/img/${name}.webp 1680w" sizes="100vw" alt="${alt}">`;

function buildCatalog(root) {
  const group = root.dataset.catalog;
  const ids = Object.keys(MODELS).filter(id => MODELS[id].group === group);
  const isBath = group === 'baths';
  const title = isBath ? 'Каталог бань' : 'Каталог домов';
  const S = { id: ids[0], view: 'ext', kit: 'turnkey', stove: 'electric', steam: 'Русская баня', firing: 'Изнутри', finish: 'Стандарт' };

  root.innerHTML = `
    <div class="catalog__media" data-media></div>
    <div class="catalog__plan" data-plan></div>
    <div class="catalog__ui">
      <div class="catalog__head">
        <h2 class="split">${title}</h2>
        <div class="chips" data-models>${ids.map(id => `<button class="chip" type="button" data-id="${id}">${MODELS[id].name}</button>`).join('')}</div>
        <div class="thumbs" data-thumbs></div>
      </div>
      <div class="card glass" data-card></div>
    </div>`;
  const media = $('[data-media]', root), plan = $('[data-plan]', root), thumbs = $('[data-thumbs]', root), card = $('[data-card]', root);

  const priceOf = (m, kit) => {
    const p = m.prices?.[kit];
    if (p == null) return null;
    return typeof p === 'number' ? p : p[S.stove];
  };
  const chips = (name, label, opts, val, dis = () => false) => `
    <div class="opt"><span>${label}</span><div class="chips">${opts.map(([v, t]) => `<button class="chip" type="button" data-set="${name}" data-val="${v}" aria-pressed="${v === val}" ${dis(v) ? 'disabled' : ''}>${t}</button>`).join('')}</div></div>`;

  function renderCard() {
    const m = MODELS[S.id];
    if (m.prices && priceOf(m, 'basic') == null && S.kit === 'basic') S.kit = 'turnkey';
    const price = priceOf(m, S.kit);
    const basicOk = m.prices && m.prices.basic != null;
    const rows = INCLUDED[group];
    const col = S.kit === 'turnkey' ? 1 : 2;
    card.innerHTML = `
      <div><h3>${m.name}</h3><p class="card__meta">${m.area} · ${m.size} · ${m.fit}</p></div>
      <p class="card__lead">${m.lead}</p>
      <div><div class="card__price">${price == null ? 'Цена по запросу' : 'от ' + rub(price)}</div>
        <p class="card__kit">${m.prices ? KIT_TEXT[group][S.kit] : 'Назовём точную стоимость в расчёте.'}</p></div>
      ${m.prices ? chips('kit', 'Комплектация', [['turnkey', 'Под ключ'], ['basic', 'Без инженерии']], S.kit, v => v === 'basic' && !basicOk) : ''}
      ${isBath ? chips('stove', 'Печь', [['electric', 'Электрическая'], ['wood', 'Дровяная']], S.stove) : ''}
      ${isBath ? chips('steam', 'Парная', [['Русская баня', 'Русская баня'], ['Финская сауна', 'Финская сауна']], S.steam) : ''}
      ${isBath && S.stove === 'wood' ? chips('firing', 'Растопка', [['Изнутри', 'Изнутри'], ['Снаружи', 'Снаружи']], S.firing) : ''}
      ${isBath ? chips('finish', 'Отделка парной', [['Стандарт', 'Стандарт'], ['Премиум', 'Премиум, по запросу']], S.finish) : ''}
      <details><summary>Что входит</summary><ul>${rows.map(r => `<li class="${r[col] ? 'yes' : 'no'}">${r[0]}</li>`).join('')}
        <li>Сваи ${m.foundation ? `(${m.foundation[1]}): +${rub(m.foundation[0])}` : 'считаем под модуль'}</li>
        <li>Доставку и монтаж считаем по адресу участка</li></ul></details>
      <p class="card__note">${m.term}. Гарантия 30 лет. Цены по прайсу от ${PRICE_DATE}. Изображения: визуализация.</p>
      <a class="joint" href="#request" data-order="${m.name}"><span class="joint__plate">Запросить расчёт</span><span class="joint__tenon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6"/></svg></span></a>`;
  }

  function renderMedia() {
    const m = MODELS[S.id];
    const frames = [m.ext, ...m.interiors];
    media.innerHTML = frames.map(n => img(n, `${m.name}: изображение модели`)).join('');
    plan.innerHTML = planSVG(m.plan);
    thumbs.innerHTML = frames.map((n, i) => `<button class="thumb" type="button" data-view="${i}" aria-label="${i ? 'Интерьер ' + i : 'Фасад'}"><img loading="lazy" src="assets/img/${n}-860.webp" alt=""></button>`).join('')
      + `<button class="thumb thumb--plan" type="button" data-view="plan" aria-label="Планировка">План</button>`;
    S.view = 0;
    renderView();
  }

  function renderView() {
    const imgs = $$('img', media);
    imgs.forEach((im, i) => { im.classList.toggle('on', i === S.view); });
    const cur = imgs[S.view];
    if (cur) { cur.loading = 'eager'; }
    plan.classList.toggle('on', S.view === 'plan');
    root.classList.toggle('is-plan', S.view === 'plan');
    $$('.thumb', thumbs).forEach(t => t.setAttribute('aria-current', String(t.dataset.view === String(S.view))));
    $$('[data-models] .chip', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === S.id)));
  }

  root.addEventListener('click', e => {
    const m = e.target.closest('[data-id]');
    if (m) { S.id = m.dataset.id; renderCard(); renderMedia(); layout(); return; }
    const v = e.target.closest('[data-view]');
    if (v) { S.view = v.dataset.view === 'plan' ? 'plan' : +v.dataset.view; renderView(); layout(); return; }
    const c = e.target.closest('[data-set]');
    if (c && !c.disabled) { S[c.dataset.set] = c.dataset.val; renderCard(); layout(); return; }
    const o = e.target.closest('[data-order]');
    if (o) setRequest(o.dataset.order);
  });
  card.addEventListener('toggle', () => layout(), true);

  renderCard();
  renderMedia();
}
$$('[data-catalog]').forEach(buildCatalog);

/* ---------- заявка ---------- */
const reqForm = $('[data-req]');
function setRequest(what, count) {
  if (what) {
    const opt = [...reqForm.what.options].find(o => o.text === what);
    if (opt) reqForm.what.value = opt.text;
  }
  if (count) reqForm.count.value = count;
  refreshSend();
}
function requestText() {
  const lines = ['Здравствуйте! Запрос с презентации FSP PANEL.', `Что нужно: ${reqForm.what.value}`];
  if (reqForm.count.value) lines.push(`Количество: ${reqForm.count.value}`);
  if (reqForm.place.value) lines.push(`Регион: ${reqForm.place.value}`);
  return lines.join('\n');
}
function refreshSend() {
  const t = encodeURIComponent(requestText());
  $('[data-send=wa]').href = `https://wa.me/79197233232?text=${t}`;
  $('[data-send=mail]').href = `mailto:msckzapad@yandex.ru?subject=${encodeURIComponent('Запрос расчёта: FSP PANEL')}&body=${t}`;
}
reqForm.addEventListener('input', refreshSend);
refreshSend();
$('[data-send=tg]').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(requestText());
    const n = $('[data-copied]');
    n.hidden = false;
    layout();
  } catch { /* без буфера обмена просто откроется чат */ }
});

/* ---------- калькулятор ---------- */
const calc = $('[data-calc]');
const calcState = { id: 'house-5x6', n: 10 };
const calcListeners = [];
$('[data-calc-models]').innerHTML = Object.keys(MODELS).map(id => `<button class="chip" type="button" role="radio" data-m="${id}" aria-checked="${id === calcState.id}">${MODELS[id].name}</button>`).join('');
function renderCalc() {
  const { id, n } = calcState;
  $('[data-calc-n]').textContent = n;
  const unit = UNIT_PRICE[id];
  $('[data-calc-sum]').textContent = unit ? 'от ' + (unit * n >= 1e9 ? (unit * n / 1e9).toFixed(2).replace('.', ',') + ' млрд ₽' : (unit * n / 1e6).toFixed(1).replace('.', ',') + ' млн ₽') : 'по запросу';
  const p = pace(n);
  const mon = v => v + ' ' + (v % 10 === 1 && v % 100 !== 11 ? 'месяц' : v % 10 >= 2 && v % 10 <= 4 && (v % 100 < 10 || v % 100 >= 20) ? 'месяца' : 'месяцев');
  $('[data-calc-time]').textContent = p.min === p.max ? 'около ' + mon(p.max) : `${p.min}–${mon(p.max)}`;
  $$('[data-m]', calc).forEach(b => b.setAttribute('aria-checked', String(b.dataset.m === id)));
  calcListeners.forEach(f => f(calcState));
}
calc.addEventListener('click', e => {
  const b = e.target.closest('[data-m]');
  if (b) { calcState.id = b.dataset.m; renderCalc(); }
  if (e.target.closest('[data-calc-send]')) setRequest(MODELS[calcState.id].name, calcState.n);
});
$('[data-calc-range]').addEventListener('input', e => { calcState.n = +e.target.value; renderCalc(); });
renderCalc();

/* ---------- 3D: грузим только когда сцена рядом ---------- */
function hasGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const layerItems = $$('[data-layers] li');
const pinEl = $('.pin'), pinText = $('[data-pin-text]');
const buildSteps = [
  ['Сваи и обвязка', 'Ставим основание и нижнюю обвязку.'],
  ['Панели стен', 'Панели приходят готовыми и встают в паз обвязки по схеме.'],
  ['Верхняя обвязка и перекрытие', 'Связываем стены и закрываем перекрытие.'],
  ['Стропильные фермы', 'Фермы делаем на заводе и ставим на верхнюю обвязку.'],
  ['Кровля', 'Закрываем крышу.'],
  ['Фасад', 'Отделка на выбор: профлист или имитация бруса, 5 цветов.'],
];
const ticks = $('[data-ticks]');
ticks.innerHTML = buildSteps.map(() => '<i></i>').join('');
function showBuildStep(k) {
  $('[data-build-title]').textContent = buildSteps[k][0];
  $('[data-build-text]').textContent = buildSteps[k][1];
  $$('i', ticks).forEach((t, i) => t.classList.toggle('on', i <= k));
}
showBuildStep(0);

function setLayer(k, label) {
  layerItems.forEach((li, i) => li.classList.toggle('on', i === k));
  pinText.textContent = label || '';
}
setLayer(0);

async function initGL() {
  if (!hasGL()) { document.documentElement.classList.add('no-gl'); return; }
  let mod;
  try { mod = await import('./three-scenes.js'); }
  catch (err) { console.warn('3D недоступно', err); document.documentElement.classList.add('no-gl'); return; }
  const mounts = {
    village(canvas, scene) {
      const wide = innerWidth > 760;
      const v = mod.mountVillage(canvas, { spots: $$('.spot', scene), shiftX: wide ? .2 : 0, shiftY: wide ? .1 : .2, wf: wide ? .6 : 1, hf: wide ? .78 : .52, pattern: ['house-5x12', 'bath-5x6', 'house-5x6', 'bath-2x6', 'house-5x6', 'house-5x12', 'bath-5x8', 'house-5x6', 'house-5x12', 'bath-5x6', 'house-5x6', 'house-5x12'], count: innerWidth > 760 ? 12 : 9 });
      return v;
    },
    plots(canvas) {
      const wide = innerWidth > 760, tablet = wide && innerWidth <= 1100;
      const v = mod.mountVillage(canvas, { spots: [], shiftX: tablet ? -.1 : wide ? .02 : 0, shiftY: tablet ? -.28 : 0, wf: tablet ? .55 : wide ? .46 : 1, hf: tablet ? .3 : wide ? .84 : 1, count: calcState.n, pattern: [calcState.id], interactive: false });
      calcListeners.push(s => v.setVillage(s.n, s.id));
      return v;
    },
    panel(canvas, scene) {
      const v = mod.mountPanel(canvas, {
        pin: pinEl,
        onStep: (k, label) => setLayer(k, label),
      });
      if (reduced) v.setProgress(.5); else pinHandlers.set(scene, p => v.setProgress(p));
      return v;
    },
    assembly(canvas, scene) {
      const v = mod.mountAssembly(canvas, { onStep: showBuildStep });
      if (reduced) v.setProgress(1); else pinHandlers.set(scene, p => v.setProgress(p));
      return v;
    },
  };
  // Обложку запускаем сразу, остальные сцены готовим по очереди в простое:
  // так переход на сцену не подвешивает страницу на сборке 3D
  const mountOne = c => {
    const scene = c.closest('.scene');
    try {
      mounts[c.dataset.gl](c, scene);
      onScroll();
    } catch (err) {
      console.warn('3D-сцена не запустилась', err);
      c.style.display = 'none';
      const fb = $('.gl-fallback', scene);
      if (fb) fb.style.display = 'block';
    }
  };
  const canvases = $$('canvas[data-gl]');
  // Сначала показываем текст обложки, потом собираем макет
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120))));
  mountOne(canvases[0]);
  const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
  const queue = canvases.slice(1);
  const next = () => {
    const c = queue.shift();
    if (!c) return;
    mountOne(c);
    setTimeout(() => idle(next, { timeout: 1500 }), 250);
  };
  setTimeout(() => idle(next, { timeout: 1500 }), 900);
}

/* ---------- старт ---------- */
watch();
layout();
frame();
addEventListener('load', () => { layout(); onScroll(); });
document.fonts?.ready.then(() => { layout(); onScroll(); });
new ResizeObserver(() => { layout(); onScroll(); }).observe($('#deck'));
initGL();
