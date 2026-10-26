import Phaser from 'phaser';
import spec from './sprites.json';

/**
 * Манифест спрайтов. Все картинки описаны в sprites.json по ключам.
 * Заменить спрайт = положить свой PNG с тем же именем в public/assets/sprites/.
 */
interface SpriteSpec {
  file: string;
  width: number;
  height: number;
  frames?: number;
  fps?: number;
  repeat?: number;
  columns?: number;
  wall?: 'left' | 'right';
  tiles?: number;
  anchorX?: number;
  anchorY?: number;
  anims?: Record<string, { row: number; frames: number; fps: number; repeat?: number }>;
}

export const SPRITES = spec as Record<string, SpriteSpec>;
export type SpriteKey = keyof typeof spec;

const BASE = `${import.meta.env.BASE_URL}assets/sprites/`;

export function loadSprites(load: Phaser.Loader.LoaderPlugin): void {
  for (const [key, s] of Object.entries(SPRITES)) {
    if (s.frames || s.columns) {
      load.spritesheet(key, BASE + s.file, { frameWidth: s.width, frameHeight: s.height });
    } else {
      load.image(key, BASE + s.file);
    }
  }
}

/** Создаёт анимации из описания листов. Имя анимации: "<ключ>:<анимация>", например "player:walk_front". */
export function createAnims(anims: Phaser.Animations.AnimationManager): void {
  for (const [key, s] of Object.entries(SPRITES)) {
    if (s.frames && !s.anims) {
      const name = `${key}:loop`;
      if (!anims.exists(name)) {
        anims.create({
          key: name,
          frames: anims.generateFrameNumbers(key, { start: 0, end: s.frames - 1 }),
          frameRate: s.fps ?? 8,
          repeat: s.repeat ?? -1,
        });
      }
    }
    if (!s.anims || !s.columns) continue;
    for (const [animName, a] of Object.entries(s.anims)) {
      const name = `${key}:${animName}`;
      if (anims.exists(name)) continue;
      const start = a.row * s.columns;
      anims.create({
        key: name,
        frames: anims.generateFrameNumbers(key, { start, end: start + a.frames - 1 }),
        frameRate: a.fps,
        repeat: a.repeat ?? -1,
      });
    }
  }
}
