/* WebGL2-сцена: сцена → HDR-буфер → пост-проход (блум, молочная шторка). */
import { VERT, SCENES, POST } from './shaders.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

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
export function createStage(canvas, { onReady, onFail, reduced = false, fixedTime = null, fixedScale = null } = {}) {
  const gl = canvas.getContext('webgl2', {
    antialias: false, alpha: false, depth: false, stencil: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: false,
  });
  if (!gl) { onFail && onFail('webgl2'); return null; }

  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const floatRT = !!gl.getExtension('EXT_color_buffer_float');
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  function makeProgram(fsSrc) {
    const p = gl.createProgram();
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
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
      if (/debug/.test(location.search)) {
        const d = document.createElement('pre');
        d.style.cssText = 'position:fixed;z-index:999;left:0;top:0;color:#f88;background:#000;font:11px monospace;max-width:100vw;white-space:pre-wrap';
        d.textContent = log; document.body.append(d);
      }
      return false;
    }
    pr.ready = true;
    DBG && console.log('[LVL] program ready', Math.round(performance.now() - pr.t0) + 'ms');
    const names = ['uRes', 'uTime', 'uU', 'uMouse', 'uShift', 'uTex', 'uTexRes', 'uWipe', 'uFade'];
    pr.u = {};
    for (const n of names) pr.u[n] = gl.getUniformLocation(pr.p, n);
    return true;
  }

  const post = makeProgram(POST);
  const scenes = SCENES.map(() => null);
  const compileScene = (i) => { if (!scenes[i]) scenes[i] = makeProgram(SCENES[i]); };
  compileScene(0);

  /* HDR-буфер */
  let fbo = null, tex = null, fw = 0, fh = 0;
  function allocFBO(w, h) {
    if (w === fw && h === fh) return;
    fw = w; fh = h;
    if (tex) gl.deleteTexture(tex);
    if (fbo) gl.deleteFramebuffer(fbo);
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const levels = Math.floor(Math.log2(Math.max(w, h))) + 1;
    gl.texStorage2D(gl.TEXTURE_2D, levels, floatRT ? gl.RGBA16F : gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /* состояние */
  const S = {
    target: 0, P: 0, time: reduced ? 3 : 0, mx: 0, my: 0, tmx: 0, tmy: 0,
    scale: 0.62, maxScale: 0.85, minScale: 0.32, cw: 0, ch: 0,
    visible: true, fade: 1, bgNext: 1, bgAt: 0, started: false, ready: false, last: 0,
    ema: 16, slow: 0, fast: 0, frames: 0, immediate: false,
  };
  const coarse = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
  S.scale = coarse ? 0.5 : 0.66;
  S.maxScale = coarse ? 0.7 : 0.9;
  if (fixedScale) { S.scale = S.maxScale = S.minScale = fixedScale; }
  if (fixedTime !== null) { S.time = fixedTime; reduced = true; }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.25);
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; }
    S.cw = w; S.ch = h;
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  new IntersectionObserver((e) => { S.visible = e[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
  addEventListener('pointermove', (e) => {
    S.tmx = (e.clientX / innerWidth - 0.5) * 2;
    S.tmy = (e.clientY / innerHeight - 0.5) * -2;
  }, { passive: true });

  gl.canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    console.warn('[LVL] context lost', { P: S.P, scale: S.scale });
    /* одна попытка перезагрузки; если повторится — обычная версия без 3D */
    let again = false;
    try { again = !sessionStorage.getItem('lvl-retry'); sessionStorage.setItem('lvl-retry', '1'); } catch {}
    if (again && !DBG) { location.reload(); return; }
    onFail && onFail('lost');
  });

  function drawScene(sc, lay) {
    const pr = scenes[sc];
    if (!pr || !poll(pr)) return false;
    const sw = Math.max(2, Math.round(S.cw * S.scale)), sh = Math.max(2, Math.round(S.ch * S.scale));
    allocFBO(sw, sh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, sw, sh);
    gl.useProgram(pr.p);
    gl.uniform2f(pr.u.uRes, sw, sh);
    gl.uniform1f(pr.u.uTime, S.time);
    gl.uniform1f(pr.u.uU, lay.u);
    gl.uniform2f(pr.u.uMouse, S.mx, S.my);
    const wide = S.cw / S.ch > 1.15;
    const shift = sc === 0 && wide ? 0.55 * (1 - smooth(0.04, 0.55, lay.u)) : 0;
    gl.uniform1f(pr.u.uShift, shift);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    DBG && S.frames < 3 && console.log('[LVL] scene drawn', sc, sw, sh, gl.getError());
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    DBG && S.frames < 3 && console.log('[LVL] mips', gl.getError());
    return true;
  }

  function drawPost(lay) {
    if (!poll(post) || !tex) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, S.cw, S.ch);
    gl.useProgram(post.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(post.u.uTex, 0);
    gl.uniform2f(post.u.uRes, S.cw, S.ch);
    gl.uniform2f(post.u.uTexRes, fw, fh);
    gl.uniform1f(post.u.uTime, S.time);
    gl.uniform2f(post.u.uWipe, lay.wx, lay.wy);
    gl.uniform1f(post.u.uFade, S.fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    DBG && S.frames < 3 && console.log('[LVL] post drawn', gl.getError());
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - S.last) / 1000 || 0.016);
    S.last = now;
    if (!S.visible && S.ready) return;

    /* плавный прогресс */
    S.P = S.immediate ? S.target : S.P + (S.target - S.P) * (1 - Math.exp(-dt * 5.5));
    S.immediate = false;
    S.mx += (S.tmx - S.mx) * (1 - Math.exp(-dt * 3));
    S.my += (S.tmy - S.my) * (1 - Math.exp(-dt * 3));
    if (!reduced) S.time += dt;

    const lay = layout(clamp(S.P, 0, 1));
    /* фоновая компиляция остальных сцен, когда готова первая */
    if (!S.ready && scenes[0] && poll(scenes[0]) && poll(post)) {
      S.ready = true;
      S.bgAt = now + 600;
      onReady && onReady();
    }
    if (!S.ready) return;
    if (S.fade > 0) S.fade = Math.max(0, S.fade - dt * 1.6);

    /* остальные сцены компилируем по одной: параллельная сборка тяжёлых шейдеров вешает драйвер */
    if (S.bgNext < scenes.length && now > S.bgAt) {
      const pr = scenes[S.bgNext];
      if (!pr) compileScene(S.bgNext);
      else if (poll(pr) || pr.failed) { S.bgNext++; S.bgAt = now + 400; }
    }

    /* ближайшая готовая сцена, пока нужная ещё компилируется */
    let sc = lay.scene;
    if (!scenes[sc]) compileScene(sc);
    if (!scenes[sc] || !poll(scenes[sc])) sc = 0;
    if (drawScene(sc, lay)) drawPost(lay);

    /* адаптивное разрешение */
    S.ema += (dt * 1000 - S.ema) * 0.08;
    if (++S.frames > 20) {
      if (S.ema > 26) { S.slow++; S.fast = 0; } else if (S.ema < 15.5) { S.fast++; S.slow = 0; } else { S.slow = 0; S.fast = 0; }
      if (S.slow > 8) { S.scale = Math.max(S.minScale, S.scale * 0.9); S.slow = 0; }
      if (S.fast > 140) { S.scale = Math.min(S.maxScale, S.scale * 1.06); S.fast = 0; }
    }
  }
  requestAnimationFrame(frame);

  return {
    setTarget(p, immediate) { S.target = clamp(p, 0, 1); if (immediate) { S.immediate = true; } },
    stats: () => ({ scale: +S.scale.toFixed(2), ms: +S.ema.toFixed(1), P: +S.P.toFixed(3), w: S.cw, h: S.ch, floatRT }),
    state: S,
  };
}
