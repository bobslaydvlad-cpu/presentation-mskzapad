import { MODELS, KIT_TEXT, INCLUDED, SERIES, LAYERS, BUILD, PRICE_DATE, pace } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rub = n => n == null ? 'по запросу' : n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
const img = n => `assets/img/${n}.webp`;
const img860 = n => `assets/img/${n}-860.webp`;

/* ---------- заголовки по словам и появление ---------- */
$$('.split').forEach(el => {
  let n = 0;
  el.innerHTML = el.textContent.trim().split(/ +/).map(w => `<span class="sw"><span style="--i:${n++}">${w}</span></span>`).join(' ');
});
const seen = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  seen.unobserve(e.target);
  $$('[data-count]', e.target).forEach(countUp);
  if (e.target.matches('[data-count]')) countUp(e.target);
}), { threshold: .14, rootMargin: '0px 0px -4% 0px' });
function watch(root = document) {
  $$('[data-r],.split', root).forEach(el => {
    if (el.dataset.seen) return;
    el.dataset.seen = 1;
    const sibs = [...el.parentElement.children].filter(c => c.matches('[data-r]'));
    const k = sibs.indexOf(el);
    if (k > 0) el.style.setProperty('--d', Math.min(k, 6) * 70 + 'ms');
    seen.observe(el);
  });
}
function countUp(el) {
  if (reduced || el.dataset.done) return;
  el.dataset.done = 1;
  const to = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now(), ms = 1100;
  const tick = now => {
    const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(to * e) + suf;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- меню слева: кружок едет к активному разделу ---------- */
const rail = $('.rail'), dot = $('.rail__dot');
const links = $$('[data-nav]', rail);
function moveDot(a) {
  if (!a || !a.offsetParent) return;
  links.forEach(l => l.classList.toggle('on', l === a));
  dot.style.setProperty('--dx', a.offsetLeft - dot.offsetLeft + 'px');
  dot.style.setProperty('--dy', a.offsetTop - dot.offsetTop + 'px');
}
const secState = new Map();
const secIO = new IntersectionObserver(es => {
  es.forEach(e => secState.set(e.target, e.isIntersecting));
  const cur = [...secState].filter(([, v]) => v).map(([k]) => k).pop();
  if (!cur) return;
  const key = cur.dataset.sec;
  const a = links.find(l => l.dataset.nav === key);
  if (a?.offsetParent) moveDot(a);
}, { rootMargin: '-46% 0px -46% 0px' });
$$('[data-sec]').forEach(s => secIO.observe(s));
moveDot(links[0]);
addEventListener('resize', () => moveDot($('.on', rail) || links[0]), { passive: true });

/* ---------- шкала толщины панели ---------- */
let dialI = 3;
const seriesBody = $('[data-series]');
seriesBody.innerHTML = SERIES.map((s, i) => `<tr data-i="${i}"><th scope="row">${s.id}</th><td>${s.mm} мм</td><td>${s.ins}</td><td>${s.use}</td></tr>`).join('');
function setDial(i) {
  dialI = Math.max(0, Math.min(SERIES.length - 1, i));
  const s = SERIES[dialI], arc = $('.dial__arc');
  arc.style.setProperty('--arc', 18 + dialI / (SERIES.length - 1) * 82);
  $('[data-dial-mm]').textContent = s.mm;
  $('[data-dial-id]').textContent = s.id;
  $('[data-dial-ins]').textContent = s.ins;
  $$('tr', seriesBody).forEach((r, k) => r.classList.toggle('on', k === dialI));
}
$$('[data-dial-step]').forEach(b => b.addEventListener('click', () => setDial(dialI + +b.dataset.dialStep)));
setDial(dialI);

/* ---------- слои панели ---------- */
const stack = $('[data-stack]'), layersBox = $('[data-layers]');
layersBox.innerHTML = LAYERS.map((l, i) => `<button class="lay" type="button" role="tab" aria-selected="false" data-i="${i}"><b>${l.title}</b><span><em>${l.text}</em></span></button>`).join('');
const lays = $$('.lay', layersBox);
// Куда смотрит метка на каждом разобранном слое, в процентах от блока
const PIN = { frame: [55, 8], wool: [45, 22], membrane: [24, 10], osb: [68, 6], finish: [8, 15] };
let layerI = 0, layerTimer = 0, layerAuto = !reduced;
function setLayer(i) {
  layerI = i;
  const l = LAYERS[i];
  lays.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
  stack.classList.toggle('is-open', !!l.key);
  $$('.l', stack).forEach(im => im.classList.toggle('act', im.dataset.l === l.key));
  const p = l.key ? PIN[l.key] : [58, 6];
  stack.style.setProperty('--px', p[0] + '%');
  stack.style.setProperty('--py', p[1] + '%');
  stack.classList.add('has-pin');
  $('[data-pin-text]').textContent = l.pin;
}
layersBox.addEventListener('click', e => {
  const b = e.target.closest('.lay');
  if (!b) return;
  layerAuto = false;
  clearInterval(layerTimer);
  setLayer(+b.dataset.i);
});
setLayer(0);
stack.classList.remove('is-open');
new IntersectionObserver(es => {
  const on = es[0].isIntersecting;
  clearInterval(layerTimer);
  if (on) {
    setLayer(layerI);
    if (layerAuto) layerTimer = setInterval(() => setLayer((layerI + 1) % LAYERS.length), 3400);
  }
}, { threshold: .3 }).observe(stack);

/* ---------- этапы сборки ---------- */
const stepsBox = $('[data-steps]'), buildImgs = $$('img', $('[data-buildstage]'));
stepsBox.innerHTML = BUILD.map((s, i) => `<button class="step" type="button" role="tab" aria-selected="false" data-i="${i}">${s.title}<small><em>${s.text}</em></small></button>`).join('');
const steps = $$('.step', stepsBox);
const STEP_MS = 3200;
let stepI = 0, stepTimer = 0, stepAuto = !reduced, stepVisible = false;
function setStep(i) {
  stepI = i;
  buildImgs.forEach((im, k) => im.classList.toggle('on', k === i));
  steps.forEach((b, k) => {
    b.setAttribute('aria-selected', String(k === i));
    b.classList.remove('run');
    if (k === i && stepAuto && stepVisible) { void b.offsetWidth; b.classList.add('run'); }
  });
}
function stepLoop() {
  clearTimeout(stepTimer);
  if (!stepAuto || !stepVisible) return;
  stepTimer = setTimeout(() => { setStep((stepI + 1) % BUILD.length); stepLoop(); }, stepI === BUILD.length - 1 ? STEP_MS + 1800 : STEP_MS);
}
stepsBox.style.setProperty('--t', STEP_MS + 'ms');
stepsBox.addEventListener('click', e => {
  const b = e.target.closest('.step');
  if (!b) return;
  stepAuto = false;
  clearTimeout(stepTimer);
  setStep(+b.dataset.i);
});
setStep(0);
new IntersectionObserver(es => {
  stepVisible = es[0].isIntersecting;
  setStep(stepI);
  stepLoop();
}, { threshold: .3 }).observe($('[data-buildstage]'));
// Картинки этапов подгружаем заранее, чтобы смена шла без вспышек
addEventListener('load', () => setTimeout(() => buildImgs.forEach(im => { im.loading = 'eager'; }), 1500));

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
    $('[data-copied]').hidden = false;
  } catch { /* без буфера обмена просто откроется чат */ }
});

