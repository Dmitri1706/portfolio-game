// Полы, стены, двери, вывески, эффекты.
import { Canvas } from '../lib/canvas.mjs';
import { P } from '../lib/palette.mjs';
import { measure, textBlock } from '../lib/text.mjs';
import {
  FLOOR_T,
  WALL_H,
  bottomRowAt,
  diamondRow,
  shearBlit,
  wallBlit,
  wallCanvas,
  wallOutlineFlat,
  wallSet,
} from '../lib/iso.mjs';

// ================= Пол =================

/** Плитка-ромб. colorAt(x, y) — цвет внутреннего пикселя (по умолчанию base). */
export function floorTile(base, edge, light, colorAt) {
  const c = new Canvas(32, 16);
  for (let y = 0; y < 16; y++) {
    const [a, b] = diamondRow(y);
    for (let x = a; x <= b; x++) c.set(x, y, colorAt ? colorAt(x, y) : base);
    if (y < 8) c.set(a, y, light);
    if (y >= 8) {
      c.set(a, y, edge);
      c.set(b, y, edge);
    }
  }
  for (let x = 0; x < 32; x++) c.set(x, bottomRowAt(x), edge);
  return c;
}

/** Паркет: доски вдоль оси X сетки (сверху-слева вниз-направо). */
export function floorParquet() {
  return floorTile(P.parquet, P.parquet, P.parquet, (x, y) => {
    const d = 2 * y - x + 64; // вдоль доски эта величина постоянна
    const seam = d % 8;
    if (seam === 0 || seam === 1) return P.parquetDark; // стык между досками (2 пикселя — линия сплошная)
    const board = Math.floor(d / 8);
    return board % 2 ? P.parquetLight : P.parquet;
  });
}

export function floorEdge(side) {
  const c = new Canvas(16, 16 + FLOOR_T);
  for (let k = 0; k < 16; k++) {
    const x = side === 'left' ? k : k + 16;
    const top = bottomRowAt(x) + 1;
    for (let t = 0; t < FLOOR_T; t++) {
      let col = side === 'left' ? P.gray2 : P.gray3;
      if (t === 0) col = side === 'left' ? P.gray3 : P.gray4;
      if (t === FLOOR_T - 1) col = P.gray5;
      c.set(k, top + t, col);
    }
  }
  return c;
}

// ================= Стены =================

/** Кусок стены в одну плитку. colorAt(h, u) — цвет на высоте h над полом. */
export function wall(side, colorAt) {
  const c = wallCanvas(1);
  for (let u = 0; u < 16; u++) {
    for (let h = 0; h < WALL_H; h++) {
      let col = colorAt(h, u);
      if (h === WALL_H - 1) col = P.gray3; // верхний край
      else if (h === WALL_H - 2) col = P.white;
      wallSet(c, side, 1, u, h, col);
    }
  }
  return c;
}

export const lobbyWall = (base) => (h) => (h <= 3 ? P.gray2 : h === 4 ? P.gray3 : base);

export const vhodWall = (base) => (h) => {
  if (h <= 3) return P.vhodNavy;
  if (h === 4) return P.vhodNeon;
  if (h === 40) return P.vhodNeon;
  return base;
};

export const sportWall = (base) => (h) => {
  if (h <= 16) return h === 16 ? P.sportBlueLight : P.sportBlue;
  if (h <= 18) return P.sportRed;
  return base;
};

// ================= Двери на стене (ширина 1 плитка) =================
// Полотно: столбцы u = 3..12, высота h = 0..41. Рама: u = 2 и 13, верх h = 42..43.

const DOOR_TOP = 43;

function doorOnWall(side, frames, leafAt, frameCol = P.gray5, frameLight = P.gray4) {
  const c = new Canvas(16 * frames.length, WALL_H + 8);
  frames.forEach((state, f) => {
    const one = wallCanvas(1);
    for (let u = 2; u <= 13; u++) {
      for (let h = 0; h <= DOOR_TOP; h++) {
        const isFrame = u === 2 || u === 13 || h >= DOOR_TOP - 1;
        let col;
        if (isFrame) col = h === DOOR_TOP || u === 2 ? frameLight : frameCol;
        else col = leafAt(u, h, state);
        wallSet(one, side, 1, u, h, col);
      }
    }
    c.blit(one, f * 16, 0);
  });
  return c;
}

