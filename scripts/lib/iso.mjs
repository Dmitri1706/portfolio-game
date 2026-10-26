// Изометрическая геометрия для генератора: ромб пола 32×16 и «стенные» координаты.
import { Canvas } from './canvas.mjs';

export const WALL_H = 72;
export const FLOOR_T = 6;

/** В строке y ромб 32×16 занимает столбцы [16 - hw, 15 + hw], hw = 2*min(y, 15-y) + 1. */
export function diamondRow(y) {
  const yy = Math.min(y, 15 - y);
  const hw = 2 * yy + 1;
  return [16 - hw, 15 + hw];
}
/** Первая (верхняя) строка ромба в столбце x */
export const topRowAt = (x) => (x < 16 ? Math.ceil((15 - x) / 2) : Math.ceil((x - 16) / 2));
/** Последняя (нижняя) строка ромба в столбце x */
export const bottomRowAt = (x) => 15 - topRowAt(x);

/**
 * Холст для предмета на стене шириной n плиток (дверь, вывеска, табличка).
 * Он ставится в игре так же, как куски стены, и рисуется в координатах стены:
 * u — пиксель вдоль стены слева направо, h — высота над полом (0 — у самого пола).
 */
export function wallCanvas(n) {
  return new Canvas(16 * n, WALL_H + 8 * n);
}

export function wallTop(side, n, u) {
  return side === 'left' ? Math.ceil((16 * n - 1 - u) / 2) : Math.ceil(u / 2);
}

export function wallY(side, n, u, h) {
  return wallTop(side, n, u) + WALL_H - 1 - h;
}

export function wallSet(c, side, n, u, h, color) {
  if (u < 0 || u >= 16 * n) return;
  c.set(u, wallY(side, n, u, h), color);
}

/**
 * Переносит плоскую картинку на стену. (u0, hTop) — куда попадёт её левый верхний угол.
 * Фон наклоняется по столбцам, а буквы и значки (flat.spans) — целиком, чтобы оставаться ровными.
 */
export function wallBlit(c, side, n, flat, u0, hTop) {
  shearBlit(flat, (x, y, sx, col) => {
    const u = u0 + x;
    if (u < 0 || u >= 16 * n) return;
    const us = Math.min(16 * n - 1, Math.max(0, u0 + sx));
    c.set(u, wallTop(side, n, us) + WALL_H - 1 - (hTop - y), col);
  });
}

/**
 * Перенос с наклоном в два прохода.
 * 1) Фон: каждый столбец сдвигается сам по себе; на месте букв — цвет фона слева от них.
 * 2) Буквы/значки (flat.spans): каждая группа сдвигается целиком по своему центру.
 * place(x, y, shearX, color) — поставить пиксель (x, y) картинки, наклон считать по столбцу shearX.
 */
export function shearBlit(flat, place) {
  const inGlyph = new Set();
  for (const s of flat.spans) for (const [x, y] of s.pixels) inGlyph.add(x + ',' + y);
  for (let y = 0; y < flat.h; y++)
    for (let x = 0; x < flat.w; x++) {
      let col = flat.get(x, y);
      if (!col) continue;
      if (inGlyph.has(x + ',' + y)) {
        let bx = x - 1;
        while (bx >= 0 && inGlyph.has(bx + ',' + y)) bx--;
        col = flat.get(bx, y) ?? col;
      }
      place(x, y, x, col);
    }
  for (const s of flat.spans)
    for (const [x, y] of s.pixels) {
      const col = flat.get(x, y);
      if (col) place(x, y, s.cx, col);
    }
}

/** Обводка по контуру нарисованного на стене (контур тоже «скашивается» правильно). */
export function wallOutlineFlat(flat, color) {
  const c = new Canvas(flat.w + 2, flat.h + 2);
  c.blit(flat, 1, 1);
  c.outline(color);
  return c;
}
