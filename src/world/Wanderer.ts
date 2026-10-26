import Phaser from 'phaser';
import type { Cell } from '../iso';
import type { IsoRoom } from './IsoRoom';
import { Player, type Dir } from './Player';

/**
 * Фоновый покупатель: бродит по залу, останавливается, смотрит по сторонам.
 * Не интерактивный и не занимает клетки — персонаж игрока проходит сквозь него.
 */
export class Wanderer {
  readonly body: Player;
  /** Занят поручением (идёт «покупать» кроссовок) */
  busy = false;
  private waitUntil = 0;

  constructor(
    private scene: Phaser.Scene,
    private room: IsoRoom,
    key: string,
    start: Cell,
    private pickCell: () => Cell,
  ) {
    this.body = new Player(scene, start, key);
    this.body.dir = (['se', 'sw', 'ne', 'nw'] as Dir[])[Math.floor(Math.random() * 4)];
    this.body.idle();
    this.waitUntil = scene.time.now + 500 + Math.random() * 3000;
  }

  /** Сходить к клетке; по приходу повернуться и выполнить действие. */
  goTo(c: Cell, face: Dir, then: () => void): void {
    const path = this.room.findPath(this.body.cell, c);
    if (!path) {
      then();
      return;
    }
    this.busy = true;
    this.body.walk(path, () => {
      this.body.face(face);
      then();
    });
  }

  /** Отпустить после поручения: постоит и снова пойдёт бродить. */
  release(): void {
    this.busy = false;
    this.waitUntil = this.scene.time.now + 1500;
  }

  update(dt: number): void {
    this.body.update(dt);
    if (this.busy || this.body.moving || this.scene.time.now < this.waitUntil) return;
    const target = this.pickCell();
    const path = this.room.findPath(this.body.cell, target);
    if (path && path.length > 1) {
      this.body.walk(path.slice(0, 1 + Math.min(path.length - 1, 7)), () => {
        this.waitUntil = this.scene.time.now + 2000 + Math.random() * 4000;
      });
    } else this.waitUntil = this.scene.time.now + 1000;
  }
}
