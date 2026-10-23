/* WebGL2-сцена: сцена → буфер с субпиксельным сдвигом → накопление (TAA) → пост-проход (резкость, блум, молочная шторка) → FXAA на размере экрана. */
import { VERT, SCENES, RESOLVE, POST, FXAA } from './shaders.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

/* центры молочных шторок и их полуширина по прогрессу прокрутки */
export const CUTS = [0.18, 0.46, 0.68];
const HW = 0.03;

export function layout(P) {
  const scene = P < CUTS[0] ? 0 : P < CUTS[1] ? 1 : P < CUTS[2] ? 2 : 3;
  const lo = scene === 0 ? 0 : CUTS[scene - 1] + HW;
  const hi = scene === 3 ? 1 : CUTS[scene] - HW;
  const u = clamp((P - lo) / (hi - lo), 0, 1);
  let wx = 0, wy = 0;
  for (let i = 0; i < 3; i++) {
    const t = (P - (CUTS[i] - HW)) / (2 * HW);
    if (t > 0 && t < 1) { wx = clamp(t * 1.7, 0, 1); wy = clamp((t - 0.4) * 1.8, 0, 1); }
  }
  return { scene, u, wx, wy };
}

const DBG = /debug/.test(location.search);
const UNIFORMS = ['uRes', 'uTime', 'uU', 'uMouse', 'uShift', 'uJit', 'uTex', 'uTexRes', 'uWipe', 'uFade', 'uCur', 'uHist', 'uAlpha'];

