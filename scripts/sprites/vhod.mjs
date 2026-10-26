// Комната «В ХОД»: светлый офис с неоновыми акцентами.
import { Canvas, hex } from '../lib/canvas.mjs';
import { P } from '../lib/palette.mjs';
import { drawBox, objectCanvas, px } from '../lib/box.mjs';
import { wallBlit, wallCanvas, wallOutlineFlat } from '../lib/iso.mjs';
import { person } from './character.mjs';

/** Холст 1×1 (или a×b) клетки; T — верхний угол футпринта. f(c, Tx, Ty) рисует. */
function obj(a, b, H, draw, frames = 1) {
  const o = objectCanvas(a, b, H);
  const sheet = new Canvas(o.w * frames, o.h);
  for (let f = 0; f < frames; f++) {
    const c = o.make();
    draw(c, o.Tx, o.Ty, f);
    c.outline(P.outline);
    sheet.blit(c, f * o.w, 0);
  }
  return sheet;
}

/** Точка T для вложенной коробки, начинающейся с доли (u, v) клетки */
const at = (Tx, Ty, u, v) => [Tx + 16 * u - 16 * v, Ty + 8 * u + 8 * v];

function blob(c, cx, cy, rx, ry, col, colDark, colLight) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      let k = col;
      if (colLight && dx < -0.2 && dy < -0.2) k = colLight;
      else if (colDark && (dx > 0.35 || dy > 0.45)) k = colDark;
      c.set(x, y, k);
    }
}

// ================= Предметы на полу =================

export function plant() {
  return obj(1, 1, 40, (c, Tx, Ty) => {
    const [x, y] = at(Tx, Ty, 0.25, 0.25);
    const g = drawBox(c, x, y, 0.5, 0.5, 10, { top: P.potDark, left: P.pot, right: P.potDark });
    const [cx, cy] = g.top(0.25, 0.25);
    blob(c, cx - 5, cy - 8, 6, 5, P.leaf, P.leafDark, P.leafLight);
    blob(c, cx + 5, cy - 10, 6, 5, P.leaf, P.leafDark, P.leafLight);
    blob(c, cx, cy - 18, 7, 6, P.leaf, P.leafDark, P.leafLight);
    blob(c, cx - 3, cy - 26, 4, 4, P.leafLight, P.leaf);
  });
}

export function serverRack() {
  return obj(
    1,
    1,
    60,
    (c, Tx, Ty, f) => {
      const [x, y] = at(Tx, Ty, 0.1, 0.1);
      const g = drawBox(c, x, y, 0.8, 0.8, 56, { top: P.metalLight, left: P.metal, right: P.metalDark });
      // передняя панель (левая грань): юниты и огоньки
      const len = 16 * 0.8;
      for (let z = 4; z < 54; z += 6) {
        for (let s = 1; s < len - 1; s++) px(c, g.left(s, z), P.metalDark);
        const unit = Math.floor(z / 6);
        for (let k = 0; k < 3; k++) {
          const on = (unit * 7 + k * 3 + f * 5) % 4 !== 0;
          const col = k === 2 ? (on && (unit + f) % 3 === 0 ? P.ledRed : P.ledOff) : on ? (k ? P.vhodNeon : P.ledGreen) : P.ledOff;
          px(c, g.left(2 + k * 2, z + 3), col);
        }
        px(c, g.left(len - 3, z + 3), P.metalLight);
      }
      // вентиляция сбоку
      for (let z = 8; z < 50; z += 3) for (let s = 3; s < 10; s++) px(c, g.right(s, z), P.metal);
    },
    2,
  );
}

