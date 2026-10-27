import Phaser from 'phaser';
import { DEPTH, FLOOR_T, TILE_H, TILE_W, WALL_H } from '../config';
import { type Cell, depthAt, gridToScreen } from '../iso';
import { SPRITES, type SpriteKey } from '../assets/manifest';
import { Pathfinder } from './Pathfinder';

export interface RoomConfig {
  cols: number;
  rows: number;
  /** Плитка пола (пиксельные комнаты). У диорам пола-плиток нет — его рисует фон-рендер */
  floor?: SpriteKey;
  /** Прямоугольник фона-рендера (игровые пиксели) — у диорам вместо пола и стен из плиток */
  backdrop?: Phaser.Geom.Rectangle;
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
    if (!floor) return;
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

  /**
   * Ставит мебель/предмет с футпринтом (см. "footprint" в sprites.json) так, что его дальний угол
   * совпадает с дальним углом клетки (x0, y0). Занятые клетки становятся непроходимыми.
   */
  placeObject(
    key: SpriteKey,
    x0: number,
    y0: number,
    opts: { walkable?: boolean; flip?: boolean; depthBias?: number } = {},
  ): Phaser.GameObjects.Sprite {
    const s = SPRITES[key];
    const [a, b] = s.footprint ?? [1, 1];
    const p = gridToScreen(x0 - 0.5, y0 - 0.5);
    const spr = this.scene.add.sprite(p.x, p.y, key);
    spr.setDisplayOrigin(s.anchorX ?? s.width / 2, s.anchorY ?? s.height);
    spr.setFlipX(!!opts.flip);
    spr.setDepth(DEPTH.objects + depthAt(x0, y0) + TILE_H / 4 + (opts.depthBias ?? 0));
    if (!opts.walkable) {
      for (let y = y0; y < y0 + b; y++) for (let x = x0; x < x0 + a; x++) this.setBlocked({ x, y }, true);
    }
    return spr;
  }

  /**
   * Вешает предмет на стену (дверь, вывеска, табличка). Он занимает n плиток стены, начиная с first.
   * Левая стена: плитки (0, first)…(0, first+n-1). Правая: (first, 0)…(first+n-1, 0).
   */
  placeOnWall(key: SpriteKey, side: 'left' | 'right', first: number, n = 1, layer = 0): Phaser.GameObjects.Sprite {
    let x: number;
    let y: number;
    if (side === 'left') {
      const p = gridToScreen(0, first + n - 1);
      x = p.x - TILE_W / 2;
      y = p.y - WALL_H - (TILE_H / 2) * n;
    } else {
      const p = gridToScreen(first, 0);
      x = p.x;
      y = p.y - TILE_H / 2 - WALL_H;
    }
    return this.scene.add
      .sprite(x, y, key)
      .setOrigin(0, 0)
      .setDepth(DEPTH.wall + 50 + layer);
  }

  /**
   * Экранная точка пикселя стены: плитка tile, u — пиксель вдоль плитки слева направо (0…15),
   * h — высота над полом. Нужна, чтобы ставить что-то на полки.
   */
  wallPoint(side: 'left' | 'right', tile: number, u: number, h: number): { x: number; y: number } {
    if (side === 'left') {
      const p = gridToScreen(0, tile);
      return { x: p.x - TILE_W / 2 + u, y: p.y - TILE_H / 2 + Math.ceil((15 - u) / 2) - 1 - h };
    }
    const p = gridToScreen(tile, 0);
    return { x: p.x + u, y: p.y - TILE_H / 2 - 1 + Math.ceil(u / 2) - h };
  }

  /** Все проходимые клетки (например, чтобы выбрать случайную). */
  walkableCells(): Cell[] {
    const out: Cell[] = [];
    for (let y = 0; y < this.cfg.rows; y++) for (let x = 0; x < this.cfg.cols; x++) if (this.grid[y][x] === 0) out.push({ x, y });
    return out;
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
    if (this.cfg.backdrop) return this.cfg.backdrop;
    const { cols, rows } = this.cfg;
    const left = gridToScreen(0, rows - 1).x - TILE_W / 2;
    const right = gridToScreen(cols - 1, 0).x + TILE_W / 2;
    const top = gridToScreen(0, 0).y - TILE_H / 2 - WALL_H;
    const bottom = gridToScreen(cols - 1, rows - 1).y + TILE_H / 2 + FLOOR_T;
    return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top);
  }
}
