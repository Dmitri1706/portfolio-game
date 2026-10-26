// Комната «Спортмастер»: торговый зал.
import { Canvas, hex } from '../lib/canvas.mjs';
import { P } from '../lib/palette.mjs';
import { drawBox, objectCanvas, px } from '../lib/box.mjs';
import { textBlock } from '../lib/text.mjs';
import { wallBlit, wallCanvas, wallOutlineFlat, wallSet } from '../lib/iso.mjs';
import { PLAYER_FRAMES, person } from './character.mjs';

// ================= Кроссовки =================

/** Цвета кроссовок: первые 4 — для мини-игры (красный, синий, зелёный, жёлтый), остальные — декор. */
export const SNEAKERS = [
  [hex('#e0383e'), hex('#ff6b6b'), hex('#a5262c')],
  [hex('#2f6fd6'), hex('#5a95f0'), hex('#1d4a9a')],
  [hex('#3fbf6a'), hex('#6fe08f'), hex('#25844a')],
  [hex('#ffcc33'), hex('#ffe27a'), hex('#d19a10')],
  [hex('#f4f4f6'), hex('#ffffff'), hex('#b9bdcb')],
  [hex('#3a3f55'), hex('#565d7a'), hex('#262a3b')],
  [hex('#ff8c2e'), hex('#ffb066'), hex('#c4621a')],
  [hex('#8a5cd6'), hex('#ab86ec'), hex('#5f3c9e')],
];

/** Кроссовок сбоку (носок вправо), 14×8 вместе с контуром. */
function sneakerFlat([base, light, dark]) {
  const c = new Canvas(14, 8);
  const rows = [
    [2, 4],
    [2, 7],
    [2, 10],
    [1, 12],
  ];
  rows.forEach(([a, b], y) => {
    for (let x = a; x <= b; x++) c.set(x, y + 1, y === 0 || (y === 1 && x > 4) ? light : base);
  });
  c.rect(2, 1, 1, 3, dark); // задник
  c.set(6, 3, P.white); // шнурки
  c.set(8, 3, P.white);
  c.rect(1, 5, 12, 1, P.white); // подошва
  c.rect(2, 6, 10, 1, P.gray3);
  c.outline(P.outline);
  return c;
}

/** Наклон «вдоль правой стены / оси X сетки»: каждые 2 пикселя вправо — на 1 вниз. */
function shearRight(flat) {
  const extra = Math.ceil((flat.w - 1) / 2);
  const c = new Canvas(flat.w, flat.h + extra);
  for (let y = 0; y < flat.h; y++)
    for (let x = 0; x < flat.w; x++) {
      const col = flat.get(x, y);
      if (col) c.set(x, y + Math.ceil(x / 2), col);
    }
  return c;
}

/** Кроссовки, стоящие вдоль стены / на полу: 8 цветов в ряд, кадр 14×15. */
export function sneakerIso() {
  const sheet = new Canvas(14 * SNEAKERS.length, 15);
  SNEAKERS.forEach((col, i) => sheet.blit(shearRight(sneakerFlat(col)), i * 14, 0));
  return sheet;
}

/** Кроссовок в руках (вид сбоку, без наклона): 4 цвета, кадр 14×8. */
export function heldSneaker() {
  const sheet = new Canvas(14 * 4, 8);
  for (let i = 0; i < 4; i++) sheet.blit(sneakerFlat(SNEAKERS[i]), i * 14, 0);
  return sheet;
}

// ================= Полки на стене =================

/** Уровни полок (высота верхней кромки доски над полом) — те же числа в SportScene.ts */
export const SHELF_LEVELS = [8, 24, 40];
const SECTION_COLORS = [null, SNEAKERS[0][0], SNEAKERS[1][0], SNEAKERS[2][0], SNEAKERS[3][0]];

