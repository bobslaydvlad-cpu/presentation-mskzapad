import { MODELS, INCLUDED, SERIES, LAYERS, BUILD, PRICE_DATE, pace } from './data.js?v=11';
import { VILLAGE, BUILD as SPR, NIGHT } from './sprites.js?v=11';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rub = n => n == null ? 'по запросу' : n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
const portrait = matchMedia('(max-aspect-ratio: 1/1)');
// frac: какую долю ширины экрана занимает картинка. Малый файл берём, только если его точно хватит
const fileOf = (n, full, frac = .6) => {
  const phone = portrait.matches && innerWidth < 600;
  const need = (portrait.matches ? Math.min(1, frac * 2) : frac) * innerWidth * (devicePixelRatio || 1);
  return `assets/img/${n}${!full && (phone || need <= 700) ? '-860' : ''}.webp`;
};
const ph = (n, alt, full = false, frac = .6) => `<img class="fi" data-src="${n}" ${full ? 'data-full' : `data-frac="${frac}"`} alt="${alt}">`;

/* ---------- слайды моделей строим из данных ---------- */
function priceRows(m) {
  if (!m.prices) return `<div class="ptable"><div class="ptable__row"><span>Стоимость</span><b>по запросу</b></div></div>`;
  const t = m.prices.turnkey, b = m.prices.basic;
  if (typeof t === 'number') {
    return `<div class="ptable"><div class="ptable__row"><span>Под ключ</span><b>${rub(t)}</b></div>${b ? `<div class="ptable__row"><span>Без инженерных систем</span><b>${rub(b)}</b></div>` : ''}</div>`;
  }
  return `<div class="pgrid">
    <span></span><i>Электропечь</i><i>Дровяная печь</i>
    <span>Под ключ</span><b>${rub(t.electric)}</b><b>${rub(t.wood)}</b>
    <span>Без инженерии</span><b>${rub(b.electric)}</b><b>${rub(b.wood)}</b>
  </div>`;
}
function modelSlide(id) {
  const m = MODELS[id], bath = m.group === 'baths', five = m.interiors.length === 5;
  const facts = `<div class="m-facts"><span><b>${m.term.replace('Изготовление ', '').replace('Срок ', '')}</b>изготовление</span><span><b>1 день</b>монтаж</span><span><b>30 лет</b>гарантия</span></div>`;
  return `<section class="slide s-model ${bath && m.prices ? 'is-bath' : ''}" id="${id}" data-title="${m.name}" data-nav="formats" data-steps="2" data-id="${id}">
    <div class="views m-media" data-a>
      <div class="m-v" data-on="0">${ph(m.ext, `${m.name}, визуализация`)}<span class="tag">Визуализация</span></div>
      <div class="m-v mosaic ${five ? 'five' : ''}" data-on="1" style="--cols:${five ? 3 : 2}">${m.interiors.map(n => ph(n, `${m.name}, интерьер`, false, .3)).join('')}</div>
      <div class="m-v m-plan" data-on="2" style="--plan-bg:${m.planBg}">${ph(m.plan, `Планировка: ${m.name}`, true)}</div>
    </div>
    <div class="m-info gl" data-a>
      <div><h2 class="m-name">${m.name}</h2><p class="m-meta">${m.area} · ${m.size} · ${m.fit}</p></div>
      <div class="views m-body">
        <div class="m-page" data-on="0,1">
          <p>${m.lead}</p>
          <p class="m-from">${m.from ? 'от ' + rub(m.from) : 'Цена по запросу'}</p>
          ${m.prices ? priceRows(m) : ''}
          ${facts}
          <p class="m-foot">Цены по прайсу от ${PRICE_DATE}.</p>
        </div>
        <div class="m-page" data-on="2">
          <h3 class="m-h">Помещения</h3>
          <ul class="rooms">${m.rooms.map(([n, a]) => `<li>${n}<b>${a} м²</b></li>`).join('')}</ul>
          ${facts}
          <div class="m-sum"><span>Цена по прайсу от ${PRICE_DATE}</span><b>${m.from ? 'от ' + rub(m.from) : 'по запросу'}</b></div>
          <p class="m-foot">${m.foundation ? `Сваи (${m.foundation[1]}): +${rub(m.foundation[0])}. ` : 'Сваи считаем под модуль. '}Доставку и монтаж считаем по адресу.</p>
        </div>
      </div>
    </div>
  </section>`;
}
const kitTable = g => `<table class="kit kit--${g}"><thead><tr><th scope="col">${g === 'houses' ? 'Что входит в дом' : 'Что входит в баню'}</th><th scope="col">Под ключ</th><th scope="col">Без инженерии</th></tr></thead><tbody>
  ${INCLUDED[g].map(r => `<tr><th scope="row">${r[0]}</th><td class="${r[1] ? 'y' : 'n'}">${r[1] ? '✓' : '—'}</td><td class="${r[2] ? 'y' : 'n'}">${r[2] ? '✓' : '—'}</td></tr>`).join('')}
  <tr><th scope="row">Сваи и подключение к сетям</th><td>опция</td><td>опция</td></tr>
  <tr><th scope="row">Доставка и монтаж</th><td>по адресу</td><td>по адресу</td></tr>
</tbody></table>`;
const kitSlide = `<section class="slide s-kit" id="kit" data-title="Комплектации" data-nav="formats" data-steps="1" data-steps-p="2">
  <h2 class="split">Комплектации и варианты</h2>
  <div class="kit__box gl" data-a>
    <div class="kit__tabs"><button class="ktab" type="button" data-jump="0" data-k="h">Дома</button><button class="ktab" type="button" data-jump="1" data-k="b">Бани</button></div>
    <div class="views kit__tables">
      <div data-on="0">${kitTable('houses')}</div>
      <div data-on="1,2">${kitTable('baths')}</div>
    </div>
  </div>
  <div class="kit__side">
    <article class="w lt kit__face" data-a>
      <h3>Цвет фасада</h3>
      <div class="swatches">
        <span><i style="background:#33373B"></i>Антрацит</span><span><i style="background:#5A3B2A"></i>Орех</span><span><i style="background:#7A2B23"></i>Красный</span><span><i style="background:#B98149"></i>Натуральный</span><span><i style="background:#A39A8A"></i>Серо-бежевый</span>
      </div>
      <p class="note">Профлист или имитация бруса.</p>
    </article>
    <article class="w w--black kit__bath views" data-a>
      <div class="kit__page" data-on="0">
        <h3>Что входит в дом</h3>
        <ul class="opts">
          <li><b>Под ключ</b>электрика, сантехника, бойлер 50 л, гидроаккумулятор и фильтр. Дом готов к подключению</li>
          <li><b>Без инженерии</b>конструкция, утепление и отделка. Инженерные системы делаете сами</li>
          <li><b>Отдельно</b>сваи и подключение к сетям как опция, доставку и монтаж считаем по адресу</li>
        </ul>
      </div>
      <div class="kit__page" data-on="1,2">
        <h3>Варианты для бани</h3>
        <ul class="opts">
          <li><b>Печь</b>электрическая или дровяная, камень в комплекте</li>
          <li><b>Растопка дровяной печи</b>изнутри или снаружи, без дров и сора в парной</li>
          <li><b>Парная</b>русская баня или финская сауна</li>
          <li><b>Отделка парной</b>стандарт или премиум, премиум по запросу</li>
        </ul>
      </div>
    </article>
  </div>
</section>`;
const customSlide = `<section class="slide s-custom" id="custom" data-title="Любой размер" data-nav="formats" data-steps="0">
  <div class="custom__pics">
    <figure class="photo custom__a" data-a>${ph('custom-house', 'Дом по индивидуальному проекту, визуализация')}<span class="tag">Визуализация</span></figure>
    <figure class="photo custom__b" data-a>${ph('custom-small', 'Небольшой дом с террасой, визуализация', false, .25)}<span class="tag">Визуализация</span></figure>
    <figure class="photo custom__c" data-a>${ph('custom-plant', 'Панели FSP в цеху', false, .7)}</figure>
  </div>
  <div class="custom__text">
    <h2 class="split">Любой размер на заказ</h2>
    <p class="lead" data-a>Не нашли подходящую модель? Спроектируем под ваш размер и планировку, изготовим панели FSP и соберём дом или баню прямо на вашем участке.</p>
    <div class="m-facts custom__facts" data-a><span><b>Любой</b>размер и планировка</span><span><b>По расчёту</b>цена</span><span><b>5 лет</b>гарантия</span></div>
    <p class="note" data-a>Домокомплект привозим на фурах и грузовиках в любую точку России.</p>
  </div>
</section>`;
$('#model-slot').outerHTML = Object.keys(MODELS).map(modelSlide).join('') + kitSlide + customSlide;

