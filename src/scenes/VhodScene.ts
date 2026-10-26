import type { Cell } from '../iso';
import { IsoRoom } from '../world/IsoRoom';
import { RoomScene } from './RoomScene';

/** Комната «В ХОД». Пока пустая — интерьер и предметы появятся на Этапе 3. */
export class VhodScene extends RoomScene {
  constructor() {
    super('Vhod');
  }

  protected build(): void {
    this.room = new IsoRoom(this, {
      cols: 10,
      rows: 10,
      floor: 'floor_vhod',
      wallLeft: 'wall_vhod_left',
      wallRight: 'wall_vhod_right',
    });
    const exit = this.room.placeOnWall('door_exit', 'left', 5);
    const sign = this.room.placeOnWall('sign_exit', 'left', 4, 3, 1);
    const it = this.addInteractable({
      id: 'exit',
      sprites: [exit, sign],
      approach: { x: 0, y: 5 },
      face: 'nw',
      onUse: () => this.enterDoor(exit, 'lobby', it),
    });
  }

  protected spawnCell(): Cell {
    return { x: 3, y: 5 };
  }
}