export function deskPc() {
  return obj(2, 1, 40, (c, Tx, Ty) => {
    // ножки
    for (const [u, v] of [
      [0.05, 0.1],
      [1.85, 0.1],
      [0.05, 0.8],
      [1.85, 0.8],
    ]) {
      const [x, y] = at(Tx, Ty, u, v);
      drawBox(c, x, y, 0.1, 0.1, 12, { top: P.metalLight, left: P.metal, right: P.metalDark });
    }
    // столешница
    drawBox(c, Tx, Ty, 2, 1, 2, { z0: 12, top: P.desk, left: P.deskSide, right: P.deskDark, topEdge: P.white });
    // клавиатура
    let [x, y] = at(Tx, Ty, 0.25, 0.62);
    drawBox(c, x, y, 0.5, 0.18, 1, { z0: 14, top: P.metalLight, left: P.metal, right: P.metalDark });
    // подставка и монитор (экран смотрит на стул, в сторону +Y)
    [x, y] = at(Tx, Ty, 0.42, 0.4);
    drawBox(c, x, y, 0.16, 0.1, 3, { z0: 14, top: P.metal, left: P.metalDark, right: P.metalDark });
    [x, y] = at(Tx, Ty, 0.1, 0.4);
    const m = drawBox(c, x, y, 0.8, 0.12, 15, { z0: 17, top: P.metal, left: P.metalDark, right: P.metalDark });
    const len = 16 * 0.8;
    for (let z = 2; z < 14; z++)
      for (let s = 1; s < len - 1; s++) {
        let col = P.screen;
        if (z % 3 === 1 && s > 2 && s < 3 + ((z * 5) % 8)) col = P.screenGlow; // строчки «кода»
        px(c, m.left(s, z), col);
      }
    // кружка
    [x, y] = at(Tx, Ty, 1.45, 0.35);
    drawBox(c, x, y, 0.14, 0.14, 4, { z0: 14, top: P.vhodNeon2, left: P.white, right: P.gray2 });
    // кактус в горшочке
    [x, y] = at(Tx, Ty, 1.6, 0.6);
    const pot = drawBox(c, x, y, 0.2, 0.2, 3, { z0: 14, top: P.potDark, left: P.pot, right: P.potDark });
    const [cx, cy] = pot.top(0.1, 0.1);
    c.rect(Math.floor(cx) - 1, Math.floor(cy) - 6, 3, 6, P.leaf);
    c.rect(Math.floor(cx) - 1, Math.floor(cy) - 6, 1, 6, P.leafLight);
  });
}

/** Офисный стул. Сидящий смотрит в сторону −Y (вверх-вправо), спинка — со стороны +Y. */
export function chairOffice() {
  return obj(1, 1, 30, (c, Tx, Ty) => {
    let [x, y] = at(Tx, Ty, 0.2, 0.2);
    drawBox(c, x, y, 0.6, 0.6, 1, { top: P.metal, left: P.metalDark, right: P.metalDark });
    [x, y] = at(Tx, Ty, 0.45, 0.45);
    drawBox(c, x, y, 0.1, 0.1, 8, { z0: 1, top: P.metalLight, left: P.metal, right: P.metalDark });
    [x, y] = at(Tx, Ty, 0.2, 0.2);
    drawBox(c, x, y, 0.6, 0.6, 3, { z0: 8, top: P.vhodNavy, left: P.vhodNavyDark, right: P.vhodNavyDark });
    [x, y] = at(Tx, Ty, 0.2, 0.72);
    drawBox(c, x, y, 0.6, 0.1, 13, { z0: 11, top: P.vhodNeon, left: P.vhodNavy, right: P.vhodNavyDark });
  });
}

function audienceChairParts(c, Tx, Ty) {
  for (const [u, v] of [
    [0.22, 0.22],
    [0.7, 0.22],
    [0.22, 0.7],
    [0.7, 0.7],
  ]) {
    const [x, y] = at(Tx, Ty, u, v);
    drawBox(c, x, y, 0.08, 0.08, 8, { top: P.metalLight, left: P.metal, right: P.metalDark });
  }
  const [x, y] = at(Tx, Ty, 0.2, 0.2);
  drawBox(c, x, y, 0.6, 0.6, 2, { z0: 8, top: P.vhodNeon, left: P.vhodNavy, right: P.vhodNavyDark });
}
function audienceChairBack(c, Tx, Ty) {
  const [x, y] = at(Tx, Ty, 0.2, 0.72);
  drawBox(c, x, y, 0.6, 0.08, 10, { z0: 10, top: P.vhodNeon, left: P.vhodNavy, right: P.vhodNavyDark });
}