/** Открытый проём: темнота, у края — полотно, повёрнутое внутрь. */
function openDoorway(u, h, leaf, leafDark) {
  if (u <= 4) return u === 4 ? leafDark : leaf;
  if (h <= 1) return P.doorwayLight;
  return P.doorway;
}

/** Техническая металлическая дверь «В ХОД». */
export function doorVhod(side) {
  return doorOnWall(side, ['closed', 'open'], (u, h, state) => {
    if (state === 'open') return openDoorway(u, h, P.gray3, P.gray4);
    if (h >= 3 && h <= 9 && u >= 5 && u <= 10) return h % 2 ? P.gray5 : P.gray3; // вентиляция
    if (h === 14 || h === 32) return P.gray4;
    if (u === 10 && (h === 20 || h === 21)) return P.vhodNeon; // ручка с подсветкой
    if (u >= 6 && u <= 8 && h >= 34 && h <= 37) return h === 37 || u === 6 ? P.accentDark : P.accent; // наклейка
    if ((u === 4 || u === 11) && (h === 2 || h === 39)) return P.gray5; // заклёпки
    if (u === 3) return P.gray2;
    if (u === 12) return P.gray4;
    return P.gray3;
  });
}

/** Стеклянная дверь магазина. */
export function doorSport(side) {
  return doorOnWall(
    side,
    ['closed', 'open'],
    (u, h, state) => {
      if (state === 'open') {
        if (u <= 4) return u === 4 ? P.gray5 : P.glass;
        if (h <= 1) return P.gray2;
        return h < 20 ? P.sportBlueDark : P.doorwayLight;
      }
      if (h <= 3) return P.gray4; // нижняя накладка
      if (h === 20 && u >= 4 && u <= 11) return P.gray5; // ручка-поручень
      if (u === 3 || u === 12) return P.gray4;
      const d = (u + h) % 14;
      if (d === 0 || d === 1) return P.glassLight;
      return h > 30 ? P.glass : P.glassDark;
    },
    P.sportBlueDark,
    P.sportBlue,
  );
}

/** Обычная дверь выхода из комнаты. */
export function doorExit(side) {
  return doorOnWall(side, ['closed', 'open'], (u, h, state) => {
    if (state === 'open') return openDoorway(u, h, P.white2, P.gray2);
    if (h >= 28 && h <= 36 && u >= 6 && u <= 9) return u === 6 || h === 36 ? P.glassDark : P.glass; // окошко
    if (u === 10 && h >= 19 && h <= 20) return P.gray5; // ручка
    if (u === 3) return P.white;
    if (u === 12) return P.gray2;
    return P.white2;
  });
}

/** Заколоченная дверь на стене. */
export function doorBoarded(side) {
  return doorOnWall(
    side,
    ['closed'],
    (u, h) => {
      for (const [h0, slope] of [
        [8, 2.2],
        [30, -2.2],
      ]) {
        const d = h - (h0 + slope * (u - 3));
        if (d >= -1.5 && d < 1.5) return (u === 4 || u === 11) && Math.floor(d) === 0 ? P.nail : d >= 0.5 ? P.woodLight : P.woodDark;
      }
      if (h === 12 || h === 13 || h === 26 || h === 27) {
        // горизонтальные доски
        if (u === 4 || u === 11) return P.nail;
        return h % 2 ? P.woodLight : P.wood;
      }
      if (u === 5 || u === 9) return P.woodDark;
      return u === 3 ? P.woodLight : P.wood;
    },
    P.woodDark,
    P.wood,
  );
}

// ================= Вывески и таблички на стене =================

/** Табличка/вывеска: плоская картинка flat ставится на стену по центру cu, нижний край на высоте hBottom. */
function wallSign(side, n, flat, cu, hBottom) {
  const c = wallCanvas(n);
  const f = wallOutlineFlat(flat, P.outline);
  wallBlit(c, side, n, f, Math.round(cu - f.w / 2), hBottom + f.h - 1);
  return c;
}

