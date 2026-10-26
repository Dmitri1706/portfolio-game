import Phaser from 'phaser';
import { DEPTH } from '../config';
import { type Cell, gridToScreen, screenToCell } from '../iso';
import { IsoRoom } from '../world/IsoRoom';
import { Player } from '../world/Player';

/** Стартовая комната. На Этапе 1 — белый пол, стены, отдельно стоящая дверь и ходьба. */
export class LobbyScene extends Phaser.Scene {
  private room!: IsoRoom;
  private player!: Player;
  private marker!: Phaser.GameObjects.Sprite;

  constructor() {
    super('Lobby');
  }

  create(): void {
    this.room = new IsoRoom(this, {
      cols: 10,
      rows: 10,
      floor: 'floor_lobby',
      wallLeft: 'wall_lobby_left',
      wallRight: 'wall_lobby_right',
    });

    // Отдельно стоящая заколоченная дверь «Проекты» посреди пола (занимает 2 клетки)
    this.room.place('door_free_boarded', 5.5, 5, {
      blocks: [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
      ],
    });

    this.player = new Player(this, { x: 3, y: 7 });

    this.marker = this.add.sprite(0, 0, 'marker').setDepth(DEPTH.marker).setVisible(false);
    this.marker.play('marker:loop');

    const b = this.room.bounds();
    this.cameras.main.centerOn(Math.round(b.centerX), Math.round(b.centerY));

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTap(p.worldX, p.worldY));
  }

  private onTap(wx: number, wy: number): void {
    const clicked = screenToCell(wx, wy);
    const target = this.room.nearestWalkable(clicked, 2);
    if (!target) return;
    const path = this.room.findPath(this.player.cell, target);
    if (!path) return;
    this.showMarker(target);
    this.player.walk(path, () => this.marker.setVisible(false));
  }

  private showMarker(c: Cell): void {
    const p = gridToScreen(c.x, c.y);
    this.marker.setPosition(p.x, p.y).setVisible(true);
  }

  update(_time: number, delta: number): void {
    this.player.update(Math.min(delta, 50));
  }
}