/** Полка на правой стене: 5 кадров — обычная и с цветными ценниками 4 секций мини-игры. */
export function shelfWall(side) {
  const sheet = new Canvas(16 * SECTION_COLORS.length, 80);
  SECTION_COLORS.forEach((label, f) => {
    const c = wallCanvas(1);
    // задняя панель стеллажа
    for (let u = 0; u < 16; u++)
      for (let h = 2; h < 52; h++) {
        const edge = u === 0 || u === 15 || h === 51;
        wallSet(c, side, 1, u, h, edge ? P.gray3 : P.gray1);
      }
    // доски
    for (const hb of SHELF_LEVELS) {
      for (let u = 0; u < 16; u++) {
        wallSet(c, side, 1, u, hb - 1, P.white);
        wallSet(c, side, 1, u, hb - 2, P.gray3);
      }
      if (label)
        for (let u = 6; u <= 9; u++) {
          wallSet(c, side, 1, u, hb - 3, label);
          wallSet(c, side, 1, u, hb - 4, label);
        }
    }
    // шапка стеллажа в цветах магазина
    for (let u = 0; u < 16; u++) for (let h = 52; h < 56; h++) wallSet(c, side, 1, u, h, h === 55 ? P.sportRed : P.sportBlue);
    sheet.blit(c, f * 16, 0);
  });
  return sheet;
}

// ================= Мебель =================

function obj(a, b, H, draw) {
  const o = objectCanvas(a, b, H);
  const c = o.make();
  draw(c, o.Tx, o.Ty);
  c.outline(P.outline);
  return c;
}
const at = (Tx, Ty, u, v) => [Tx + 16 * u - 16 * v, Ty + 8 * u + 8 * v];

/** Стойка с одеждой, 2 клетки вдоль оси X. */
export function clothesRack() {
  return obj(2, 1, 40, (c, Tx, Ty) => {
    for (const u of [0.1, 1.75]) {
      let [x, y] = at(Tx, Ty, u, 0.3);
      drawBox(c, x, y, 0.15, 0.4, 2, { top: P.metal, left: P.metalDark, right: P.metalDark });
      [x, y] = at(Tx, Ty, u + 0.05, 0.45);
      drawBox(c, x, y, 0.06, 0.06, 32, { top: P.metalLight, left: P.metal, right: P.metalDark });
    }
    const [x, y] = at(Tx, Ty, 0.15, 0.46);
    const bar = drawBox(c, x, y, 1.7, 0.05, 1, { z0: 31, top: P.metalLight, left: P.metal, right: P.metalDark });
    const shirts = [SNEAKERS[0], SNEAKERS[1], [P.white, P.white2, P.gray2], SNEAKERS[3], SNEAKERS[7], SNEAKERS[2], SNEAKERS[5]];
    shirts.forEach(([base, light, dark], i) => {
      const [sx, sy] = bar.top(0.12 + i * 0.22, 0);
      const x0 = Math.floor(sx) - 1;
      const y0 = Math.floor(sy) + 1;
      c.rect(x0 + 1, y0, 1, 1, P.gray4); // вешалка
      c.rect(x0, y0 + 1, 4, 12, base);
      c.rect(x0, y0 + 1, 1, 12, light);
      c.rect(x0 + 3, y0 + 1, 1, 12, dark);
    });
  });
}

