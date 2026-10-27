import Phaser from 'phaser';
import { DEPTH, TILE_H } from '../config';
import { type Cell, depthAt } from '../iso';
import { IsoRoom } from './IsoRoom';
import type { Dir } from './Player';

/**
 * Комнаты-диорамы, отрендеренные в Blender.
 * Описание комнаты (rooms/<id>.json) — общее для рендера и для игры: из него берутся размеры,
 * непроходимые клетки и двери. Разметка рендера (src/assets/rooms/<id>.layout.json) говорит,
 * где лежат картинки фона, вырезок и дверей.
 */

export interface RoomDef {
  id: string;
  cols: number;
  rows: number;
  spawn: Cell;
  walls: Record<'left' | 'right', { type: string; id?: string; at: number }[]>;
  objects: RoomObject[];
}

export interface RoomObject {
  type: string;
  id?: string;
  x: number;
  y: number;
  w?: number;
  d?: number;
  walkable?: boolean;
  approach?: Cell;
  /** Зритель на стуле (вариант персонажа из src/assets/characters) */
  spectator?: string;
  /** Как с предметом взаимодействует персонаж */
  interact?: { id: string; approach: Cell; face: Dir; seat?: Cell };
}

interface Img {
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  id: string;
  image: string;
  width: number;
  height: number;
  tex: number;
  originX: number;
  originY: number;
  bg: string;
  layers: (Partial<Img> & {
    id: string;
    kind: 'occluder' | 'door' | 'door_free' | 'item' | 'wall';
    cell?: { x: number; y: number; w: number; d: number };
    /** Сдвиг глубины в клетках (спинка стула рисуется поверх сидящего) */
    bias?: number;
    /** Кадры анимации (мигание огоньков) */
    frames?: string[];
    open?: Img;
    closed?: Img;
    side?: 'left' | 'right';
    at?: number;
  })[];
}

const base = (id: string) => `${import.meta.env.BASE_URL}assets/rooms/${id}/`;
export const texKey = (room: string, file: string) => `room:${room}:${file}`;

/** Загрузить картинки диорамы (вызывается в загрузчике игры). */
export function loadDiorama(load: Phaser.Loader.LoaderPlugin, layout: Layout): void {
  load.image(texKey(layout.id, layout.image), base(layout.id) + layout.image);
  for (const l of layout.layers ?? []) {
    for (const img of [l, l.open, l.closed]) {
      if (img?.file) load.image(texKey(layout.id, img.file), base(layout.id) + img.file);
    }
    for (const f of l.frames ?? []) load.image(texKey(layout.id, f), base(layout.id) + f);
  }
}

export interface DioramaDoor {
  id: string;
  sprite: Phaser.GameObjects.Image;
  approach: Cell;
  face: Dir;
  open(): void;
  close(): void;
}

/** Интерактивный предмет на стене (например, доска «Лучший продавец») */
export interface DioramaWallItem {
  sprite: Phaser.GameObjects.Image;
  approach: Cell;
  face: Dir;
}

export interface Diorama {
  room: IsoRoom;
  walls: Map<string, DioramaWallItem>;
  /** Вырезки предметов по id (их можно сделать интерактивными) */
  layers: Map<string, Phaser.GameObjects.Image>;
  doors: Map<string, DioramaDoor>;
}

/** Построить комнату-диораму: фон, вырезки предметов с правильной глубиной, двери, сетку проходимости. */
export function buildDiorama(scene: Phaser.Scene, def: RoomDef, layout: Layout): Diorama {
  const k = 1 / layout.tex;
  const toWorld = (x: number, y: number) => ({ x: (x - layout.originX) * k, y: (y - layout.originY) * k });
  const tl = toWorld(0, 0);
  scene.add
    .image(tl.x, tl.y, texKey(layout.id, layout.image))
    .setOrigin(0, 0)
    .setScale(k)
    .setDepth(DEPTH.floor);
  scene.cameras.main.setBackgroundColor(layout.bg);

  const room = new IsoRoom(scene, {
    cols: def.cols,
    rows: def.rows,
    backdrop: new Phaser.Geom.Rectangle(tl.x, tl.y, layout.width * k, layout.height * k),
  });
  for (const o of def.objects) {
    if (o.walkable) continue;
    for (let y = o.y; y < o.y + (o.d ?? 1); y++)
      for (let x = o.x; x < o.x + (o.w ?? 1); x++) room.setBlocked({ x, y }, true);
  }

  const layers = new Map<string, Phaser.GameObjects.Image>();
  const doors = new Map<string, DioramaDoor>();
  const walls = new Map<string, DioramaWallItem>();
  const wallSpot = (side: 'left' | 'right' | undefined, at: number) => ({
    approach: side === 'left' ? { x: 0, y: Math.round(at) } : { x: Math.round(at), y: 0 },
    face: (side === 'left' ? 'nw' : 'ne') as Dir,
  });
  for (const l of layout.layers ?? []) {
    if (l.kind === 'wall' && l.file && l.x != null && l.y != null) {
      const p = toWorld(l.x, l.y);
      const sprite = scene.add
        .image(p.x, p.y, texKey(layout.id, l.file))
        .setOrigin(0, 0)
        .setScale(k)
        .setDepth(DEPTH.wall + 50);
      walls.set(l.id, { sprite, ...wallSpot(l.side, l.at ?? 0) });
      continue;
    }
    if (l.kind === 'door' && l.closed && l.open) {
      const open = l.open;
      const closed = l.closed;
      const p = toWorld(closed.x, closed.y);
      const sprite = scene.add
        .image(p.x, p.y, texKey(layout.id, closed.file))
        .setOrigin(0, 0)
        .setScale(k)
        .setDepth(DEPTH.wall + 50);
      const at = l.at ?? 0;
      doors.set(l.id, {
        id: l.id,
        sprite,
        approach: l.side === 'left' ? { x: 0, y: Math.round(at) } : { x: Math.round(at), y: 0 },
        face: l.side === 'left' ? 'nw' : 'ne',
        open: () => sprite.setTexture(texKey(layout.id, open.file)),
        close: () => sprite.setTexture(texKey(layout.id, closed.file)),
      });
    } else if (l.file && l.x != null && l.y != null && l.cell) {
      const p = toWorld(l.x, l.y);
      // Глубина: «дальняя клетка предмета + половина клетки» — персонаж за предметом рисуется под вырезкой.
      // Предметы на мебели — чуть выше самой мебели.
      const bias = (l.bias ?? 0) + (l.kind === 'item' ? 1 : 0);
      const img = scene.add
        .image(p.x, p.y, texKey(layout.id, l.file))
        .setOrigin(0, 0)
        .setScale(k)
        .setDepth(DEPTH.objects + depthAt(l.cell.x, l.cell.y) + TILE_H / 4 + bias);
      layers.set(l.id, img);
      if (l.frames?.length) {
        // мигание: кадры по очереди
        let f = 0;
        const frames = l.frames;
        scene.time.addEvent({
          delay: 420 + Math.random() * 200,
          loop: true,
          callback: () => img.setTexture(texKey(layout.id, frames[(f = (f + 1) % frames.length)])),
        });
      }
    }
  }
  return { room, layers, doors, walls };
}
