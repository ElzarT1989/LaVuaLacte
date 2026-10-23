import { createStage } from './stage.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const story = $('#story');
const canvas = $('#gl');
const chapters = $$('.chapter').map((el) => ({
  el, a: +el.dataset.a, b: +el.dataset.b, f: +(el.dataset.f || 0.018),
}));
const railItems = $$('.rail a');
const loader = $('#loader');

/* WhatsApp-ссылки */
const WA = 'https://wa.me/996700309610';
$$('[data-wa]').forEach((a) => {
  a.href = `${WA}?text=${encodeURIComponent(a.dataset.wa)}`;
  a.target = '_blank'; a.rel = 'noopener';
});
$('#year') && ($('#year').textContent = new Date().getFullYear());

/* меню */
const burger = $('#burger');
burger.addEventListener('click', () => {
  const open = root.classList.toggle('menu-open');
  burger.setAttribute('aria-expanded', String(open));
});
$$('.nav a').forEach((a) => a.addEventListener('click', () => {
  root.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false');
}));

/* прогресс прокрутки сториборда */
function scrollP() {
  const r = story.getBoundingClientRect();
  const total = story.offsetHeight - innerHeight;
  return clamp(-r.top / total, 0, 1);
}

let stage = null;
function hideLoader() {
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 1200);
}
function fail() {
  root.classList.add('no-gl');
  hideLoader();
}

const q = new URLSearchParams(location.search);
try {
  stage = createStage(canvas, {
    onReady: hideLoader, onFail: fail, reduced,
    fixedTime: q.has('t') ? +q.get('t') : null,
    fixedScale: q.has('scale') ? +q.get('scale') : null,
  });
} catch (e) {
  console.error(e); fail();
}
if (!stage) fail();

if (stage) {
  const onScroll = () => stage.setTarget(scrollP());
  if (!q.has('p')) {
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
  }
  stage.setTarget(scrollP(), true);
  if (q.has('p')) { stage.setTarget(+q.get('p'), true); stage.state.P = +q.get('p'); stage.state.fade = 0; }

  /* отладка: LVL.go(0.3) */
  window.LVL = {
    go(p) { stage.setTarget(p, true); stage.state.P = p; },
    stats: stage.stats,
  };

  /* показ глав — по сглаженному прогрессу */
  let lastP = -1;
  const tick = () => {
    requestAnimationFrame(tick);
    const P = stage.state.P;
    if (Math.abs(P - lastP) < 0.00005) return;
    lastP = P;
    for (const c of chapters) {
      const o = smooth(c.a, c.a + c.f, P) * (1 - smooth(c.b - c.f, c.b, P));
      c.el.style.opacity = o.toFixed(3);
      c.el.style.translate = `0 ${((1 - o) * 26).toFixed(1)}px`;
      c.el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    }
    const stageOn = P > 0.0 && P < 0.999;
    root.classList.toggle('stage-end', P > 0.985);
    let act = 0;
    railItems.forEach((a, i) => { if (P >= +a.dataset.p - 0.02) act = i; });
    railItems.forEach((a, i) => a.classList.toggle('on', i === act));
    $('.scroll-hint').style.opacity = (1 - smooth(0.0, 0.03, P)).toFixed(2);
    void stageOn;
  };
  tick();

  $$('.rail a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const total = story.offsetHeight - innerHeight;
    const top = story.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + (+a.dataset.p + 0.012) * total, behavior: reduced ? 'auto' : 'smooth' });
  }));
}

$$('a[href="#story"]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault(); scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
}));

/* появление блоков ниже сториборда */
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.15 });
$$('.reveal').forEach((el) => io.observe(el));

/* подсветка слов в большом тезисе при прокрутке */
const lit = $('#lit');
if (lit) {
  const words = lit.textContent.trim().split(/\s+/);
  lit.innerHTML = words.map((w) => `<span>${w}</span>`).join(' ');
  const spans = $$('span', lit);
  const upd = () => {
    const r = lit.getBoundingClientRect();
    const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
    const n = p * spans.length;
    spans.forEach((s, i) => s.classList.toggle('on', i < n));
  };
  addEventListener('scroll', upd, { passive: true });
  upd();
}