/* ---------- заголовки по словам ---------- */
$$('.split').forEach(el => {
  let n = 0;
  el.innerHTML = el.textContent.trim().split(/ +/).map(w => `<span class="sw"><span style="--i:${n++}">${w}</span></span>`).join(' ');
});

/* ---------- падение деталей: только сдвиг и прозрачность ---------- */
const DROP = h => [
  { transform: `translate3d(0,${-h}rem,0)`, opacity: 0, easing: 'cubic-bezier(.45,0,.9,.6)' },
  { opacity: 1, offset: .2 },
  { transform: 'translate3d(0,0,0)', offset: .62, easing: 'cubic-bezier(.2,.6,.4,1)' },
  { transform: 'translate3d(0,-.45rem,0)', offset: .8, easing: 'cubic-bezier(.5,0,.8,.5)' },
  { transform: 'translate3d(0,0,0)', opacity: 1 },
];
const place = (el, r) => { el.style.cssText += `left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%`; };

/* ---------- макет посёлка ---------- */
const village = $('[data-village]');
village.style.setProperty('--a', VILLAGE.ratio);
$('.village__box').style.setProperty('--a', VILLAGE.ratio);
village.innerHTML = `<img class="v-base" src="assets/img/s/v-base.webp" alt="Макет посёлка: участки, дорожки и деревья" width="1700" height="1045">`
  + VILLAGE.houses.map((_, i) => `<img class="v-h" data-i="${i}" src="assets/img/s/v-${i}.webp" alt="" decoding="async">`).join('');
