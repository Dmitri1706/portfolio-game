import type Phaser from 'phaser';
import { DEPTH } from '../config';
import { type Cell, depthAt, gridToScreen } from '../iso';
import VHOD from '../../rooms/vhod.json';
import VHOD_LAYOUT from '../assets/rooms/vhod.layout.json';
import { buildDiorama, type Layout, type RoomDef, type RoomObject } from '../world/diorama';
import { addCharacter } from '../world/characters';
import { RoomScene } from './RoomScene';
import { sfx } from '../audio';
import { achieve, explore, exploredCount } from '../state';
import { showAchievement } from '../ui/toast';
import {
  openMediakitWindow,
  openPresentationWindow,
  openResumeWindow,
  openSiteWindow,
  openWebinarWindow,
} from '../ui/caseWindows';

const ROOM = 'vhod';
const TOTAL = 5;

/** Предметы, которые берут в руки: картинка в руках и окно, которое открывается */
const HELD: Record<string, [string, (onClose: () => void) => void]> = {
  mediakit: ['held3d_newspaper', openMediakitWindow],
  webinar: ['held3d_phone', openWebinarWindow],
  resume: ['held3d_folder', openResumeWindow],
};

const DEF = VHOD as RoomDef;

/**
 * Комната «В ХОД»: светлый офис с неоновыми акцентами (рендер Blender, описание — rooms/vhod.json).
 * Левая стена: окно, экран сцены, дверь выхода. Правая: окна, неоновый логотип, график, доска со стикерами.
 */
export class VhodScene extends RoomScene {
  private spectators: { sprite: Phaser.GameObjects.Sprite; variant: string }[] = [];

  constructor() {
    super('Vhod');
  }

  protected build(): void {
    this.spectators = [];
    const d = buildDiorama(this, DEF, VHOD_LAYOUT as Layout);
    this.room = d.room;

    // id картинки-вырезки предмета: свой id из описания или «obj<номер>_<тип>»
    const layerOf = (o: RoomObject) => d.layers.get(o.id ?? `obj${DEF.objects.indexOf(o)}_${o.type}`);
    // мебель, на которой лежит предмет (та же клетка)
    const furnitureUnder = (o: RoomObject) =>
      DEF.objects.filter((f) => f !== o && !f.type.startsWith('item_') && f.x === o.x && f.y === o.y).map(layerOf)[0];

    // ---- зрители на стульях ----
    for (const o of DEF.objects) {
      if (!o.spectator) continue;
      const p = gridToScreen(o.x, o.y);
      const s = addCharacter(this, o.spectator, p.x, p.y, 'sit', 'nw');
      s.setDepth(DEPTH.objects + depthAt(o.x, o.y) + 0.3);
      this.spectators.push({ sprite: s, variant: o.spectator });
    }

    // ---- предметы ----
    const sprites = (...l: (Phaser.GameObjects.Image | undefined)[]) => l.filter((x): x is Phaser.GameObjects.Image => !!x);
    for (const o of DEF.objects) {
      const ia = o.interact;
      if (!ia) continue;
      const img = layerOf(o);
      if (ia.id === 'computer' && ia.seat) {
        // 1. Компьютер на столе: персонаж садится на стул
        const seat = ia.seat;
        this.addInteractable({
          id: ia.id,
          sprites: sprites(img, d.layers.get('desk_pc')),
          approach: ia.approach,
          face: ia.face,
          onUse: async () => {
            await this.sitOn(seat, ia.face);
            this.openAfterAction('computer', () => openSiteWindow(() => this.standUp()));
          },
        });
      } else if (ia.id === 'stage' && ia.seat) {
        // 2. Сцена со зрителями: персонаж садится в зал
        const seat = ia.seat;
        this.addInteractable({
          id: ia.id,
          sprites: sprites(img, ...this.spectators.map((s) => s.sprite)),
          approach: ia.approach,
          face: ia.face,
          onUse: async () => {
            await this.sitOn(seat, ia.face);
            this.openAfterAction('stage', () =>
              openPresentationWindow(
                () => this.standUp(),
                () => this.applause(),
              ),
            );
          },
        });
      } else if (img && HELD[ia.id]) {
        // 3–5. Газета, телефон, папка: персонаж берёт предмет в руки
        const [held, open] = HELD[ia.id];
        this.addInteractable({
          id: ia.id,
          sprites: sprites(img, furnitureUnder(o)),
          approach: ia.approach,
          face: ia.face,
          onUse: () => {
            this.pickUp(img, held);
            this.openAfterAction(ia.id, () => open(() => this.putDown(img, ia.face)));
          },
        });
      }
    }

    // ---- дверь выхода ----
    const exit = d.doors.get('exit');
    if (exit) {
      const it = this.addInteractable({
        id: 'exit',
        sprites: [exit.sprite],
        approach: exit.approach,
        face: exit.face,
        onUse: () => this.enterDoor(exit, 'lobby', it),
      });
    }
  }

  protected spawnCell(): Cell {
    return DEF.spawn;
  }

  protected progressText(): string {
    return `Изучено: ${exploredCount(ROOM)}/${TOTAL}`;
  }

  /** Небольшая пауза после действия персонажа, затем окно; предмет отмечается изученным. */
  private openAfterAction(id: string, open: () => void): void {
    this.time.delayedCall(280, () => {
      open();
      const n = explore(ROOM, id);
      this.refreshHud();
      if (n >= TOTAL && achieve('vhod_done')) {
        this.time.delayedCall(500, () => showAchievement('Кейс В ХОД пройден! 🏆'));
      }
    });
  }

  /** Аплодисменты зрителей на последнем слайде. */
  private applause(): void {
    sfx('applause');
    for (const { sprite, variant } of this.spectators) {
      this.time.delayedCall(Math.random() * 250, () => {
        sprite.play(`${variant}:clap_nw`);
        sprite.once('animationcomplete', () => sprite.play(`${variant}:sit_nw`));
      });
    }
  }
}