export function chairAudience() {
  return obj(1, 1, 24, (c, Tx, Ty) => {
    audienceChairParts(c, Tx, Ty);
    audienceChairBack(c, Tx, Ty);
  });
}

const VIEWERS = [
  {
    hair: hex('#231a1a'),
    hairLight: hex('#3d2e2e'),
    hairDark: hex('#120c0c'),
    shirt: hex('#e8665a'),
    shirtLight: hex('#f48c7f'),
    shirtDark: hex('#b84a42'),
  },
  {
    hair: hex('#e6c35c'),
    hairLight: hex('#f2dc8a'),
    hairDark: hex('#b8962e'),
    shirt: hex('#7a5cc8'),
    shirtLight: hex('#9a82e0'),
    shirtDark: hex('#5a3f9a'),
  },
  {
    hair: hex('#c4622d'),
    hairLight: hex('#e08850'),
    hairDark: hex('#8f4520'),
    shirt: hex('#e0a630'),
    shirtLight: hex('#f0c460'),
    shirtDark: hex('#a87818'),
    skin: hex('#c98b62'),
    skinLight: hex('#e0a67c'),
    skinDark: hex('#9a6440'),
  },
];

/**
 * Зрители на стульях (вид со спины, смотрят вверх-вправо; в игре отражаются, чтобы смотреть на сцену).
 * Лист: 3 строки (3 разных зрителя) × 3 кадра: сидит, хлопает 1, хлопает 2.
 */
export function spectators() {
  const o = objectCanvas(1, 1, 48);
  const sheet = new Canvas(o.w * 3, o.h * 3);
  VIEWERS.forEach((pal, row) => {
    const poses = [
      { arms: 'forward' },
      { arms: 'up', arm: 0 },
      { arms: 'up', arm: 2 },
    ];
    poses.forEach((pose, col) => {
      const c = o.make();
      audienceChairParts(c, o.Tx, o.Ty);
      const seatTop = o.Ty + 8 - 10;
      const p = person({ view: 'back', legs: 'sit', bob: 6, pal, ...pose });
      c.blit(p, o.Tx - 12, seatTop - 34);
      audienceChairBack(c, o.Tx, o.Ty);
      c.outline(P.outline);
      sheet.blit(c, col * o.w, row * o.h);
    });
  });
  return sheet;
}

export function stage() {
  return obj(2, 4, 8, (c, Tx, Ty) => {
    const g = drawBox(c, Tx, Ty, 2, 4, 6, { top: P.vhodNavy, left: P.vhodNavyDark, right: P.metalDark, topEdge: P.vhodNeon });
    // доски сцены
    for (let v = 0.5; v < 4; v += 0.5)
      for (let u = 0.05; u < 2; u += 0.04) px(c, g.top(u, v), P.vhodNavyDark);
  });
}

export function coffeeTable() {
  return obj(1, 1, 14, (c, Tx, Ty) => {
    for (const [u, v] of [
      [0.2, 0.2],
      [0.72, 0.2],
      [0.2, 0.72],
      [0.72, 0.72],
    ]) {
      const [x, y] = at(Tx, Ty, u, v);
      drawBox(c, x, y, 0.08, 0.08, 8, { top: P.metalLight, left: P.metal, right: P.metalDark });
    }
    const [x, y] = at(Tx, Ty, 0.15, 0.15);
    drawBox(c, x, y, 0.7, 0.7, 2, { z0: 8, top: P.desk, left: P.deskSide, right: P.deskDark, topEdge: P.white });
  });
}

