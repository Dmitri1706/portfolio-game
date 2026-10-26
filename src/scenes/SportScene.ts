import type { Cell } from '../iso';
import { IsoRoom } from '../world/IsoRoom';
import { RoomScene } from './RoomScene';

/** Комната «Спортмастер». Пока пустая — торговый зал, покупатели и мини-игра появятся на Этапе 4. */
export class SportScene extends RoomScene {
  constructor() {
    super('Sport');
  }

  protected build(): void {
    this.room = new IsoRoom(this, {
      cols: 10,
      rows: 10,
      floor: 'floor_sport',
      wallLeft: 'wall_sport_left',
      wallRight: 'wall_sport_right',
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