const houses = $$('.v-h', village);
const housesReady = Promise.all(houses.map(h => h.decode?.().catch(() => {})));
houses.forEach((h, i) => place(h, VILLAGE.houses[i]));
// Метка на каждую модель каталога: номер участка на макете, модель, подпись
const SPOTS = [[0, 'house-5x12', 'Дом 5×12', '60 м²'], [3, 'bath-2x6', 'Баня 2,5×6', '15 м²'], [4, 'house-5x6', 'Дом 5×6', '30 м²'], [6, 'bath-5x8', 'Баня 4,9×7,7', '38 м²'], [9, 'bath-5x6', 'Баня 5×6', '30 м²']];
village.insertAdjacentHTML('beforeend', SPOTS.map(([i, id, t, a], k) => {
  const r = VILLAGE.houses[i];
  return `<button class="spot gl" type="button" data-step="1" data-model="${id}" style="--x:${(r.x + r.w * .3).toFixed(2)}%;--y:${(r.y - 3).toFixed(2)}%;--d:${k * 90}ms"><i></i><span>${t}<small>${a}</small></span></button>`;
}).join(''));
function dropHouses() {
  const order = houses.map((h, i) => [h, VILLAGE.houses[i].y]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  order.forEach((h, k) => {
    h.style.opacity = 1;
    if (!reduced) h.animate(DROP(13), { duration: 820, delay: k * 62, fill: 'backwards' });
  });
}
// Дома падают сами, как только открыли главную: ждём картинки, чтобы не появились посреди падения
let dropTicket = 0, dropTimer = 0;
function queueDrop() {
  const t = ++dropTicket;
  clearTimeout(dropTimer);
  houses.forEach(h => { h.getAnimations().forEach(a => a.cancel()); h.style.opacity = 0; });
  housesReady.then(() => { if (t === dropTicket) dropTimer = setTimeout(dropHouses, 380); });
}
function showHouses() {
  dropTicket++;
  clearTimeout(dropTimer);
  houses.forEach(h => { h.style.opacity = 1; });
}

/* ---------- тот же посёлок ночью: на последнем слайде окна загораются по очереди ---------- */
const nightBox = $('[data-night]');
nightBox.style.setProperty('--a', NIGHT.ratio);
const LIT = [5, 0, 9, 3, 7, 11, 1, 6, 10, 2, 8, 4];
nightBox.innerHTML = `<img class="n-base" data-src="s/n-base" data-full alt="">`
  + NIGHT.lights.map((_, i) => `<img class="n-l" data-src="s/n-${i}" data-full alt="" style="--k:${LIT.indexOf(i)}">`).join('');
$$('.n-l', nightBox).forEach((im, i) => place(im, NIGHT.lights[i]));

/* ---------- панель по слоям ---------- */
const stack = $('[data-stack]'), layersBox = $('[data-layers]');
layersBox.innerHTML = LAYERS.map((l, i) => `<button class="lay" type="button" data-jump="${i + 1}"><b>${l.title}</b><span><em>${l.text}</em></span></button>`).join('');
const lays = $$('.lay', layersBox);
// Куда смотрит метка на каждом разобранном слое, в процентах от блока
const PIN = { frame: [58, 7], wool: [44, 16], membrane: [24, 12], osb: [66, 3], finish: [6, 30] };

/* ---------- каталог серий панелей ---------- */
$('[data-series]').innerHTML = SERIES.map(x => `<article class="ser gl" data-a>
  <div class="ser__pic"><img class="fi" data-src="s/ser-${x.id.replace('+', 'p')}" data-full alt="Панель FSP PANEL, серия ${x.id}"></div>
  <h3>Серия ${x.id}</h3>
  <p class="ser__mm"><b>${x.mm}</b> мм</p>
  <i class="ser__bar" style="--t:${(x.mm / 195).toFixed(3)}"></i>
  <p class="ser__ins">${x.ins}</p>
  <p class="ser__use">${x.use}</p>
</article>`).join('');

/* ---------- сборка дома ---------- */
const stage = $('[data-buildstage]');
stage.style.setProperty('--a', SPR.ratio);
$('.build__box').style.setProperty('--a', SPR.ratio);
const STAGES = [['piles', 'frame', 'floor'], ['wallB', 'wallL', 'wallR', 'wallF'], ['inA', 'inB'], ['slab'], ['tr1', 'tr2', 'tr3', 'tr4', 'tr5'], ['roofA', 'roofB'], null];
stage.innerHTML = BUILD.map((b, i) => `<img class="b-s" data-src="s/b-s${i}" data-full alt="${b.title}">`).join('')
  + STAGES.flat().filter(Boolean).map(p => `<img class="b-g" data-part="${p}" data-src="s/b-${p}" data-full alt="">`).join('');
const stills = $$('.b-s', stage), parts = Object.fromEntries($$('.b-g', stage).map(g => [g.dataset.part, g]));
Object.entries(parts).forEach(([p, g]) => place(g, SPR.parts[p]));
const stepsBox = $('[data-stepbox]');
stepsBox.innerHTML = BUILD.map((s, i) => `<button class="step" type="button" data-jump="${i}"><span class="step__t">${s.title}</span><small><em>${s.text}</em></small></button>`).join('');
const stepBtns = $$('.step', stepsBox);
let buildTimer = 0, buildAnims = [];
function showStill(k, slow) {
  stills.forEach((im, i) => { im.classList.toggle('slow', !!slow); im.classList.toggle('on', i === k); });
}
function buildReset(k) {
  clearTimeout(buildTimer);
  buildAnims.forEach(a => a.cancel());
  buildAnims = [];
  Object.values(parts).forEach(g => { g.style.visibility = 'hidden'; });
  showStill(k);
}
function buildGo(s, forward) {
  buildReset(forward ? s - 1 : s);
  if (!forward || reduced) { showStill(s); return; }
  const list = STAGES[s];
  if (!list) { showStill(s, true); return; }
  const gap = s === 4 ? 130 : s === 0 ? 240 : s === 2 ? 320 : 210;
  const lift = s === 0 ? 7 : s === 1 ? 9 : 8;
  let end = 0;
  list.forEach((p, k) => {
    const g = parts[p], dur = 780;
    g.style.visibility = 'visible';
    buildAnims.push(g.animate(p === 'piles' ? [{ transform: 'translate3d(0,1.4rem,0)', opacity: 0 }, { transform: 'none', opacity: 1 }] : DROP(lift), { duration: p === 'piles' ? 480 : dur, delay: k * gap, easing: p === 'piles' ? 'cubic-bezier(.2,.75,.2,1)' : 'linear', fill: 'backwards' }));
    end = k * gap + dur;
  });
  // Несущие стены опускаются внутрь дома: ближние наружные стены рисуем поверх, как в жизни
  if (s === 2) ['wallR', 'wallF'].forEach(p => { parts[p].style.visibility = 'visible'; });
  // Детали встали: подменяем на готовый кадр с правильными тенями, стык не виден
  buildTimer = setTimeout(() => {
    showStill(s);
    buildTimer = setTimeout(() => { Object.values(parts).forEach(g => { g.style.visibility = 'hidden'; }); }, 320);
  }, end);
}

/* ---------- темп производства ---------- */
const barsBox = $('[data-bars]');
barsBox.innerHTML = Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
const bars = $$('i', barsBox);
function setRate(n) {
  $('[data-rate-num]').textContent = n === 10 ? '10' : '4–5';
  $('[data-rate-label]').textContent = n === 10 ? 'Заказ от 50 домов' : 'Заказ около 10 домов';
  bars.forEach((b, i) => b.style.setProperty('--h', Math.max(.03, ((i + 1) * n) / 120).toFixed(3)));
}

/* ---------- объекты ---------- */
const WORKS = [
  ['works-1', 'Дом с панорамными окнами'], ['works-2', 'Дом с мансардой на сваях'], ['works-3', 'Дом с крытой террасой'],
  ['works-4', 'Готовый модуль на площадке с образцами'], ['works-5', 'Образец на площадке в Тетерино'],
  ['works-6', 'Одноэтажный дом под Краснодаром'], ['works-7', 'Веранда дома под Краснодаром'], ['works-8', 'Крыльцо с навесом'], ['works-9', 'Дом под Краснодаром вечером'],
];
$('[data-works]').innerHTML = WORKS.map(([n, c]) => `<figure>${ph(n, c)}<figcaption class="cap gl">${c}</figcaption></figure>`).join('');
$('[data-works-thumbs]').innerHTML = WORKS.map(([n, c], i) => `<button class="thumb" type="button" data-jump="${i}" aria-label="${c}">${ph(n, '', false, .12)}</button>`).join('');

/* ---------- калькулятор ---------- */
const calcState = { id: 'house-5x6', n: 1 };
$('[data-calc-models]').innerHTML = Object.keys(MODELS).map(id => `<button class="chip" type="button" role="radio" data-m="${id}" aria-checked="${id === calcState.id}">${MODELS[id].name}</button>`).join('');
const HOUSE = '<svg viewBox="0 0 24 24"><path d="M12 3L2 12h3v9h14v-9h3z"/></svg>';
const plots = $('[data-plots]');
plots.innerHTML = Array.from({ length: 100 }, (_, i) => `<i style="--i:${i}">${HOUSE}</i>`).join('');
const plotCells = $$('i', plots);
const mon = v => v + ' ' + (v % 10 === 1 && v % 100 !== 11 ? 'месяц' : v % 10 >= 2 && v % 10 <= 4 && (v % 100 < 10 || v % 100 >= 20) ? 'месяца' : 'месяцев');
function renderCalc() {
  const { id, n } = calcState;
  $('[data-calc-range]').value = n;
  const unit = MODELS[id].from;
  $('[data-calc-sum]').textContent = unit ? 'от ' + (unit * n >= 1e9 ? (unit * n / 1e9).toFixed(2).replace('.', ',') + ' млрд ₽' : (unit * n / 1e6).toFixed(unit * n >= 1e7 ? 0 : 1).replace('.', ',') + ' млн ₽') : 'по запросу';
  const p = pace(n);
  $('[data-calc-time]').textContent = p.min === p.max ? 'около ' + mon(p.max) : `${p.min}–${mon(p.max)}`;
  $$('[data-m]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.m === id)));
  plotCells.forEach((c, i) => c.classList.toggle('on', i < n));
}
function tweenNumber(el, from, to, ms = 650) {
  if (reduced || from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  const tick = now => {
    const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (t < 1 && el.dataset.tw === String(to)) requestAnimationFrame(tick);
  };
  el.dataset.tw = to;
  requestAnimationFrame(tick);
}
$('[data-calc]').addEventListener('click', e => {
  const b = e.target.closest('[data-m]');
  if (b) { calcState.id = b.dataset.m; renderCalc(); }
});
$('[data-calc-range]').addEventListener('input', e => {
  calcState.n = +e.target.value;
  $('[data-calc-n]').textContent = calcState.n;
  renderCalc();
});

/* ---------- что происходит на каждом шаге ---------- */
const CALC_STEPS = [1, 10, 50, 100];
const hooks = {
  cover(s, { entering }) {
    if (entering && s === 0) queueDrop();
    else if (s > 0) showHouses();
  },
  panel(s) {
    const l = s > 0 ? LAYERS[s - 1] : null;
    lays.forEach((b, k) => b.classList.toggle('on', k === s - 1));
    stack.classList.toggle('is-open', !!l?.key);
    stack.classList.toggle('is-joint', !!l && !l.key);
    stack.classList.toggle('has-pin', !!l);
    $$('.l', stack).forEach(im => im.classList.toggle('act', !!l && im.dataset.l === l.key));
    if (l) {
      const p = l.key ? PIN[l.key] : [46, 2];
      stack.style.setProperty('--px', p[0] + '%');
      stack.style.setProperty('--py', p[1] + '%');
      $('[data-pin-text]').textContent = l.pin;
    }
  },
  build(s, { from, entering, dir }) {
    stepBtns.forEach((b, k) => { b.classList.toggle('on', k === s); b.classList.toggle('past', k < s); });
    const forward = entering ? dir > 0 && s === 0 : s === from + 1;
    buildGo(s, forward);
  },
  plant(s, { entering }) {
    setRate(s === 1 ? 5 : 10);
    if (entering && !reduced) {
      const v = $('video[data-once]');
      v.preload = 'auto';
      try { v.currentTime = 0; } catch { /* ещё не загружен */ }
      v.playbackRate = .3;
      v.play().catch(() => {});
    }
  },
  works(s) {
    $$('[data-works] figure').forEach((f, k) => f.classList.toggle('on', k === s));
    $$('[data-works-thumbs] .thumb').forEach((b, k) => b.classList.toggle('on', k === s));
  },
  calc(s) {
    const prevN = calcState.n;
    calcState.n = CALC_STEPS[s];
    tweenNumber($('[data-calc-n]'), prevN, calcState.n);
    renderCalc();
  },
};

/* ---------- подпись на главной кнопке: всегда видно, что будет дальше ---------- */
const LABELS = {
  cover: ['Показать модели на макете', 'Главные цифры'],
  panel: ['Разобрать панель по слоям', ...LAYERS.slice(1, 5).map(l => `Следующий слой: ${l.next}`), 'Как панели соединяются'],
  build: ['Поставить стены', 'Поставить несущие стены', 'Положить перекрытие', 'Поставить фермы', 'Закрыть крышу', 'Сделать фасад'],
  formats: ['Второй способ'],
  kit: ['Комплектации бань', 'Варианты для бани'],
  plant: ['А если заказ поменьше'],
  works: ['Следующее фото', 'Следующее фото', 'Следующее фото', 'Следующее фото'],
  calc: ['Посёлок на 10 объектов', 'Посёлок на 50 объектов', 'Посёлок на 100 объектов'],
};
const MODEL_LABELS = ['Смотреть интерьеры', 'Смотреть планировку'];
const goTxt = $('[data-go-txt]');
function setGoLabel(text) {
  const old = goTxt.lastElementChild;
  if (old && old.textContent === text) return;
  const n = document.createElement('span');
  n.textContent = text;
  goTxt.append(n);
  $('[data-next]').setAttribute('aria-label', text);
  if (!old || reduced) { if (old) old.remove(); return; }
  const o = { duration: 340, easing: 'cubic-bezier(.2,.75,.2,1)' };
  n.animate([{ transform: 'translate3d(0,110%,0)' }, { transform: 'none' }], o);
  old.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate3d(0,-110%,0)', opacity: 0 }], { ...o, fill: 'forwards' }).onfinish = () => old.remove();
}

/* ---------- движок: слайды, шаги и переход между разделами ---------- */
const slides = $$('.slide');
const byId = Object.fromEntries(slides.map((s, i) => [s.id, i]));
slides.forEach(s => { $$('[data-a]', s).forEach((el, k) => el.style.setProperty('--o', k)); });
const stepsOf = s => +((portrait.matches && s.dataset.stepsP) || s.dataset.steps || 0);
let cur = -1, step = 0, busy = false, presses = 0;
const wipe = $('[data-wipe]');
const NAMES = { about: 'О компании', panel: 'Панель FSP', build: 'Сборка дома', formats: 'Каталог', plant: 'Производство', works: 'Объекты', terms: 'Условия', request: 'Заявка', cover: 'МСК «ЗАПАД»' };

function loadAround(i) {
  [i, i + 1, i - 1, i + 2].forEach(k => {
    const s = slides[k];
    if (!s) return;
    $$('img[data-src]', s).forEach(im => {
      if (im.getAttribute('src')) return;
      im.decoding = 'async';
      im.addEventListener('load', () => im.classList.add('ok'), { once: true });
      im.src = fileOf(im.dataset.src, 'full' in im.dataset, +im.dataset.frac || .6);
      im.decode?.().catch(() => {});
    });
  });
}
function counts(root) {
  if (reduced) return;
  $$('[data-count]', root).forEach(el => {
    const to = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(to * e) + suf;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function nextLabel() {
  const el = slides[cur], n = stepsOf(el);
  if (step < n) return (el.dataset.id ? MODEL_LABELS : LABELS[el.id] || [])[step] || 'Дальше';
  if (cur < slides.length - 1) return 'Дальше: ' + slides[cur + 1].dataset.title;
  return 'Написать в WhatsApp';
}
const rail = $('.rail'), dot = $('.rail__dot'), navBtns = $$('[data-go]', rail);
/* Меню раскрывается при наведении, жёлтая рамка едет за курсором */
const hov = document.createElement('span');
hov.className = 'rail__hov';
hov.setAttribute('aria-hidden', 'true');
dot.after(hov);
navBtns.forEach((b, i) => b.style.setProperty('--i', i));
const kbMode = () => document.documentElement.classList.contains('kb');
function hoverTo(b) {
  const first = !rail.classList.contains('hov');
  if (first) hov.style.transition = 'none';
  hov.style.setProperty('--hy', b.offsetTop - hov.offsetTop + 'px');
  if (first) { void hov.offsetWidth; hov.style.transition = ''; }
  rail.classList.add('hov');
}
rail.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') rail.classList.add('open'); });
rail.addEventListener('pointerleave', () => rail.classList.remove('open', 'hov'));
rail.addEventListener('pointerover', e => {
  const b = e.target.closest('[data-go]');
  if (b && e.pointerType !== 'touch') hoverTo(b);
});
rail.addEventListener('focusin', e => {
  const b = e.target.closest('[data-go]');
  if (b && kbMode()) { rail.classList.add('open'); hoverTo(b); }
});
rail.addEventListener('focusout', e => { if (kbMode() && !rail.contains(e.relatedTarget)) rail.classList.remove('open', 'hov'); });
const progress = $('[data-progress]');
progress.innerHTML = slides.map(() => '<i></i>').join('');
const segs = $$('i', progress);
function paintChrome() {
  const el = slides[cur];
  $('[data-ctrl-count]').textContent = `${cur + 1} / ${slides.length}`;
  $('[data-ctrl-title]').textContent = el.dataset.title;
  segs.forEach((g, k) => g.style.setProperty('--p', k < cur ? 1 : k > cur ? 0 : ((step + 1) / (stepsOf(el) + 1)).toFixed(3)));
  $('[data-prev]').disabled = cur === 0 && step === 0;
  setGoLabel(nextLabel());
  const b = navBtns.find(x => x.dataset.go === el.dataset.nav);
  if (b) {
    navBtns.forEach(x => x.classList.toggle('on', x === b));
    dot.style.setProperty('--dy', b.offsetTop - dot.offsetTop + 'px');
  }
  history.replaceState(null, '', `#${el.id}${step ? '/' + step : ''}`);
}
function paintStep(s, ctx) {
  const el = slides[cur];
  $$('[data-step]', el).forEach(n => n.classList.toggle('shown', +n.dataset.step <= s));
  $$('[data-on]', el).forEach(n => n.classList.toggle('on', n.dataset.on.split(',').includes(String(s))));
  el.className = el.className.replace(/\bst-\d+\b/g, '').replace(/\s+/g, ' ').trim();
  el.classList.add('st-' + s);
  (hooks[el.id] || (() => {}))(s, ctx);
  // На вертикальном экране карточка модели ровно по тексту, остальное отдаём картинке
  const body = $('.m-body', el);
  if (body) body.style.height = portrait.matches ? $('.m-page.on', body).offsetHeight + 'px' : '';
  if (ctx.from !== undefined && s > ctx.from) $$(`[data-step="${s}"]`, el).forEach(counts);
  paintChrome();
}
function swap(i, s, dir) {
  document.documentElement.style.setProperty('--dir', dir);
  const prev = slides[cur], el = slides[i];
  if (prev && prev !== el) {
    prev.classList.add('leaving');
    prev.classList.remove('active');
    setTimeout(() => { prev.classList.remove('leaving'); if (slides[cur] !== prev) prev.classList.remove('show'); }, reduced ? 0 : 300);
  }
  cur = i; step = s;
  loadAround(i);
  el.classList.remove('leaving');
  el.classList.add('show');
  paintStep(s, { entering: true, from: -1, dir });
  void el.offsetWidth;
  el.classList.add('active');
  $$('[data-count]', el).forEach(n => { if (!n.closest('[data-step]')) counts(n.parentElement); });
}
function show(i, s = 0, dir = 1) {
  const newSection = cur >= 0 && slides[i].dataset.nav !== slides[cur].dataset.nav && dir > 0;
  if (!newSection || reduced) { swap(i, s, dir); return; }
  // Панели встают в стену, под ними меняется слайд, панели уходят вверх
  busy = true;
  $('[data-wipe-title]').textContent = NAMES[slides[i].dataset.nav] || '';
  wipe.classList.remove('out');
  wipe.classList.add('in');
  setTimeout(() => {
    swap(i, s, dir);
    busy = false;
    setTimeout(() => {
      wipe.classList.remove('in');
      wipe.classList.add('out');
      setTimeout(() => wipe.classList.remove('out'), 460);
    }, 90);
  }, 400);
}
function firstPress() {
  presses++;
  if (presses === 1) {
    $('[data-next]').classList.remove('is-first');
    $('[data-tip]').classList.add('gone');
  }
  clearTimeout(nudgeT);
  if (presses < 3) nudgeT = setTimeout(nudge, 6000);
}
let nudgeT = 0;
function nudge() {
  const b = $('[data-next]');
  b.classList.add('nudge');
  setTimeout(() => b.classList.remove('nudge'), 2100);
  nudgeT = setTimeout(nudge, 9000);
}
function next(viaButton) {
  if (busy) return;
  firstPress();
  const el = slides[cur];
  if (step < stepsOf(el)) { const from = step; step++; paintStep(step, { from, dir: 1 }); return; }
  if (cur < slides.length - 1) { show(cur + 1, 0, 1); return; }
  if (viaButton !== true) return;
  refreshSend();
  window.open(waLink.href, '_blank', 'noopener');
}
function prev() {
  if (busy) return;
  if (step > 0) { const from = step; step--; paintStep(step, { from, dir: -1 }); return; }
  if (cur > 0) { const k = cur - 1; show(k, stepsOf(slides[k]), -1); }
}
function jump(id, s = 0) {
  const k = byId[id];
  if (k === undefined || busy) return;
  firstPress();
  if (k === cur) { const from = step; step = s; paintStep(s, { from: from === s - 1 ? from : s, dir: 1 }); return; }
  show(k, s, k > cur ? 1 : -1);
}
$('[data-next]').addEventListener('click', () => next(true));
$('[data-prev]').addEventListener('click', prev);

/* ---------- фото крупно: нажал на картинку, она открылась на весь экран ---------- */
const ZOOM = '.m-media img, .photo img, .works__media img, .format>img, .draw img, .doc img, .ser__pic img';
const lb = $('[data-lb]'), lbImg = $('img', lb), lbCap = $('[data-lb-cap]', lb);
let lbList = [], lbI = 0;
function lbShow(i) {
  lbI = (i + lbList.length) % lbList.length;
  const im = lbList[lbI];
  lbImg.src = fileOf(im.dataset.src, true);
  lbImg.alt = im.alt;
  lbCap.textContent = im.alt;
}
function lbOpen(im) {
  lbList = $$(ZOOM, im.closest('.slide')).filter(x => x.dataset.src);
  lb.classList.toggle('single', lbList.length < 2);
  lbShow(lbList.indexOf(im));
  lb.hidden = false;
  void lb.offsetWidth;
  lb.classList.add('open');
}
function lbClose() {
  if (lb.hidden) return;
  lb.classList.remove('open');
  setTimeout(() => { lb.hidden = true; lbImg.removeAttribute('src'); }, reduced ? 0 : 250);
}
lb.addEventListener('click', e => {
  if (e.target.closest('.lb__p')) return lbShow(lbI - 1);
  if (e.target.closest('.lb__n')) return lbShow(lbI + 1);
  lbClose();
});
let lx = 0;
lb.addEventListener('touchstart', e => { lx = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - lx;
  if (Math.abs(dx) > 48 && lbList.length > 1) { e.preventDefault(); lbShow(lbI + (dx < 0 ? 1 : -1)); }
});

/* ---------- клавиатура и свайп; колёсико мыши ничего не листает ---------- */
addEventListener('keydown', e => {
  if (e.key === 'Tab') document.documentElement.classList.add('kb');
  if (!lb.hidden) {
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowRight') lbShow(lbI + 1);
    if (e.key === 'ArrowLeft') lbShow(lbI - 1);
    e.preventDefault();
    return;
  }
  const t = e.target;
  if (t.closest?.('input,select,textarea')) { if (e.key === 'Escape') t.blur(); return; }
  if (!$('[data-sheet]').hidden) { if (e.key === 'Escape') closeSheet(); return; }
  const onControl = t.closest?.('button,a');
  if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key) || ((e.key === ' ' || e.key === 'Enter') && !onControl)) { e.preventDefault(); next(); }
  if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); prev(); }
  if (e.key === 'Home') { e.preventDefault(); jump('cover'); }
  if (e.key === 'End') { e.preventDefault(); jump('request'); }
});
// Колёсико не листает: вместо этого главная кнопка подсказывает, куда нажать
let wheelT = 0;
addEventListener('wheel', () => {
  const now = performance.now();
  if (now - wheelT < 1600) return;
  wheelT = now;
  const b = $('[data-next]');
  b.classList.remove('ping');
  void b.offsetWidth;
  b.classList.add('ping');
}, { passive: true });
let tx = 0, ty = 0, tOk = false;
$('.deck').addEventListener('touchstart', e => {
  const t = e.touches[0];
  tx = t.clientX; ty = t.clientY;
  tOk = !e.target.closest('input,select,textarea,form');
}, { passive: true });
$('.deck').addEventListener('touchend', e => {
  if (!tOk) return;
  const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? next : prev)();
}, { passive: true });

/* ---------- остальные кнопки: после клика фокус возвращается на главную ---------- */
const refocus = e => { if (e.detail > 0 && !portrait.matches) $('[data-next]').focus({ preventScroll: true }); };
document.addEventListener('click', e => {
  const zi = e.target.closest(ZOOM);
  if (zi && zi.dataset.src && !e.target.closest('.thumb')) return lbOpen(zi);
  const go = e.target.closest('[data-go]');
  if (go) { closeSheet(); refocus(e); return jump(go.dataset.go); }
  const spot = e.target.closest('[data-model]');
  if (spot) { refocus(e); return jump(spot.dataset.model); }
  const j = e.target.closest('[data-jump]');
  if (j) { refocus(e); const from = step; step = +j.dataset.jump; paintStep(step, { from: step === from + 1 ? from : step, dir: 1 }); return; }
  if (e.target.closest('[data-order]')) {
    const el = slides[cur];
    if (el.dataset.id) setRequest(MODELS[el.dataset.id].name);
    if (el.id === 'custom') setRequest('Домокомплект по нашему проекту');
    if (el.id === 'calc') setRequest(MODELS[calcState.id].name, calcState.n);
    jump('request');
  }
});

/* ---------- список разделов на вертикальном экране ---------- */
const sheet = $('[data-sheet]'), sheetList = $('[data-sheet-list]');
sheetList.innerHTML = navBtns.map(b => `<button type="button" data-go="${b.dataset.go}">${$('span', b).textContent}</button>`).join('');
function closeSheet() {
  if (sheet.hidden) return;
  sheet.classList.remove('open');
  setTimeout(() => { sheet.hidden = true; }, reduced ? 0 : 250);
  $('[data-menu]').setAttribute('aria-expanded', 'false');
}
$('[data-menu]').addEventListener('click', () => {
  const nav = slides[cur].dataset.nav;
  $$('button', sheetList).forEach(b => b.classList.toggle('on', b.dataset.go === nav));
  sheet.hidden = false;
  void sheet.offsetWidth;
  sheet.classList.add('open');
  $('[data-menu]').setAttribute('aria-expanded', 'true');
});
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });

