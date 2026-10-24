/* Этикетки для 3D-упаковок витрины: рисуем на канвасе и отдаём шейдеру как текстуру.
   Атлас 2×2, в каждой ячейке — одна этикетка. Размеры в сантиметрах (1 ед. = 1 см на самой упаковке),
   поэтому текст не растягивается, даже если ячейка в шейдере натянута на цилиндр.
   Ячейка 0 — йогурт (бутылка), 1 — творог (стакан), 2 — масло (фольга: сверху и спереди), 3 — наклейка «Быштак». */

const SANS = (w, s) => `${w} ${s}px Manrope, "Segoe UI", Arial, Helvetica, sans-serif`;

/* знак бренда: капля-завиток */
function swirl(c, x, y, r, col) {
  c.save();
  c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = r * 0.26;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
  c.beginPath();
  for (let a = 0; a <= Math.PI * 3.2; a += 0.1) {
    const k = 0.12 + (a / (Math.PI * 3.2)) * 0.62;
    const px = x + Math.cos(a - 1.2) * r * k, py = y + Math.sin(a - 1.2) * r * k;
    a ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.stroke();
  c.restore();
}

function text(c, s, x, y, font, col, align = 'left', spacing = 0) {
  c.font = font; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'alphabetic';
  if ('letterSpacing' in c) c.letterSpacing = spacing + 'px';
  c.fillText(s, x, y);
  if ('letterSpacing' in c) c.letterSpacing = '0px';
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

/* ячейка: переводим систему координат в сантиметры, обрезаем по границам */
function tile(c, S, i, W, H, draw) {
  c.save();
  c.translate((i & 1) * S, (i >> 1) * S);
  c.beginPath(); c.rect(0, 0, S, S); c.clip();
  c.scale(S / W, S / H);
  draw(c, W, H);
  c.restore();
}

function yogurt(c, W, H) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fbfbfd'); g.addColorStop(1, '#eef0f4');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  swirl(c, 6.4, 6.2, 3, '#D4243C');
  text(c, 'Токтогул сүт', 11.5, 7.7, SANS(700, 4.4), '#37404d');
  text(c, 'Й', 1.5, 50, SANS(800, 50), '#C81E36');
  text(c, 'ЙОГУРТ', 39, 22, SANS(800, 8.6), '#C81E36', 'left', 0.3);
  text(c, 'натуральный', 39.4, 29, SANS(500, 4.6), '#4b5563');
  c.fillStyle = '#D4243C'; c.fillRect(39.4, 32.4, 16, 0.7);
  text(c, 'жирность 2,5 %', 39.4, 39, SANS(600, 4.4), '#4b5563');
  text(c, '250 г', 39.2, 48, SANS(800, 7), '#1f2937');
  /* волна внизу */
  c.fillStyle = '#D4243C';
  c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 2) c.lineTo(x, H - 4.4 + Math.sin(x * 0.2) * 1.2);
  c.lineTo(W, H); c.closePath(); c.fill();
}

function curd(c, W, H) {
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#2c9f76'); g.addColorStop(1, '#5fc29a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,.14)';
  c.beginPath(); c.arc(W * 0.78, H * 1.15, 30, 0, 7); c.fill();
  swirl(c, 8, 7.4, 3.4, '#ffffff');
  text(c, 'Токтогул сүт', 13.5, 9, SANS(700, 4.8), '#ffffff');
  text(c, 'Творог', 6, 29, SANS(800, 17), '#ffffff', 'left', -0.3);
  text(c, 'натуральный · жирность 1 %', 6.4, 35.6, SANS(600, 4.4), '#e8fff4');
  c.fillStyle = '#fff'; c.beginPath(); c.arc(101, 19, 11, 0, 7); c.fill();
  text(c, '250', 101, 20.5, SANS(800, 9), '#2c9f76', 'center');
  text(c, 'грамм', 101, 27, SANS(600, 3.8), '#2c9f76', 'center');
}

/* фольга: сверху (0…64 см) и спереди (64…108 см) */
function butter(c, W, H) {
  const g = c.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#f1cc55'); g.addColorStop(0.5, '#e2b02d'); g.addColorStop(1, '#f2d16a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(120,80,0,.12)'; c.lineWidth = 0.35;
  for (let i = 0; i < 70; i++) {
    c.beginPath(); const y = (i * 37) % H, x = (i * 53) % W;
    c.moveTo(x, y); c.lineTo(x + 6 + (i % 5) * 2, y + 3 - (i % 4) * 2); c.stroke();
  }
  /* верхняя грань */
  c.fillStyle = '#fffdf6'; roundRect(c, 5, 6, 60, 52, 3); c.fill();
  swirl(c, 13.6, 14.2, 3.2, '#B5332B');
  text(c, 'Токтогул сүт', 19.5, 15.8, SANS(700, 4.6), '#5b3a14');
  text(c, 'МАСЛО', 35, 33, SANS(800, 14.5), '#B5332B', 'center', 0.2);
  text(c, 'СЛИВОЧНОЕ', 35, 41, SANS(700, 5), '#7a5a2a', 'center', 1.2);
  text(c, '82,5 %', 35, 52, SANS(800, 8), '#C28A12', 'center');
  /* передняя грань */
  c.fillStyle = '#B5332B'; c.fillRect(0, 64 + 14, W, 12);
  text(c, 'Масло сливочное 82,5 %', 33, 64 + 22.4, SANS(800, 5.2), '#fff', 'center', 0.2);
  text(c, '180 г', 8, 64 + 37, SANS(800, 6), '#5b3a14');
  swirl(c, 60, 64 + 7.6, 3, '#B5332B');
  text(c, 'Токтогул сүт', 65, 64 + 9.2, SANS(700, 4.4), '#5b3a14');
}

function sticker(c, W, H) {
  const cx = W / 2, cy = H / 2;
  c.fillStyle = '#1F5FAE'; c.beginPath(); c.arc(cx, cy, 20, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 0.7;
  c.beginPath(); c.arc(cx, cy, 17.4, 0, 7); c.stroke();
  swirl(c, cx, cy - 8.4, 3.6, '#ffffff');
  text(c, 'БЫШТАК', cx, cy + 4.2, SANS(800, 7.4), '#ffffff', 'center', 0.2);
  text(c, 'СЫР СВЕЖИЙ', cx, cy + 9.6, SANS(600, 3.1), '#cfe2ff', 'center', 0.8);
  text(c, 'Токтогул сүт', cx, cy + 13.8, SANS(700, 3.3), '#ffffff', 'center');
}

export function drawLabels(size = 2048) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, size, size);
  const S = size / 2;
  tile(c, S, 0, 83, 55, yogurt);
  tile(c, S, 1, 115, 38, curd);
  tile(c, S, 2, 100, 108, butter);
  tile(c, S, 3, 42, 42, sticker);
  return cv;
}