function board(w, h, bg, border, light, dark) {
  const c = new Canvas(w, h);
  c.rect(0, 0, w, h, bg);
  if (border) {
    c.rect(0, 0, w, 1, border);
    c.rect(0, h - 1, w, 1, border);
    c.rect(0, 0, 1, h, border);
    c.rect(w - 1, 0, 1, h, border);
  }
  if (light) c.rect(1, 1, w - 2, 1, light);
  if (dark) c.rect(1, h - 2, w - 2, 1, dark);
  return c;
}

/** Вывеска «В ХОД»: тёмная табличка с неоновой рамкой и неоновой полосой. */
export function signVhod(side) {
  const b = board(46, 16, P.vhodNavy, P.vhodNeon, null, P.vhodNavyDark);
  const t = textBlock(['В ХОД'], P.white, 'press');
  b.blit(t, Math.floor((46 - t.w) / 2), 2);
  b.rect(4, 12, 38, 1, P.vhodNeon2);
  return wallSign(side, 3, b, 24, 50);
}

/** Вывеска «Спортмастер»: синяя, белые буквы, красная полоса. */
export function signSport(side) {
  const t = textBlock(['СПОРТМАСТЕР'], P.white);
  const w = t.w + 20;
  const b = board(w, 15, P.sportBlue, null, P.sportBlueLight, null);
  b.rect(0, 12, w, 3, P.sportRed);
  b.rect(0, 14, w, 1, P.sportRedDark);
  // значок: красно-белый шеврон
  for (let i = 0; i < 4; i++) {
    b.rect(4 + i, 3 + i, 3, 1, P.sportRed);
    b.rect(4 + i, 9 - i, 3, 1, P.sportRed);
  }
  b.keepTogether(4, 3, 7, 7);
  b.blit(t, 14, 2);
  return wallSign(side, 5, b, 40, 49);
}

/** Табличка из бумаги с текстом (несколько строк). */
function paperPlaque(lines) {
  const t = textBlock(lines, P.outline);
  const b = board(t.w + 6, t.h + 2, P.paper, null, P.white, P.paperDark);
  b.blit(t, 3, 1);
  b.set(1, 1, P.nail);
  b.set(b.w - 2, 1, P.nail);
  return b;
}

export function plaqueNext(side) {
  // Табличка шириной 5 плиток; дверь стоит под третьей (центр u = 40)
  return wallSign(side, 5, paperPlaque(['Какая', 'компания', 'следующая?']), 40, 45);
}

export function signHello(side) {
  const t = textBlock(['Привет! Я Дмитрий,', 'выбери дверь'], P.outline);
  const b = board(t.w + 10, t.h + 4, P.white, P.gray3, null, P.gray1);
  b.rect(3, b.h - 3, b.w - 6, 1, P.accent);
  b.blit(t, 5, 1);
  return wallSign(side, 6, b, 48, 34);
}

export function signExit(side) {
  const t = textBlock(['ВЫХОД'], P.white, 'press');
  const b = board(t.w + 4, t.h, P.green, null, null, P.greenDark);
  b.blit(t, 2, 0);
  return wallSign(side, 3, b, 24, 48);
}

// ================= Отдельно стоящая дверь «Проекты» =================
// Плоскость двери идёт вдоль оси X сетки, лицом к зрителю слева. Занимает 2 клетки.
// Точка опоры (середина нижнего края) — пиксель (19, 71).

