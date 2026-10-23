(() => {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Загрузка ---------- */
  const reveal = () => {
    if (root.classList.contains('is-ready')) return;
    root.classList.add('is-ready');
    setTimeout(() => root.classList.add('is-done'), 1700);
  };
  const minWait = new Promise((r) => setTimeout(r, reduce ? 0 : 1300));
  const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r)));
  Promise.all([minWait, loaded]).then(reveal);
  setTimeout(reveal, 4000);

  /* ---------- WhatsApp-ссылки с текстом ---------- */
  $$('[data-wa]').forEach((a) => {
    a.href = 'https://wa.me/996700309610?text=' + encodeURIComponent(a.dataset.wa);
  });

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Меню ---------- */
  const burger = $('#burger'), nav = $('#nav'), header = $('#header');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Скролл: прогресс, шапка, подсветка текста ---------- */
  const bar = $('#progress');
  const lit = $('#lit');
  let litWords = [];
  if (lit) {
    litWords = lit.textContent.trim().split(/\s+/).map((w) => {
      const s = document.createElement('span');
      s.textContent = w + ' ';
      return s;
    });
    lit.textContent = '';
    litWords.forEach((s) => lit.appendChild(s));
  }

  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    header.classList.toggle('is-solid', y > 40);
    if (lit) {
      const r = lit.getBoundingClientRect();
      const p = clamp((innerHeight * 0.85 - r.top) / (innerHeight * 0.55 + r.height), 0, 1);
      const n = Math.round(p * litWords.length);
      litWords.forEach((s, i) => s.classList.toggle('on', i < n));
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Появление блоков ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));

  /* ---------- Счётчики ---------- */
  const since = $('[data-since]');
  if (since) since.dataset.count = String(new Date().getFullYear() - Number(since.dataset.since));
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const target = Number(e.target.dataset.count);
      if (reduce) { e.target.textContent = target; return; }
      const t0 = performance.now(), dur = 1800;
      const tick = (t) => {
        const k = clamp((t - t0) / dur, 0, 1);
        e.target.textContent = Math.round(target * (1 - Math.pow(1 - k, 4)));
        if (k < 1) requestAnimationFrame(tick);
      };
      e.target.textContent = '0';
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- Процесс: активный шаг ---------- */
  const steps = $$('.pstep'), scenes = $$('.scene'), pnum = $('#pnum');
  if (steps.length) {
    const stepIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const i = Number(e.target.dataset.step);
        steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
        scenes.forEach((s, k) => s.classList.toggle('is-active', k === i));
        pnum.textContent = String(i + 1).padStart(2, '0');
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => stepIO.observe(s));
  }

  /* ---------- Слоты для фото: /img/<имя>.jpg|webp заменяет иллюстрацию ---------- */
  $$('[data-photo]').forEach((fig) => {
    const name = fig.dataset.photo;
    const exts = ['webp', 'jpg', 'jpeg', 'png'];
    const tryNext = (i) => {
      if (i >= exts.length) return;
      const img = new Image();
      img.className = 'ph__img';
      img.alt = fig.querySelector('figcaption')?.textContent || '';
      img.onload = () => { fig.appendChild(img); requestAnimationFrame(() => fig.classList.add('has-photo')); };
      img.onerror = () => tryNext(i + 1);
      img.src = `/img/${name}.${exts[i]}`;
    };
    tryNext(0);
  });

  if (reduce) return;

  /* ---------- Курсор ---------- */
  const cursor = $('#cursor');
  if (finePointer && cursor) {
    document.body.classList.add('has-cursor');
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', (e) => cursor.classList.toggle('is-hover', !!e.target.closest('a, button')));
  }

  /* ---------- Магнитные кнопки ---------- */
  if (finePointer) {
    $$('.magnetic').forEach((b) => {
      b.addEventListener('mousemove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });

    /* ---------- 3D-наклон карточек ---------- */
    $$('.tilt').forEach((c) => {
      c.addEventListener('mousemove', (e) => {
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.transform = `perspective(1000px) rotateY(${(px - 0.5) * 9}deg) rotateX(${(0.5 - py) * 9}deg) translateZ(0)`;
        c.style.setProperty('--gx', px * 100 + '%');
        c.style.setProperty('--gy', py * 100 + '%');
      });
      c.addEventListener('mouseleave', () => { c.style.transform = ''; });
    });
  }

  /* ---------- Hero: параллакс по мыши ---------- */
  const stage = $('#stage');
  const layers = $$('.layer', stage || document);
  if (stage && finePointer) {
    let mx = 0, my = 0, px = 0, py = 0;
    addEventListener('mousemove', (e) => {
      mx = (e.clientX / innerWidth - 0.5) * 2;
      my = (e.clientY / innerHeight - 0.5) * 2;
    });
    (function loop() {
      px += (mx - px) * 0.07; py += (my - py) * 0.07;
      layers.forEach((l) => {
        const d = Number(l.dataset.depth) * 1000;
        l.style.transform = `translate3d(${-px * d}px, ${-py * d}px, 0)`;
      });
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Hero: золотая пыль ---------- */
  const cv = $('#dust');
  if (cv) {
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, visible = true;
    const N = innerWidth < 760 ? 34 : 70;
    const dots = Array.from({ length: N }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.00012, vy: -(Math.random() * 0.00022 + 0.00005),
      a: Math.random() * 0.6 + 0.2, p: Math.random() * 6.28,
    }));
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size(); addEventListener('resize', size);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);
    let last = performance.now();
    (function frame(t) {
      requestAnimationFrame(frame);
      if (!visible) { last = t; return; }
      const dt = Math.min(t - last, 50); last = t;
      ctx.clearRect(0, 0, w, h);
      dots.forEach((d) => {
        d.x += d.vx * dt; d.y += d.vy * dt; d.p += dt * 0.002;
        if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
        if (d.x < -0.02) d.x = 1.02; if (d.x > 1.02) d.x = -0.02;
        const x = d.x * w, y = d.y * h, tw = 0.6 + Math.sin(d.p) * 0.4;
        const g = ctx.createRadialGradient(x, y, 0, x, y, d.r * 5);
        g.addColorStop(0, `rgba(246, 213, 124, ${d.a * tw})`);
        g.addColorStop(1, 'rgba(246, 213, 124, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, d.r * 5, 0, 6.283); ctx.fill();
      });
    })(last);
  }
})();