/* ---------- каталог ---------- */
const catRoot = $('[data-catalog]');
const S = { group: 'houses', id: 'house-5x6', view: 0, kit: 'turnkey', stove: 'electric', steam: 'Русская баня', firing: 'Изнутри', finish: 'Стандарт' };
const CUSTOM = {
  name: 'Любой размер на заказ',
  lead: 'Не нашли подходящую модель? Спроектируем под ваш размер и планировку, изготовим панели FSP и соберём дом или баню прямо на вашем участке.',
  frames: ['work-veranda', 'work-wide', 'work-progress', 'prod-hall', 'prod-truss'],
};
catRoot.innerHTML = `
  <div class="cat">
    <div class="cat__media" data-media>
      <div class="cat__models" data-models></div>
      <div class="thumbs" data-thumbs></div>
      <span class="tag" data-tag>Визуализация</span>
    </div>
    <div class="cat__info w gl" data-info></div>
    <button class="cat__plan" type="button" data-plan aria-label="Открыть планировку крупно"><img alt="Планировка выбранной модели" loading="lazy"></button>
    <div class="cat__rooms w gl" data-rooms></div>
    <div class="cat__inc w w--black" data-inc></div>
  </div>`;
const media = $('[data-media]'), info = $('[data-info]'), planBtn = $('[data-plan]'), roomsBox = $('[data-rooms]'), incBox = $('[data-inc]');