export function createStage(canvas, { onReady, onFail, reduced = false, fixedTime = null, fixedScale = null } = {}) {
  const gl = canvas.getContext('webgl2', {
    antialias: false, alpha: false, depth: false, stencil: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: false,
  });
  if (!gl) { onFail && onFail('webgl2'); return null; }

  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const floatRT = !!gl.getExtension('EXT_color_buffer_float');
  gl.bindVertexArray(gl.createVertexArray());

  /* ---------- программы ---------- */
  function makeProgram(fsSrc) {
    const p = gl.createProgram();
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, VERT); gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSrc); gl.compileShader(fs);
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.linkProgram(p);
    return { p, vs, fs, ready: false, failed: false, u: null, t0: performance.now() };
  }
  function poll(pr) {
    if (pr.ready || pr.failed) return pr.ready;
    if (parallel && !gl.getProgramParameter(pr.p, parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(pr.p, gl.LINK_STATUS)) {
      pr.failed = true;
      const log = gl.getShaderInfoLog(pr.fs) || gl.getProgramInfoLog(pr.p);
      console.error('[LVL] shader', log);
      if (DBG) {
        const d = document.createElement('pre');
        d.style.cssText = 'position:fixed;z-index:999;left:0;top:0;color:#f88;background:#000;font:11px monospace;max-width:100vw;white-space:pre-wrap';
        d.textContent = log; document.body.append(d);
      }
      return false;
    }
    pr.ready = true;
    DBG && console.log('[LVL] program ready', Math.round(performance.now() - pr.t0) + 'ms');
    pr.u = {};
    for (const n of UNIFORMS) pr.u[n] = gl.getUniformLocation(pr.p, n);
    return true;
  }

  const post = makeProgram(POST);
  const resolve = makeProgram(RESOLVE);
  const aa = makeProgram(FXAA);
  const scenes = SCENES.map(() => null);
  const compileScene = (i) => { if (!scenes[i]) scenes[i] = makeProgram(SCENES[i]); };
  compileScene(0);

  /* ---------- буферы: текущий кадр + два буфера истории (с мипами для блума) ---------- */
  const fmt = floatRT ? gl.RGBA16F : gl.RGBA8;
  const B = { w: 0, h: 0, cur: null, hist: [null, null], r: 0, ldr: null, lw: 0, lh: 0 };
  function makeTarget(w, h, mips, format = fmt, linear = mips) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, mips ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1, format, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : linear ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo };
  }
  function freeTargets() {
    for (const t of [B.cur, ...B.hist]) if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); }
  }
  function allocTargets(w, h) {
    if (w === B.w && h === B.h) return;
    freeTargets();
    B.w = w; B.h = h;
    B.cur = makeTarget(w, h, false);
    B.hist = [makeTarget(w, h, true), makeTarget(w, h, true)];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    S.reset = 2; /* история пуста — первый кадр берём как есть */
  }

  /* ---------- состояние ---------- */
  const coarse = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
  /* ступени разрешения сцены (доля от размера холста): меняем редко и только на соседнюю ступень */
  const STEPS = fixedScale ? [fixedScale] : coarse ? [0.4, 0.5, 0.6, 0.7, 0.8] : [0.5, 0.58, 0.67, 0.77, 0.88, 1];
  const START = fixedScale ? 0 : coarse ? 1 : 2;
  const S = {
    target: 0, P: 0, time: reduced ? 3 : 0, mx: 0, my: 0, tmx: 0, tmy: 0,
    cw: 0, ch: 0, visible: true, fade: 1, hold: 0,
    bgNext: 1, bgAt: 0, ready: false, last: 0, immediate: false,
    si: SCENES.map(() => START), maxi: SCENES.map(() => STEPS.length - 1),
    ema: 16, slow: 0, fast: 0, warm: 0, block: 0, frames: 0, reset: 2, jf: 0,
    pP: 0, pmx: 0, pmy: 0, lastScene: -1, maxDt: 0, warmed: [true, false, false, false],
  };
  if (fixedTime !== null) { S.time = fixedTime; reduced = true; }

  /* холст: не больше ~2 Мп (3D-кадр после этого увеличивается бикубикой), размер меняем с задержкой — без дёрганья при изменении окна */
  const MAXPX = coarse ? 1.3e6 : 2.1e6;
  function measure() {
    const cssW = Math.max(2, canvas.clientWidth), cssH = Math.max(2, canvas.clientHeight);
    const dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(MAXPX / (cssW * cssH)));
    const w = Math.max(2, Math.round(cssW * dpr)), h = Math.max(2, Math.round(cssH * dpr));
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; }
    S.cw = w; S.ch = h;
  }
  let rzT = 0;
  new ResizeObserver(() => { clearTimeout(rzT); rzT = setTimeout(measure, S.cw ? 140 : 0); }).observe(canvas);
  measure();

  new IntersectionObserver((e) => { S.visible = e[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
  addEventListener('pointermove', (e) => {
    S.tmx = (e.clientX / innerWidth - 0.5) * 2;
    S.tmy = (e.clientY / innerHeight - 0.5) * -2;
  }, { passive: true });

  gl.canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    console.warn('[LVL] context lost', { P: S.P, step: S.si });
    /* одна попытка перезагрузки; если повторится — обычная версия без 3D */
    let again = false;
    try { again = !sessionStorage.getItem('lvl-retry'); sessionStorage.setItem('lvl-retry', '1'); } catch {}
    if (again && !DBG) { location.reload(); return; }
    onFail && onFail('lost');
  });

  /* ---------- отрисовка ---------- */
  const ok = (sc) => !!scenes[sc] && poll(scenes[sc]);

  function drawScene(sc, lay, jx, jy) {
    const pr = scenes[sc];
    const k = STEPS[S.si[sc]];
    const sw = Math.max(2, Math.round(S.cw * k)), sh = Math.max(2, Math.round(S.ch * k));
    allocTargets(sw, sh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.cur.fbo);
    gl.viewport(0, 0, sw, sh);
    gl.useProgram(pr.p);
    gl.uniform2f(pr.u.uRes, sw, sh);
    gl.uniform1f(pr.u.uTime, S.time);
    gl.uniform1f(pr.u.uU, lay.u);
    gl.uniform2f(pr.u.uMouse, S.mx, S.my);
    const wide = S.cw / S.ch > 1.15;
    gl.uniform1f(pr.u.uShift, sc === 0 && wide ? 0.55 * (1 - smooth(0.04, 0.55, lay.u)) : 0);
    gl.uniform2f(pr.u.uJit, jx, jy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* накопление: история[r] + текущий → история[1-r]; мипы нужны блуму */
  function drawResolve(alpha) {
    const w = 1 - B.r;
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.hist[w].fbo);
    gl.viewport(0, 0, B.w, B.h);
    gl.useProgram(resolve.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, B.cur.tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, B.hist[B.r].tex);
    gl.uniform1i(resolve.u.uCur, 0);
    gl.uniform1i(resolve.u.uHist, 1);
    gl.uniform1f(resolve.u.uAlpha, alpha);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, B.hist[w].tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    B.r = w;
  }

  function drawPost(lay) {
    if (B.lw !== S.cw || B.lh !== S.ch) {
      if (B.ldr) { gl.deleteTexture(B.ldr.tex); gl.deleteFramebuffer(B.ldr.fbo); }
      B.ldr = makeTarget(S.cw, S.ch, false, gl.RGBA8, true);
      B.lw = S.cw; B.lh = S.ch;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.ldr.fbo);
    gl.viewport(0, 0, S.cw, S.ch);
    gl.useProgram(post.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, B.hist[B.r].tex);
    gl.uniform1i(post.u.uTex, 0);
    gl.uniform2f(post.u.uRes, S.cw, S.ch);
    gl.uniform2f(post.u.uTexRes, B.w, B.h);
    gl.uniform1f(post.u.uTime, S.time);
    gl.uniform2f(post.u.uWipe, lay.wx, lay.wy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* сглаживание краёв по готовому изображению, затем дизеринг и плавное появление */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(aa.p);
    gl.bindTexture(gl.TEXTURE_2D, B.ldr.tex);
    gl.uniform1i(aa.u.uTex, 0);
    gl.uniform2f(aa.u.uRes, S.cw, S.ch);
    gl.uniform1f(aa.u.uTime, S.time);
    gl.uniform1f(aa.u.uFade, S.fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* один пробный проход по крошечному буферу: драйвер заканчивает сборку шейдера заранее, а не в момент перехода */
  let warmT = null;
  function warmUp(pr) {
    if (!warmT) warmT = makeTarget(8, 8, false);
    gl.bindFramebuffer(gl.FRAMEBUFFER, warmT.fbo);
    gl.viewport(0, 0, 8, 8);
    gl.useProgram(pr.p);
    gl.uniform2f(pr.u.uRes, 8, 8);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /* адаптивное разрешение — по ступеням, отдельно для каждой сцены */
  function adapt(sc, ms, compiling) {
    if (S.warm > 0) { S.warm--; return; }
    if (ms > 25) { S.slow++; S.fast = 0; } else if (ms < 15) { S.fast++; S.slow = 0; } else { S.slow = 0; S.fast = 0; }
    if (S.block > 0) S.block--;
    if (S.slow > 10 && S.si[sc] > 0) {
      /* если вернулись на ступень, которая уже не тянула, — больше туда не поднимаемся */
      if (S.block > 0) S.maxi[sc] = Math.max(0, S.si[sc] - 1);
      S.si[sc]--; S.slow = 0; S.block = 900;
    } else if (S.fast > 150 && !compiling && S.si[sc] < S.maxi[sc]) {
      S.si[sc]++; S.fast = 0;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const raw = (now - S.last) / 1000 || 0.016;
    const dt = Math.min(0.1, raw);
    S.last = now;
    if (!S.visible && S.ready) return;
    if (document.hidden) return;

    /* первый кадр: ждём главную сцену и пост-проходы */
    if (!S.ready) {
      if (scenes[0] && poll(scenes[0]) && poll(post) && poll(resolve) && poll(aa)) {
        S.ready = true; S.bgAt = now + 500;
        onReady && onReady();
      } else return;
    }

    /* какие сцены уже собраны: пока следующая не готова, прокрутка упирается в молочную шторку */
    let cap = 1;
    for (let k = 1; k < scenes.length; k++) {
      if (!(scenes[k] && (poll(scenes[k]) || scenes[k].failed))) { cap = CUTS[k - 1] - HW * 0.15; break; }
    }
    S.P = S.immediate ? S.target : S.P + (S.target - S.P) * (1 - Math.exp(-dt * 5.5));
    S.immediate = false;
    if (S.P > cap) S.P = cap;
    const holding = S.target > cap + 1e-4 && S.P >= cap - 0.003;
    S.hold += ((holding ? 1 : 0) - S.hold) * (1 - Math.exp(-dt * (holding ? 9 : 6)));

    S.mx += (S.tmx - S.mx) * (1 - Math.exp(-dt * 3));
    S.my += (S.tmy - S.my) * (1 - Math.exp(-dt * 3));
    if (!reduced) S.time += dt;
    if (S.fade > 0) S.fade = Math.max(0, S.fade - dt * 1.6);

    /* остальные сцены собираем по одной: параллельная сборка тяжёлых шейдеров вешает драйвер */
    const compiling = S.bgNext < scenes.length;
    if (compiling && now > S.bgAt) {
      const pr = scenes[S.bgNext];
      if (!pr) compileScene(S.bgNext);
      else if (poll(pr) || pr.failed) { if (pr.ready) warmUp(pr); S.bgNext++; S.bgAt = now + 250; }
    }

    const lay = layout(clamp(S.P, 0, 1));
    lay.wx += (1 - lay.wx) * S.hold;
    lay.wy -= lay.wy * S.hold;

    let sc = lay.scene;
    if (!scenes[sc]) compileScene(sc);
    while (sc > 0 && !ok(sc)) sc--;
    if (sc !== S.lastScene) { S.reset = Math.max(S.reset, 1); S.lastScene = sc; S.warm = 25; S.slow = S.fast = 0; }

    /* сила накопления: чем быстрее движется кадр, тем больше берём от текущего (иначе «шлейф») */
    const dP = Math.abs(S.P - S.pP) / Math.max(dt, 1e-3);
    const dM = (Math.abs(S.mx - S.pmx) + Math.abs(S.my - S.pmy)) / Math.max(dt, 1e-3);
    S.pP = S.P; S.pmx = S.mx; S.pmy = S.my;
    const mv = Math.max(smooth(0.003, 0.05, dP), smooth(0.03, 0.4, dM));
    /* при движении история не отбрасывается, а лишь слабее учитывается: края остаются сглаженными и на прокрутке */
    const base = !floatRT ? 1 : reduced ? 0.1 : sc === 0 ? 0.24 : 0.16;
    let alpha = floatRT ? mix(base, 0.5, mv) : 1;
    let jit = floatRT ? 1 : 0;
    if (S.reset > 0) { alpha = 1; jit = 0; S.reset--; }
    S.jf = S.jf % 16 + 1;
    const jx = (halton(S.jf, 2) - 0.5) * jit, jy = (halton(S.jf, 3) - 0.5) * jit;

    if (ok(sc)) {
      const c0 = performance.now();
      drawScene(sc, lay, jx, jy);
      const c1 = performance.now();
      drawResolve(alpha);
      const c2 = performance.now();
      drawPost(lay);
      const c3 = performance.now();
      if (DBG && c3 - c0 > 30) console.log('[LVL] slow frame', sc, Math.round(c1 - c0), Math.round(c2 - c1), Math.round(c3 - c2));
    }

    /* замер кадра: выбросы (сборка шейдеров, скачки вкладки) не должны сбивать разрешение */
    S.ema += (Math.min(raw * 1000, 40) - S.ema) * 0.08;
    S.frames++;
    S.maxDt = Math.max(S.maxDt, raw * 1000);
    if (S.frames > 20) adapt(sc, S.ema, compiling);
  }
  requestAnimationFrame(frame);

  return {
    setTarget(p, immediate) { S.target = clamp(p, 0, 1); if (immediate) { S.immediate = true; } },
    stats: () => ({
      scale: STEPS[S.si[S.lastScene < 0 ? 0 : S.lastScene]], ms: +S.ema.toFixed(1), maxDt: Math.round(S.maxDt),
      P: +S.P.toFixed(3), w: S.cw, h: S.ch, rw: B.w, rh: B.h, floatRT, hold: +S.hold.toFixed(2),
    }),
    resetMax() { S.maxDt = 0; },
    state: S,
  };
}

function mix(a, b, t) { return a + (b - a) * t; }