/** Касса: стойка 2×1 с кассовым аппаратом. */
export function cashCounter() {
  return obj(2, 1, 36, (c, Tx, Ty) => {
    const g = drawBox(c, Tx, Ty, 2, 1, 18, { top: P.white2, left: P.sportBlue, right: P.sportBlueDark, topEdge: P.white });
    for (let s = 0; s < 32; s++) {
      px(c, g.left(s, 12), P.sportRed);
      px(c, g.left(s, 11), P.sportRed);
    }
    // кассовый аппарат
    let [x, y] = at(Tx, Ty, 0.25, 0.25);
    drawBox(c, x, y, 0.5, 0.45, 5, { z0: 18, top: P.metalLight, left: P.metal, right: P.metalDark });
    [x, y] = at(Tx, Ty, 0.3, 0.3);
    const scr = drawBox(c, x, y, 0.4, 0.08, 7, { z0: 23, top: P.metal, left: P.metalDark, right: P.metalDark });
    for (let s = 1; s < 6; s++) for (let z = 2; z < 6; z++) px(c, scr.left(s, z), P.ledGreen);
    // терминал для карт
    [x, y] = at(Tx, Ty, 1.3, 0.4);
    drawBox(c, x, y, 0.15, 0.25, 3, { z0: 18, top: P.metalDark, left: P.metal, right: P.metalDark });
  });
}

/** Примерочная у левой стены: 1×2 клетки, занавеска смотрит в зал. */
export function fittingRoom() {
  return obj(1, 2, 60, (c, Tx, Ty) => {
    const g = drawBox(c, Tx, Ty, 1, 2, 56, { top: P.sportBlueDark, left: P.gray1, right: P.sportBlue });
    // занавеска на правой грани (в сторону зала)
    for (let s = 1; s < 31; s++)
      for (let z = 3; z < 50; z++) px(c, g.right(s, z), s % 4 === 0 ? P.sportBlueDark : s % 4 === 1 ? P.sportBlueLight : P.sportBlue);
    for (let s = 0; s < 32; s++) {
      px(c, g.right(s, 50), P.metalLight);
      px(c, g.right(s, 51), P.metal);
    }
    // табличка «М/Ж» на боковой стенке
    for (let s = 5; s < 11; s++) for (let z = 40; z < 46; z++) px(c, g.left(s, z), P.white);
  });
}

/** Корзина с мячами. */
export function ballBasket() {
  return obj(1, 1, 30, (c, Tx, Ty) => {
    const [x, y] = at(Tx, Ty, 0.15, 0.15);
    const g = drawBox(c, x, y, 0.7, 0.7, 12, { top: P.metalDark, left: P.metal, right: P.metalDark });
    for (let s = 1; s < 11; s += 3) for (let z = 1; z < 12; z++) px(c, g.left(s, z), P.metalLight);
    const balls = [
      [0.2, 0.2, hex('#ff8c2e'), hex('#c4621a')],
      [0.5, 0.2, P.white, P.gray3],
      [0.2, 0.5, hex('#ffcc33'), hex('#d19a10')],
      [0.45, 0.48, P.sportRed, P.sportRedDark],
    ];
    for (const [u, v, col, dark] of balls) {
      const [bx, by] = g.top(u, v);
      for (let yy = -4; yy <= 3; yy++)
        for (let xx = -4; xx <= 3; xx++) {
          const d = (xx + 0.5) ** 2 + (yy + 0.5) ** 2;
          if (d <= 16) c.set(Math.floor(bx) + xx, Math.floor(by) + yy - 2, xx + yy > 2 ? dark : col);
        }
    }
  });
}

/** Доска «Лучший продавец» на левой стене (4 плитки). */
export function boardBest(side) {
  const t = textBlock(['ЛУЧШИЙ', 'ПРОДАВЕЦ'], P.white);
  const w = t.w + 22;
  const h = t.h + 6;
  const f = new Canvas(w, h);
  f.rect(0, 0, w, h, P.gold);
  f.rect(1, 1, w - 2, 1, P.goldLight);
  f.rect(2, 2, w - 4, h - 4, P.sportBlue);
  // звезда
  const star = [
    [0, 3, 2],
    [1, 2, 4],
    [2, 0, 8],
    [3, 1, 6],
    [4, 2, 4],
    [5, 1, 2],
    [5, 5, 2],
  ];
  for (const [y, x, len] of star) f.rect(5 + x, 5 + y, len, 1, P.gold);
  f.keepTogether(5, 5, 8, 6);
  f.blit(t, 17, 3);
  const c = wallCanvas(4);
  const o = wallOutlineFlat(f, P.outline);
  wallBlit(c, side, 4, o, Math.round(32 - o.w / 2), 32 + o.h - 1);
  return c;
}