export function barTable() {
  return obj(1, 1, 28, (c, Tx, Ty) => {
    let [x, y] = at(Tx, Ty, 0.25, 0.25);
    drawBox(c, x, y, 0.5, 0.5, 1, { top: P.metal, left: P.metalDark, right: P.metalDark });
    [x, y] = at(Tx, Ty, 0.44, 0.44);
    drawBox(c, x, y, 0.12, 0.12, 23, { z0: 1, top: P.metalLight, left: P.metal, right: P.metalDark });
    [x, y] = at(Tx, Ty, 0.15, 0.15);
    drawBox(c, x, y, 0.7, 0.7, 2, { z0: 24, top: P.desk, left: P.vhodNeon, right: P.deskDark, topEdge: P.white });
  });
}

export function cabinet() {
  return obj(1, 1, 30, (c, Tx, Ty) => {
    const [x, y] = at(Tx, Ty, 0.05, 0.1);
    const g = drawBox(c, x, y, 0.9, 0.75, 26, { top: P.white2, left: P.gray1, right: P.gray2, topEdge: P.white });
    const len = 16 * 0.9;
    for (const z of [9, 18]) for (let s = 1; s < len; s++) px(c, g.left(s, z), P.gray3);
    for (const z of [4, 13, 22]) {
      px(c, g.left(len / 2 - 1, z), P.gray5);
      px(c, g.left(len / 2, z), P.gray5);
    }
  });
}

// ================= Предметы, которые берут в руки =================

/** Лежит на столике (высота столешницы z). */
function flatItem(H, z, u0, v0, a, b, h, top, side, detail) {
  return obj(1, 1, H, (c, Tx, Ty) => {
    const [x, y] = at(Tx, Ty, u0, v0);
    const g = drawBox(c, x, y, a, b, h, { z0: z, top, left: side, right: side });
    detail?.(c, g);
  });
}

export const itemNewspaper = () =>
  flatItem(14, 10, 0.28, 0.3, 0.44, 0.36, 1, P.paper, P.paperDark, (c, g) => {
    for (let u = 0.05; u < 0.4; u += 0.03) px(c, g.top(u, 0.06), P.gray4);
    for (const v of [0.14, 0.2, 0.26, 0.32]) for (let u = 0.05; u < 0.38; u += 0.04) px(c, g.top(u, v), P.gray3);
  });

export const itemPhone = () =>
  flatItem(30, 26, 0.38, 0.38, 0.24, 0.16, 1, P.metalDark, P.metal, (c, g) => {
    for (let u = 0.04; u < 0.2; u += 0.04) px(c, g.top(u, 0.08), P.screenGlow);
  });

export const itemFolder = () =>
  flatItem(32, 26, 0.18, 0.18, 0.6, 0.45, 2, P.manila, P.manilaDark, (c, g) => {
    for (let u = 0.05; u < 0.2; u += 0.04) px(c, g.top(u, 0.02), P.manilaDark);
  });

/** Предмет в руках (вид спереди). */
export function heldNewspaper() {
  const c = new Canvas(14, 10);
  c.rect(1, 1, 12, 8, P.paper);
  c.rect(2, 2, 10, 1, P.outline);
  for (const y of [4, 6]) c.rect(2, y, 4, 1, P.gray3), c.rect(8, y, 4, 1, P.gray3);
  c.rect(7, 3, 1, 5, P.paperDark);
  c.outline(P.outline);
  return c;
}

export function heldPhone() {
  const c = new Canvas(8, 11);
  c.rect(1, 1, 6, 9, P.metalDark);
  c.rect(2, 2, 4, 6, P.screen);
  c.rect(2, 2, 4, 1, P.screenGlow);
  c.set(3, 4, P.screenGlow);
  c.set(4, 5, P.vhodNeon2);
  c.outline(P.outline);
  return c;
}

