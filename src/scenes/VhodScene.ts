import type Phaser from 'phaser';
import type { Cell } from '../iso';
import { IsoRoom } from '../world/IsoRoom';
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

/**
 * Комната «В ХОД»: светлый офис с неоновыми акцентами.
 * Сетка 11×10. Левая стена (x = 0): график, экран сцены, дверь выхода.
 * Правая стена (y = 0): плакат над столом, доска со стикерами над тумбой.
 */
export class VhodScene extends RoomScene {
  private spectators: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super('Vhod');
  }

  protected build(): void {
    this.spectators = [];
    this.room = new IsoRoom(this, {
      cols: 11,
      rows: 10,
      floor: 'floor_vhod',
      wallLeft: 'wall_vhod_left',
      wallRight: 'wall_vhod_right',
    });
    const r = this.room;

    // ---- стены ----
    r.placeOnWall('chart_line', 'left', 0, 2);
    r.placeOnWall('stage_screen', 'left', 3, 4);
    r.placeOnWall('chart_growth', 'right', 2, 3);
    r.placeOnWall('sticky_board', 'right', 6, 3);

    // ---- декор ----
    r.placeObject('plant', 0, 0);
    r.placeObject('plant', 10, 9);
    r.placeObject('plant', 0, 9);
    r.placeObject('server_rack', 10, 0).play('server_rack:loop');
    r.placeObject('stage', 0, 3);

    // ---- 1. Компьютер на столе: персонаж садится на стул ----
    const desk = r.placeObject('desk_pc', 3, 0);
    const chair = r.placeObject('chair_office', 3, 1, { depthBias: 1 });
    this.addInteractable({
      id: 'computer',
      sprites: [desk, chair],
      approach: { x: 3, y: 2 },
      face: 'ne',
      onUse: async () => {
        await this.sitOn({ x: 3, y: 1 }, 'ne');
        this.openAfterAction('computer', () => openSiteWindow(() => this.standUp()));
      },
    });

    // ---- 2. Сцена со зрителями: персонаж садится в зал ----
    const seats: Cell[] = [
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 3, y: 5 },
      { x: 3, y: 6 },
      { x: 4, y: 3 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
    ];
    seats.forEach((s, i) => {
      const v = i % 3;
      const sp = r.placeObject('spectators', s.x, s.y, { flip: true });
      sp.setFrame(v * 3);
      sp.setData('variant', v);
      this.spectators.push(sp);
    });
    const freeSeat = { x: 4, y: 4 };
    const seatChair = r.placeObject('chair_audience', freeSeat.x, freeSeat.y, { flip: true, depthBias: 1 });
    this.addInteractable({
      id: 'stage',
      sprites: [seatChair, ...this.spectators],
      approach: { x: 5, y: 4 },
      face: 'nw',
      onUse: async () => {
        await this.sitOn(freeSeat, 'nw');
        this.openAfterAction('stage', () =>
          openPresentationWindow(
            () => this.standUp(),
            () => this.applause(),
          ),
        );
      },
    });

    // ---- 3. Газета на журнальном столике — медиакит ----
    const coffee = r.placeObject('coffee_table', 6, 6);
    const paper = r.placeObject('item_newspaper', 6, 6, { walkable: true, depthBias: 0.5 });
    this.addInteractable({
      id: 'mediakit',
      sprites: [paper, coffee],
      approach: { x: 6, y: 7 },
      face: 'ne',
      onUse: () => {
        this.pickUp(paper, 'held_newspaper');
        this.openAfterAction('mediakit', () => openMediakitWindow(() => this.putDown(paper, 'ne')));
      },
    });

    // ---- 4. Телефон на высоком столике — вебинар ----
    const bar = r.placeObject('bar_table', 9, 4);
    const phone = r.placeObject('item_phone', 9, 4, { walkable: true, depthBias: 0.5 });
    this.addInteractable({
      id: 'webinar',
      sprites: [phone, bar],
      approach: { x: 8, y: 4 },
      face: 'se',
      onUse: () => {
        this.pickUp(phone, 'held_phone');
        this.openAfterAction('webinar', () => openWebinarWindow(() => this.putDown(phone, 'se')));
      },
    });

    // ---- 5. Папка на тумбе — резюме ----
    const cab = r.placeObject('cabinet', 7, 0);
    const folder = r.placeObject('item_folder', 7, 0, { walkable: true, depthBias: 0.5 });
    this.addInteractable({
      id: 'resume',
      sprites: [folder, cab],
      approach: { x: 7, y: 1 },
      face: 'ne',
      onUse: () => {
        this.pickUp(folder, 'held_folder');
        this.openAfterAction('resume', () => openResumeWindow(() => this.putDown(folder, 'ne')));
      },
    });

    // ---- дверь выхода ----
    const exit = r.placeOnWall('door_exit', 'left', 8);
    const sign = r.placeOnWall('sign_exit', 'left', 7, 3, 1);
    const it = this.addInteractable({
      id: 'exit',
      sprites: [exit, sign],
      approach: { x: 0, y: 8 },
      face: 'nw',
      onUse: () => this.enterDoor(exit, 'lobby', it),
    });

    this.createSpectatorAnims();
  }

  protected spawnCell(): Cell {
    return { x: 6, y: 3 };
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

  private createSpectatorAnims(): void {
    for (let v = 0; v < 3; v++) {
      const key = `spectators:clap${v}`;
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('spectators', { frames: [v * 3 + 1, v * 3 + 2] }),
        frameRate: 6,
        repeat: 8,
      });
    }
  }

  /** Аплодисменты зрителей на последнем слайде. */
  private applause(): void {
    sfx('applause');
    for (const sp of this.spectators) {
      const v = sp.getData('variant') as number;
      this.time.delayedCall(Math.random() * 250, () => {
        sp.play(`spectators:clap${v}`);
        sp.once('animationcomplete', () => sp.setFrame(v * 3));
      });
    }
  }
}