const priceOf = (m, kit) => {
  const p = m.prices?.[kit];
  if (p == null) return null;
  return typeof p === 'number' ? p : p[S.stove];
};
const opt = (name, label, opts, val) => `<div class="opt"><span>${label}</span><div class="chips">${opts.map(([v, t]) => `<button class="chip" type="button" data-set="${name}" data-val="${v}" aria-pressed="${v === val}">${t}</button>`).join('')}</div></div>`;
const tabsHtml = () => `<div class="tabs">${[['houses', 'Дома'], ['baths', 'Бани'], ['custom', 'На заказ']].map(([k, t]) => `<button class="chip" type="button" data-group="${k}" aria-pressed="${S.group === k}">${t}</button>`).join('')}</div>`;

function renderInfo() {
  if (S.group === 'custom') {
    info.innerHTML = `${tabsHtml()}
      <h3 class="cat__name">${CUSTOM.name}</h3>
      <p>${CUSTOM.lead}</p>
      <div class="cat__price">цена по расчёту</div>
      <p class="kit">Домокомплект приезжает на фурах и грузовиках. Индивидуальный проект стоит дороже готовой модели. Гарантия 5 лет.</p>
      <a class="btn" href="#request" data-order="Домокомплект по нашему проекту"><span>Обсудить проект</span><i><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></i></a>`;
    return;
  }
  const m = MODELS[S.id], bath = m.group === 'baths';
  const basicOk = m.prices && m.prices.basic != null;
  if (S.kit === 'basic' && !basicOk) S.kit = 'turnkey';
  const price = priceOf(m, S.kit);
  info.innerHTML = `${tabsHtml()}
    <div><h3 class="cat__name">${m.name}</h3><p class="cat__meta">${m.area} · ${m.size} · ${m.fit}</p></div>
    <p>${m.lead}</p>
    <div class="cat__price">${price == null ? 'Цена по запросу' : 'от ' + rub(price)}</div>
    ${m.prices ? `<button class="swrow" type="button" data-kit aria-pressed="${S.kit === 'turnkey'}" ${basicOk ? '' : 'disabled'}><span>${S.kit === 'turnkey' ? 'Под ключ' : 'Без инженерных систем'}</span><span class="switch"></span></button><p class="kit">${KIT_TEXT[m.group][S.kit]}</p>` : '<p class="kit">Назовём точную стоимость в расчёте.</p>'}
    ${bath ? opt('stove', 'Печь', [['electric', 'Электрическая'], ['wood', 'Дровяная']], S.stove) : ''}
    ${bath && S.stove === 'wood' ? opt('firing', 'Растопка', [['Изнутри', 'Изнутри'], ['Снаружи', 'Снаружи']], S.firing) : ''}
    ${bath ? opt('steam', 'Парная', [['Русская баня', 'Русская баня'], ['Финская сауна', 'Финская сауна']], S.steam) : ''}
    <p class="cat__foot">${m.term}. Гарантия 30 лет. Цены по прайсу от ${PRICE_DATE}.</p>
    <a class="btn" href="#request" data-order="${m.name}"><span>Запросить расчёт</span><i><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></i></a>`;
}
function renderDetails() {
  const custom = S.group === 'custom';
  planBtn.hidden = custom; roomsBox.hidden = custom; incBox.hidden = custom;
  if (custom) return;
  const m = MODELS[S.id];
  $('img', planBtn).src = img(m.plan);
  planBtn.dataset.zoom = img(m.plan);
  planBtn.dataset.zoomAlt = `Планировка: ${m.name}`;
  roomsBox.innerHTML = `<h3>Помещения</h3><ul>${m.rooms.map(([n, a]) => `<li>${n}<b>${a} м²</b></li>`).join('')}</ul>`;
  const col = S.kit === 'turnkey' ? 1 : 2;
  incBox.innerHTML = `<h3>Что входит</h3><ul>${INCLUDED[m.group].map(r => `<li class="${r[col] ? 'yes' : 'no'}">${r[0]}</li>`).join('')}
    <li>Сваи ${m.foundation ? `(${m.foundation[1]}): +${rub(m.foundation[0])}` : 'считаем под модуль'}</li>
    <li>Доставку и монтаж считаем по адресу</li></ul>`;
}
function frames() {
  if (S.group === 'custom') return CUSTOM.frames;
  const m = MODELS[S.id];
  return [m.ext, ...m.interiors];
}
function renderMedia() {
  $$(':scope > img', media).forEach(i => i.remove());
  const list = frames();
  list.forEach((n, i) => {
    const im = new Image();
    im.alt = S.group === 'custom' ? 'Построенные объекты и производство' : `${MODELS[S.id].name}: изображение`;
    im.decoding = 'async';
    im.sizes = '(max-width:760px) 100vw, 66vw';
    im.srcset = `${img860(n)} 860w, ${img(n)} 1680w`;
    im.src = img860(n);
    if (i) im.loading = 'lazy';
    media.prepend(im);
  });
  // prepend развернул порядок: первый кадр снова первый по индексу
  S.view = 0;
  $('[data-tag]').hidden = S.group === 'custom';
  $('[data-thumbs]').innerHTML = list.map((n, i) => `<button class="thumb" type="button" data-view="${i}" aria-label="Кадр ${i + 1}"><img loading="lazy" src="${img860(n)}" alt=""></button>`).join('');
  const models = S.group === 'custom' ? [] : Object.keys(MODELS).filter(id => MODELS[id].group === S.group);
  $('[data-models]').innerHTML = models.map(id => `<button class="chip" type="button" data-id="${id}" aria-pressed="${id === S.id}">${MODELS[id].name}</button>`).join('');
  renderView();
}
function renderView() {
  const list = frames();
  const imgs = $$(':scope > img', media).reverse();
  imgs.forEach((im, i) => im.classList.toggle('on', i === S.view));
  $$('.thumb', media).forEach((t, i) => t.setAttribute('aria-current', String(i === S.view)));
  return list;
}
function selectModel(id) {
  S.id = id;
  S.group = MODELS[id].group;
  renderInfo(); renderMedia(); renderDetails();
  syncTiles();
}
function selectGroup(g) {
  S.group = g;
  if (g !== 'custom') S.id = Object.keys(MODELS).find(id => MODELS[id].group === g);
  renderInfo(); renderMedia(); renderDetails();
  syncTiles();
}
$('.cat', catRoot).addEventListener('click', e => {
  const g = e.target.closest('[data-group]');
  if (g) return selectGroup(g.dataset.group);
  const m = e.target.closest('[data-id]');
  if (m) return selectModel(m.dataset.id);
  const v = e.target.closest('[data-view]');
  if (v) { S.view = +v.dataset.view; renderView(); return; }
  if (e.target.closest('[data-kit]')) {
    S.kit = S.kit === 'turnkey' ? 'basic' : 'turnkey';
    renderInfo(); renderDetails();
    return;
  }
  const c = e.target.closest('[data-set]');
  if (c) { S[c.dataset.set] = c.dataset.val; renderInfo(); return; }
  const o = e.target.closest('[data-order]');
  if (o) setRequest(o.dataset.order);
});

