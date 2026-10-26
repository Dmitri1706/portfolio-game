// Изометрические «коробки» для мебели и предметов на полу.
// Координаты футпринта: a клеток вдоль оси X сетки (вниз-вправо), b клеток вдоль оси Y (вниз-влево).
// T — верхний (дальний) угол основания коробки на холсте.
import { Canvas } from './canvas.mjs';

/** Заливка многоугольника по центрам пикселей (совпадает с геометрией плиток пола). */
export function fillPoly(c, pts, col) {
  if (!col) return;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) c.set(x, y, col);
    }
}

/**
 * Геометрия коробки. Возвращает функции для рисования деталей на гранях:
 *  top(u, v)   — точка на верхней грани, u — доля по X (0..a), v — по Y (0..b), в клетках
 *  left(s, z)  — точка на левой видимой грани (смотрит вниз-влево): s — пиксели от левого угла, z — высота
 *  right(s, z) — точка на правой видимой грани (смотрит вниз-вправо): s — пиксели от нижнего угла
 */
export function boxGeom(Tx, Ty, a, b, h, z0 = 0) {
  const T = [Tx, Ty - z0];
  const R = [Tx + 16 * a, Ty + 8 * a - z0];
  const B = [Tx + 16 * (a - b), Ty + 8 * (a + b) - z0];
  const L = [Tx - 16 * b, Ty + 8 * b - z0];
  return {
    T,
    R,
    B,
    L,
    h,
    top: (u, v) => [T[0] + 16 * u - 16 * v, T[1] + 8 * u + 8 * v - h],
    left: (s, z) => [L[0] + s, L[1] + s / 2 - z],
    right: (s, z) => [B[0] + s, B[1] - s / 2 - z],
  };
}

/** Рисует коробку: верх светлый, левая грань средняя, правая — в тени (свет сверху слева). */
export function drawBox(c, Tx, Ty, a, b, h, { top, left, right, z0 = 0, topEdge }) {
  const g = boxGeom(Tx, Ty, a, b, h, z0);
  const up = (p) => [p[0], p[1] - h];
  fillPoly(c, [g.L, g.B, up(g.B), up(g.L)], left);
  fillPoly(c, [g.B, g.R, up(g.R), up(g.B)], right);
  fillPoly(c, [up(g.T), up(g.R), up(g.B), up(g.L)], top);
  if (topEdge) {
    // светлая кромка по переднему краю верха
    for (let s = 0; s < 16 * a; s++) {
      const [x, y] = g.left(s, h);
      c.set(Math.floor(x), Math.floor(y), topEdge);
    }
    for (let s = 0; s < 16 * b; s++) {
      const [x, y] = g.right(s, h);
      c.set(Math.floor(x), Math.floor(y), topEdge);
    }
  }
  return g;
}

export const px = (c, p, col) => c.set(Math.floor(p[0]), Math.floor(p[1]), col);

/**
 * Холст для предмета на полу с футпринтом a×b клеток и высотой до H пикселей.
 * Возвращает { c, Tx, Ty, spec } — spec пишется в sprites.json (anchor = угол T).
 */
export function objectCanvas(a, b, H, frames = 1) {
  const w = 16 * (a + b) + 2;
  const h = 8 * (a + b) + H + 2;
  const Tx = 16 * b + 1;
  const Ty = H + 1;
  return { w, h, Tx, Ty, frames, make: () => new Canvas(w, h) };
}