export function heldFolder() {
  const c = new Canvas(14, 11);
  c.rect(1, 1, 5, 2, P.manilaDark);
  c.rect(1, 2, 12, 8, P.manila);
  c.rect(1, 9, 12, 1, P.manilaDark);
  c.rect(3, 4, 6, 1, P.white);
  c.outline(P.outline);
  return c;
}

// ================= На стенах =================

function onWall(side, n, flat, cu, hBottom) {
  const c = wallCanvas(n);
  const f = wallOutlineFlat(flat, P.outline);
  wallBlit(c, side, n, f, Math.round(cu - f.w / 2), hBottom + f.h - 1);
  return c;
}

/** Экран над сценой: занавес по бокам и «слайд» на экране. */
export function stageScreen(side) {
  const w = 58;
  const h = 34;
  const f = new Canvas(w, h);
  f.rect(0, 0, w, h, P.metalDark);
  f.rect(0, 0, w, 1, P.vhodNeon);
  // занавес
  for (const x0 of [0, w - 7])
    for (let x = x0; x < x0 + 7; x++) for (let y = 1; y < h; y++) f.set(x, y, (x - x0) % 3 === 0 ? P.curtainDark : P.curtain);
  // экран
  f.rect(9, 3, w - 18, h - 7, P.white);
  f.rect(12, 6, 14, 2, P.vhodNavy);
  const bars = [4, 7, 10, 15];
  bars.forEach((bh, i) => f.rect(13 + i * 6, 6 + 20 - bh, 4, bh, i === 3 ? P.vhodNeon2 : P.vhodNeon));
  return onWall(side, 4, f, 32, 13);
}

export function chartGrowth(side) {
  const f = new Canvas(38, 26);
  f.rect(0, 0, 38, 26, P.white);
  f.rect(0, 0, 38, 1, P.gray2);
  f.rect(3, 22, 32, 1, P.gray4);
  [4, 7, 10, 14, 18].forEach((bh, i) => f.rect(5 + i * 6, 22 - bh, 4, bh, i % 2 ? P.vhodNeon : P.vhodNeon2));
  // стрелка роста
  for (let i = 0; i < 10; i++) f.set(24 + i, 12 - Math.floor(i * 0.9), P.ledGreen);
  f.rect(32, 3, 3, 1, P.ledGreen);
  f.rect(34, 3, 1, 3, P.ledGreen);
  return onWall(side, 3, f, 24, 34);
}

export function chartLine(side) {
  const f = new Canvas(26, 20);
  f.rect(0, 0, 26, 20, P.vhodNavy);
  f.rect(0, 0, 26, 1, P.vhodNeon);
  const pts = [15, 13, 14, 10, 11, 7, 8, 4];
  pts.forEach((y, i) => {
    f.rect(2 + i * 3, y, 3, 1, P.vhodNeon);
    if (i) {
      const prev = pts[i - 1];
      for (let yy = Math.min(prev, y); yy <= Math.max(prev, y); yy++) f.set(2 + i * 3, yy, P.vhodNeon);
    }
  });
  f.rect(2, 17, 22, 1, P.gray4);
  return onWall(side, 2, f, 16, 36);
}

export function stickyBoard(side) {
  const f = new Canvas(42, 26);
  f.rect(0, 0, 42, 26, P.cork);
  f.rect(0, 25, 42, 1, P.corkDark);
  const notes = [
    [3, 3, P.noteYellow],
    [12, 4, P.notePink],
    [21, 2, P.noteBlue],
    [30, 4, P.noteGreen],
    [5, 14, P.noteBlue],
    [15, 13, P.noteYellow],
    [25, 15, P.notePink],
    [33, 13, P.noteYellow],
  ];
  for (const [x, y, col] of notes) {
    f.rect(x, y, 7, 7, col);
    f.rect(x + 1, y + 2, 5, 1, P.gray4);
    f.rect(x + 1, y + 4, 3, 1, P.gray4);
    f.set(x + 3, y, P.ledRed);
  }
  return onWall(side, 3, f, 24, 30);
}