/* ---------- плитки моделей на первом экране и метки на макете ---------- */
const tiles = $('[data-tiles]');
tiles.innerHTML = Object.keys(MODELS).map(id => {
  const m = MODELS[id];
  return `<button class="mt" type="button" data-pick="${id}" aria-pressed="false"><img src="${img860(m.ext)}" alt="" loading="lazy"><span>${m.name}<small>${m.from ? 'от ' + rub(m.from) : 'цена по запросу'}</small></span><i class="switch"></i></button>`;
}).join('');
function syncTiles() {
  $$('.mt', tiles).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pick === S.id && S.group !== 'custom')));
}
function goCatalog() {
  $('#catalog').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}
tiles.addEventListener('click', e => {
  const b = e.target.closest('[data-pick]');
  if (!b) return;
  selectModel(b.dataset.pick);
  goCatalog();
});
$$('.spot[data-model]').forEach(a => a.addEventListener('click', () => selectModel(a.dataset.model)));

renderInfo(); renderMedia(); renderDetails(); syncTiles();

/* ---------- темп завода ---------- */
const barsBox = $('[data-bars]');
barsBox.innerHTML = Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
const bars = $$('i', barsBox);
function setRate(n) {
  $('[data-rate-num]').textContent = n === 10 ? '10' : '4–5';
  $$('[data-rate]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.rate === n)));
  // Столбики показывают накопленный выпуск по месяцам на горизонте в год
  const full = 120;
  bars.forEach((b, i) => {
    b.style.setProperty('--h', Math.max(.04, ((i + 1) * n) / full).toFixed(3));
    b.classList.toggle('on', n === 10 ? i >= 5 : i >= 8);
  });
}
$('[data-rate-chips]').addEventListener('click', e => {
  const b = e.target.closest('[data-rate]');
  if (b) setRate(+b.dataset.rate);
});
bars.forEach(b => b.style.setProperty('--h', '.04'));
new IntersectionObserver((es, o) => {
  if (es[0].isIntersecting) { setRate(10); o.disconnect(); }
}, { threshold: .3 }).observe(barsBox);

/* ---------- ролик: один плавный проход при входе в блок ---------- */
$$('video[data-once]').forEach(v => {
  if (reduced) return;
  new IntersectionObserver(es => {
    if (es[0].isIntersecting) {
      v.currentTime = 0;
      v.playbackRate = .3;
      v.play().catch(() => {});
    }
  }, { threshold: .4 }).observe(v);
});

/* ---------- калькулятор ---------- */
const calc = $('[data-calc]');
const calcState = { id: 'house-5x6', n: 10 };
$('[data-calc-models]').innerHTML = Object.keys(MODELS).map(id => `<button class="chip" type="button" role="radio" data-m="${id}" aria-checked="${id === calcState.id}">${MODELS[id].name}</button>`).join('');
const plots = $('[data-plots]');
plots.innerHTML = Array.from({ length: 60 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
const plotCells = $$('i', plots);
const mon = v => v + ' ' + (v % 10 === 1 && v % 100 !== 11 ? 'месяц' : v % 10 >= 2 && v % 10 <= 4 && (v % 100 < 10 || v % 100 >= 20) ? 'месяца' : 'месяцев');
function renderCalc() {
  const { id, n } = calcState;
  $('[data-calc-n]').textContent = n;
  const unit = MODELS[id].from;
  $('[data-calc-sum]').textContent = unit ? 'от ' + (unit * n >= 1e9 ? (unit * n / 1e9).toFixed(2).replace('.', ',') + ' млрд ₽' : (unit * n / 1e6).toFixed(1).replace('.', ',') + ' млн ₽') : 'по запросу';
  const p = pace(n);
  $('[data-calc-time]').textContent = p.min === p.max ? 'около ' + mon(p.max) : `${p.min}–${mon(p.max)}`;
  $$('[data-m]', calc).forEach(b => b.setAttribute('aria-checked', String(b.dataset.m === id)));
  plotCells.forEach((c, i) => c.classList.toggle('on', i < n));
}
calc.addEventListener('click', e => {
  const b = e.target.closest('[data-m]');
  if (b) { calcState.id = b.dataset.m; renderCalc(); }
  if (e.target.closest('[data-calc-send]')) setRequest(MODELS[calcState.id].name, calcState.n);
});
$('[data-calc-range]').addEventListener('input', e => { calcState.n = +e.target.value; renderCalc(); });
renderCalc();

/* ---------- просмотр картинки ---------- */
const zoomBox = $('[data-zoom-box]');
document.addEventListener('click', e => {
  const z = e.target.closest('[data-zoom]');
  if (z) {
    const im = $('img', zoomBox);
    im.src = z.dataset.zoom;
    im.alt = z.dataset.zoomAlt || '';
    zoomBox.showModal();
    return;
  }
  if (e.target === zoomBox || e.target.closest('[data-zoom-close]')) zoomBox.close();
});

watch();