// ================= Люди =================

const PAL = {
  customer: {
    hair: hex('#6b4a38'),
    hairLight: hex('#8a6550'),
    hairDark: hex('#4a3226'),
    shirt: hex('#f4f4f6'),
    shirtLight: hex('#ffffff'),
    shirtDark: hex('#c9cedb'),
    jeans: hex('#2a3452'),
    jeansLight: hex('#3d4c74'),
    jeansDark: hex('#1b2238'),
  },
  shopper1: {
    hair: hex('#e6c35c'),
    hairLight: hex('#f2dc8a'),
    hairDark: hex('#b8962e'),
    shirt: hex('#ff7aa8'),
    shirtLight: hex('#ffa3c4'),
    shirtDark: hex('#d0507d'),
    jeans: hex('#262a3b'),
    jeansLight: hex('#3a3f55'),
    jeansDark: hex('#15172e'),
  },
  shopper2: {
    hair: hex('#231a1a'),
    hairLight: hex('#3d2e2e'),
    hairDark: hex('#120c0c'),
    shirt: hex('#ff8c2e'),
    shirtLight: hex('#ffb066'),
    shirtDark: hex('#c4621a'),
    jeans: hex('#6f8fc9'),
    jeansLight: hex('#93aedf'),
    jeansDark: hex('#4d6aa0'),
    skin: hex('#c98b62'),
    skinLight: hex('#e0a67c'),
    skinDark: hex('#9a6440'),
  },
  shopper3: {
    hair: hex('#c4622d'),
    hairLight: hex('#e08850'),
    hairDark: hex('#8f4520'),
    shirt: hex('#7a5cc8'),
    shirtLight: hex('#9a82e0'),
    shirtDark: hex('#5a3f9a'),
  },
};

/** Лист NPC: 4 строки (стоит лицом, стоит спиной, идёт лицом, идёт спиной) × 4 кадра 24×40. */
export function npcSheet(name) {
  const pal = PAL[name];
  const rows = ['idle_front', 'idle_back', 'walk_front', 'walk_back'];
  const sheet = new Canvas(24 * 4, 40 * rows.length);
  rows.forEach((anim, r) => {
    PLAYER_FRAMES[anim].forEach((opts, i) => {
      // у покупателей нет очков: рисуем без них, закрашивая оправу цветом кожи
      const p = person({ ...opts, pal, glasses: false });
      sheet.blit(p, i * 24, r * 40);
    });
  });
  return sheet;
}

/** Значок над покупателем: «!» и «…» (2 кадра 11×13). */
export function iconTalk() {
  const sheet = new Canvas(22, 13);
  for (let f = 0; f < 2; f++) {
    const c = new Canvas(11, 13);
    c.rect(1, 1, 9, 8, P.accent);
    c.rect(1, 1, 9, 1, P.accentLight ?? P.white);
    c.rect(4, 9, 3, 1, P.accent);
    c.set(5, 10, P.accent);
    if (f === 0) {
      c.rect(5, 2, 1, 4, P.outline);
      c.set(5, 7, P.outline);
    } else {
      for (const x of [3, 5, 7]) c.set(x, 6, P.outline);
    }
    c.outline(P.outline);
    sheet.blit(c, f * 11, 0);
  }
  return sheet;
}

/** Стрелка-указатель над нужной полкой. */
export function arrowDown() {
  const c = new Canvas(9, 8);
  c.rect(3, 1, 3, 3, P.accent);
  c.rect(1, 4, 7, 1, P.accent);
  c.rect(2, 5, 5, 1, P.accent);
  c.rect(3, 6, 3, 1, P.accentDark);
  c.outline(P.outline);
  return c;
}
