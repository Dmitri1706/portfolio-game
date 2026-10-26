// Картинка-превью для соцсетей (Open Graph, 1200×630) и иконки сайта.
import { Canvas, hex } from '../lib/canvas.mjs';
import { P } from '../lib/palette.mjs';
import { textBlock } from '../lib/text.mjs';
import { person } from './character.mjs';
import { floorTile } from './world.mjs';

const BG = hex('#2b2640');
const BG_DOT = hex('#3a3356');

/** Превью 1200×630: персонаж на кусочке белого пола + подпись. Рисуется в 600×315 и увеличивается ×2. */
export function ogImage() {
  const c = new Canvas(600, 315);
  c.rect(0, 0, 600, 315, BG);
  for (let y = 4; y < 315; y += 8) for (let x = 4; x < 600; x += 8) c.set(x, y, BG_DOT);

  // сцена слева: пол 3×3 плитки и персонаж (рисуем мелко, потом увеличиваем ×3)
  const scene = new Canvas(100, 92);
  const tile = floorTile(P.white2, P.gray1, P.white);
  for (let gy = 0; gy < 3; gy++)
    for (let gx = 0; gx < 3; gx++) scene.blit(tile, 34 + (gx - gy) * 16, 44 + (gx + gy) * 8);
  // толщина пола под передними краями
  for (let x = 2; x < 98; x++) {
    let bottom = -1;
    for (let y = 91; y >= 0; y--) if (scene.get(x, y)) {
      bottom = y;
      break;
    }
    if (bottom > 50) for (let t = 1; t <= 4; t++) scene.set(x, bottom + t, x < 50 ? P.gray2 : P.gray3);
  }
  const shadow = new Canvas(16, 6);
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 16; x++) if (((x - 7.5) / 8) ** 2 + ((y - 2.5) / 3) ** 2 <= 1) shadow.set(x, y, P.gray2);
  scene.blit(shadow, 42, 66);
  scene.blit(person({ view: 'front', arms: 'forward' }), 38, 30);
  c.blit(scene.scaled(3), 10, 8);

  // подписи справа
  const name = textBlock(['Дмитрий Мельшин'], P.white, 'press').scaled(2);
  const role = textBlock(['Product / Маркетолог'], hex('#c8e7ff')).scaled(2);
  const game = textBlock(['Портфолио-игра'], P.accent, 'press').scaled(2);
  const x0 = 330;
  c.blit(name, x0, 92);
  c.blit(role, x0, 128);
  // полоска «загрузки» 100%
  c.rect(x0, 172, 240, 14, P.white);
  c.rect(x0 + 2, 174, 236, 10, P.doorway);
  for (let x = 0; x < 236; x++) c.rect(x0 + 2 + x, 174, 1, 10, x % 8 < 6 ? P.accent : P.accentDark);
  c.blit(game, x0, 202);
  return c.scaled(2);
}

/** Голова персонажа на жёлтом квадрате 16×16 — основа иконок сайта. */
function icon16() {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, P.accent);
  const p = person({ view: 'front' });
  // кадр 24×40: голова с очками — столбцы 4…19, строки 3…18
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const col = p.get(x + 4, y + 3);
      if (col) c.set(x, y, col);
    }
  return c;
}

export const favicon16 = () => icon16();
export const favicon32 = () => icon16().scaled(2);
/** 176×176 с полями до 180×180 (иконка для iPhone) */
export function appleTouch() {
  const c = new Canvas(180, 180);
  c.rect(0, 0, 180, 180, P.accent);
  c.blit(icon16().scaled(11), 2, 2);
  return c;
}