export function doorFreeBoarded() {
  const c = new Canvas(39, 80);
  const H = 46;
  const H0 = 63;
  const OX = 3;
  const put = (ox, oy, k, t, col) => c.set(ox + k, oy + H0 + Math.floor(k / 2) - t, col);
  const plane = (ox, oy, colorAt) => {
    for (let k = 0; k < 32; k++) for (let t = 0; t < H; t++) put(ox, oy, k, t, colorAt(k, t));
  };
  plane(OX + 2, -1, () => P.woodDark); // толщина
  plane(OX, 0, (k, t) => {
    const post = k <= 2 || k >= 29;
    const lintel = t >= H - 4;
    if (post || lintel) {
      if (k === 0 || (lintel && t === H - 1)) return P.woodLight;
      if (k === 31 || (lintel && t === H - 4 && !post)) return P.woodDark;
      return P.wood;
    }
    for (const [t0, slope] of [
      [10, 0.75],
      [36, -0.75],
    ]) {
      const d = t - (t0 + slope * k);
      if (d >= -2 && d < 2) {
        if ((k === 5 || k === 26) && Math.floor(d) === 0) return P.nail;
        return d >= 1 ? P.woodLight : d < -1 ? P.woodDark : P.wood;
      }
    }
    if (k === 3 || t === H - 5) return P.gray3;
    if (k >= 6 && k <= 25 && (t === 6 || t === 38)) return P.gray2;
    if (k === 22 && t >= 18 && t <= 20) return P.gray4;
    return k < 8 ? P.white : P.white2;
  });
  // стойки таблички
  for (const k of [7, 24]) for (let t = H; t < H + 3; t++) put(OX, 0, k, t, P.woodDark);
  // табличка «Проекты»
  const sign = wallOutlineFlat(paperPlaque(['Проекты']), P.outline);
  const k0 = 16 - Math.floor(sign.w / 2);
  const tTop = H + 3 + sign.h - 1;
  shearBlit(sign, (x, y, sx, col) => c.set(OX + k0 + x, H0 + Math.floor((k0 + sx) / 2) - (tTop - y), col));
  c.outline(P.outline);
  return c;
}

// ================= Эффекты =================

export function shadow() {
  const c = new Canvas(16, 6);
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 16; x++) {
      const dx = (x - 7.5) / 8;
      const dy = (y - 2.5) / 3;
      if (dx * dx + dy * dy <= 1) c.set(x, y, P.shadow);
    }
  return c;
}

export function marker() {
  const c = new Canvas(64, 8);
  [7.5, 6.5, 5.5, 6.5].forEach((s, f) => {
    for (let x = 0; x < 16; x++) {
      const dist = Math.abs(x - 7.5);
      if (dist > s) continue;
      const yo = Math.floor((s - dist) / 2);
      const col = dist > s - 1.5 ? P.accentDark : P.accent;
      c.set(f * 16 + x, 3 - yo, col);
      c.set(f * 16 + x, 4 + yo, col);
    }
  });
  return c;
}

function blob(c, cx, cy, r, col, colDark) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r * 1.4); x <= Math.ceil(cx + r * 1.4); x++) {
      const dx = (x + 0.5 - cx) / (r * 1.4);
      const dy = (y + 0.5 - cy) / r;
      if (dx * dx + dy * dy <= 1) c.set(x, y, dy > 0.4 ? colDark : col);
    }
}

/** Облачко пыли при приземлении: 4 кадра 32×12. */
export function dust() {
  const c = new Canvas(128, 12);
  const frames = [
    [[0, 3]],
    [
      [-6, 3],
      [6, 3],
      [0, 2],
    ],
    [
      [-10, 2.5],
      [10, 2.5],
    ],
    [
      [-13, 1.5],
      [13, 1.5],
    ],
  ];
  frames.forEach((puffs, f) => {
    const one = new Canvas(32, 12);
    for (const [dx, r] of puffs) blob(one, 16 + dx, 8 - r / 2, r, P.dust, P.dustDark);
    one.outline(P.gray4);
    c.blit(one, f * 32, 0);
  });
  return c;
}

/** Искорка над интерактивными предметами (для телефонов): 4 кадра 7×7. */
export function sparkle() {
  const c = new Canvas(28, 7);
  const plus = (f, len, col) => {
    for (let i = -len; i <= len; i++) {
      c.set(f * 7 + 3 + i, 3, col);
      c.set(f * 7 + 3, 3 + i, col);
    }
  };
  c.set(3, 3, P.white);
  plus(1, 1, P.accent);
  c.set(10, 3, P.white);
  plus(2, 3, P.accent);
  plus(2, 1, P.white);
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    c.set(21 + 3 + dx, 3 + dy, P.accent);
  c.set(24, 3, P.white);
  return c;
}

export { measure };
