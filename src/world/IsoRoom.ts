import Phaser from 'phaser';
import { DEPTH, FLOOR_T, TILE_H, TILE_W, WALL_H } from '../config';
import { type Cell, depthAt, gridToScreen } from '../iso';
import { SPRITES, type SpriteKey } from '../assets/manifest';
import { Pathfinder } from './Pathfinder';

export interface RoomConfig {
  cols: number;
  rows: number;
  floor: SpriteKey;
  wallLeft?: SpriteKey;
  wallRight?: SpriteKey;
}

export interface PlaceOptions {
  /** Клетки, которые предмет занимает (по ним нельзя ходить) */
  blocks?: Cell[];
  /** Сдвиг точки сортировки по глубине (в клетках), если нужно */
  depthOffset?: number;
}

/**
 * Изометрическая комната: пол, две задние стены, сетка проходимости и поиск пути.
 * Клетка (0,0) — верхний (дальний) угол. Левая стена идёт вдоль x = 0, правая — вдоль y = 0.
 */
export class IsoRoom {
  readonly grid: number[][];
  readonly pathfinder: Pathfinder;

  constructor(
    private scene: Phaser.Scene,
    readonly cfg: RoomConfig,
  ) {
    this.grid = Array.from({ length: cfg.rows }, () => new Array(cfg.cols).fill(0));
    this.pathfinder = new Pathfinder(this.grid);
    this.build();
  }

  private build(): void {
    const { cols, rows, floor, wallLeft, wallRight } = this.cfg;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p = gridToScreen(x, y);
        const left = p.x - TILE_W / 2;
        const top = p.y - TILE_H / 2;
        this.image(floor, left, top, DEPTH.floor);
        if (y === rows - 1) this.image('floor_edge_left', left, top, DEPTH.floor + 1);
        if (x === cols - 1) this.image('floor_edge_right', p.x, top, DEPTH.floor + 1);
        if (x === 0 && wallLeft) this.image(wallLeft, left, top - WALL_H, DEPTH.wall + y);
        if (y === 0 && wallRight) this.image(wallRight, p.x, top - WALL_H, DEPTH.wall + x);
      }
    }
  }

  private image(key: string, x: number, y: number, depth: number): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, key).setOrigin(0, 0).setDepth(depth);
  }

  /**
   * Ставит спрайт-предмет на пол. Точка (gx, gy) совпадает с anchorX/anchorY спрайта
   * (или с серединой нижнего края, если anchor не задан).
   */
  place(key: SpriteKey, gx: number, gy: number, opts: PlaceOptions = {}): Phaser.GameObjects.Sprite {
    const s = SPRITES[key];
    const p = gridToScreen(gx, gy);
    const spr = this.scene.add.sprite(p.x, p.y, key);
    spr.setDisplayOrigin(s.anchorX ?? s.width / 2, s.anchorY ?? s.height);
    const d = opts.depthOffset ?? 0;
    spr.setDepth(DEPTH.objects + depthAt(gx + d, gy + d));
    opts.blocks?.forEach((c) => this.setBlocked(c, true));
    return spr;
  }

  inBounds(c: Cell): boolean {
    return c.x >= 0 && c.y >= 0 && c.x < this.cfg.cols && c.y < this.cfg.rows;
  }

  isWalkable(c: Cell): boolean {
    return this.inBounds(c) && this.grid[c.y][c.x] === 0;
  }

  setBlocked(c: Cell, blocked: boolean): void {
    if (!this.inBounds(c)) return;
    this.grid[c.y][c.x] = blocked ? 1 : 0;
    this.pathfinder.setGrid(this.grid);
  }

  /** Ближайшая проходимая клетка к заданной (поиск в ширину), или null. */
  nearestWalkable(c: Cell, maxDist = 4): Cell | null {
    if (this.isWalkable(c)) return c;
    let best: Cell | null = null;
    let bestD = Infinity;
    for (let dy = -maxDist; dy <= maxDist; dy++) {
      for (let dx = -maxDist; dx <= maxDist; dx++) {
        const n = { x: c.x + dx, y: c.y + dy };
        if (!this.isWalkable(n)) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = n;
        }
      }
    }
    return best;
  }

  findPath(from: Cell, to: Cell): Cell[] | null {
    return this.pathfinder.find(from, to);
  }

  /** Прямоугольник, который занимает комната на экране (для камеры). */
  bounds(): Phaser.Geom.Rectangle {
    const { cols, rows } = this.cfg;
    const left = gridToScreen(0, rows - 1).x - TILE_W / 2;
    const right = gridToScreen(cols - 1, 0).x + TILE_W / 2;
    const top = gridToScreen(0, 0).y - TILE_H / 2 - WALL_H;
    const bottom = gridToScreen(cols - 1, rows - 1).y + TILE_H / 2 + FLOOR_T;
    return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top);
  }
}
