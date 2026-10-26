import { TILE_H, TILE_W } from './config';

export interface Cell {
  x: number;
  y: number;
}

/**
 * Сетка → экран. Центр клетки (0,0) находится в точке (0,0) мира.
 * Ось X сетки идёт вниз-вправо, ось Y — вниз-влево.
 */
export function gridToScreen(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

/** Экран → сетка (дробные координаты). */
export function screenToGrid(x: number, y: number): { gx: number; gy: number } {
  const a = x / (TILE_W / 2);
  const b = y / (TILE_H / 2);
  return { gx: (a + b) / 2, gy: (b - a) / 2 };
}

/** Экран → клетка, в которую попала точка. */
export function screenToCell(x: number, y: number): Cell {
  const g = screenToGrid(x, y);
  return { x: Math.round(g.gx), y: Math.round(g.gy) };
}

/** Глубина отрисовки для объекта, стоящего в точке сетки (gx, gy). */
export function depthAt(gx: number, gy: number): number {
  return gridToScreen(gx, gy).y;
}
