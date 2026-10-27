import Phaser from 'phaser';
import PLAYER3D from '../assets/player3d.json';

/**
 * Персонажи из Blender: наш герой (player) и другие люди — зрители, покупатели.
 * Описания лежат в src/assets/player3d.json и src/assets/characters/<вариант>.json (их пишет blender/build_character.py),
 * листы кадров — public/assets/sprites3d/<вариант>_<анимация>.webp.
 */
export interface CharMeta {
  frameW: number;
  frameH: number;
  anchorX: number;
  anchorY: number;
  tex: number;
  dirs: string[];
  anims: Record<string, { file: string; frames: number; fps: number; repeat: number }>;
}

const others = import.meta.glob('../assets/characters/*.json', { eager: true, import: 'default' }) as Record<
  string,
  CharMeta
>;

export const CHARACTERS: Record<string, CharMeta> = { player: PLAYER3D as CharMeta };
for (const [path, meta] of Object.entries(others)) {
  CHARACTERS[path.split('/').pop()!.replace('.json', '')] = meta;
}

const SPRITES3D = `${import.meta.env.BASE_URL}assets/sprites3d/`;

/** Предметы в руках (рендер blender/build_items.py) */
export const HELD_ITEMS = ['newspaper', 'phone', 'folder', 'sneaker0', 'sneaker1', 'sneaker2', 'sneaker3'];

export function loadCharacters(load: Phaser.Loader.LoaderPlugin): void {
  for (const [name, m] of Object.entries(CHARACTERS)) {
    for (const [anim, a] of Object.entries(m.anims)) {
      load.spritesheet(`${name}_${anim}`, SPRITES3D + a.file, { frameWidth: m.frameW, frameHeight: m.frameH });
    }
  }
  for (const item of HELD_ITEMS) load.image(`held3d_${item}`, `${SPRITES3D}held_${item}.webp`);
}

/** Анимации «<вариант>:<анимация>_<направление>», например player:walk_se, spectator1:clap_nw. */
export function createCharacterAnims(anims: Phaser.Animations.AnimationManager): void {
  for (const [name, m] of Object.entries(CHARACTERS)) {
    for (const [anim, a] of Object.entries(m.anims)) {
      m.dirs.forEach((dir, row) => {
        const key = `${name}:${anim}_${dir}`;
        if (anims.exists(key)) return;
        const start = row * a.frames;
        anims.create({
          key,
          frames: anims.generateFrameNumbers(`${name}_${anim}`, { start, end: start + a.frames - 1 }),
          frameRate: a.fps,
          repeat: a.repeat,
        });
      });
    }
  }
}

/** Неподвижный персонаж-вариант в клетке (например, зритель на стуле). */
export function addCharacter(
  scene: Phaser.Scene,
  name: string,
  x: number,
  y: number,
  anim: string,
  dir: string,
): Phaser.GameObjects.Sprite {
  const m = CHARACTERS[name];
  const s = scene.add.sprite(x, y, `${name}_${anim}`);
  s.setOrigin(m.anchorX / m.frameW, m.anchorY / m.frameH).setScale(1 / m.tex);
  s.play(`${name}:${anim}_${dir}`);
  return s;
}
