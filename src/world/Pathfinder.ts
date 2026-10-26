import EasyStar from 'easystarjs';
import type { Cell } from '../iso';

/** Поиск пути A* по сетке проходимых клеток (0 — можно ходить, 1 — нельзя). */
export class Pathfinder {
  private es = new EasyStar.js();

  constructor(grid: number[][]) {
    this.es.setAcceptableTiles([0]);
    this.es.enableDiagonals();
    this.es.disableCornerCutting();
    this.es.enableSync();
    this.setGrid(grid);
  }

  setGrid(grid: number[][]): void {
    this.es.setGrid(grid);
  }

  find(from: Cell, to: Cell): Cell[] | null {
    let result: Cell[] | null = null;
    this.es.findPath(from.x, from.y, to.x, to.y, (path) => {
      result = path;
    });
    this.es.calculate();
    return result;
  }
}