/* ---------- заявка ---------- */
const reqForm = $('[data-req]');
const waLink = $('[data-send=wa]', reqForm);
function setRequest(what, count) {
  const opt = [...reqForm.what.options].find(o => o.text === what);
  if (opt) reqForm.what.value = opt.text;
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
  waLink.href = `https://wa.me/79197233232?text=${t}`;
  $('[data-send=mail]').href = `mailto:msckzapad@yandex.ru?subject=${encodeURIComponent('Запрос расчёта: FSP PANEL')}&body=${t}`;
}
reqForm.addEventListener('input', refreshSend);
refreshSend();
const copied = $('[data-copied]');
$('[data-send=tg]').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(requestText()); copied.textContent = 'Текст заявки скопирован. Вставьте его в чат Telegram.'; copied.hidden = false; } catch { /* откроется чат */ }
});
// В MAX нельзя открыть чат по ссылке: копируем номер и подсказываем, где его найти
$('[data-send=max]').addEventListener('click', async () => {
  let ok = true;
  try { await navigator.clipboard.writeText('+79197233232'); } catch { ok = false; }
  copied.textContent = ok ? 'Номер +7 919 723-32-32 скопирован. Найдите его в MAX и отправьте заявку.' : 'Найдите в MAX номер +7 919 723-32-32 и отправьте заявку.';
  copied.hidden = false;
});

/* ---------- старт ---------- */
renderCalc();
const [h, hs] = decodeURIComponent(location.hash.slice(1)).split('/');
const startI = byId[h] ?? 0;
swap(startI, Math.min(+hs || 0, stepsOf(slides[startI])), 1);
if (startI > 0 || hs) { presses = 3; $('[data-next]').classList.remove('is-first'); $('[data-tip]').classList.add('gone'); }
if (!portrait.matches) $('[data-next]').focus({ preventScroll: true });
addEventListener('resize', () => {
  const n = stepsOf(slides[cur]);
  if (step > n) step = n;
  paintStep(step, { from: step, dir: 1 });
}, { passive: true });
// Остальные картинки подгружаем в простое, чтобы дальше листалось без пауз
const idle = window.requestIdleCallback || (f => setTimeout(f, 400));
const net = navigator.connection;
const thrifty = net?.saveData || /2g|3g/.test(net?.effectiveType || '');
let li = 0;
(function warm() {
  // На телефоне экономим трафик: соседние слайды и так подгружаются заранее
  if (thrifty || (portrait.matches && innerWidth < 600) || li >= slides.length) return;
  loadAround(li); li += 2;
  setTimeout(() => idle(warm), 600);
})();
