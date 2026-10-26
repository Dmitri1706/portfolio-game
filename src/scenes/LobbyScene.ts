import type { Cell } from '../iso';
import { IsoRoom } from '../world/IsoRoom';
import { RoomScene, type RoomData } from './RoomScene';
import { rulesSeen, showRules } from '../ui/rules';
import { TEXTS } from '../texts';

/**
 * Лобби: белая минималистичная комната, табличка-приветствие и 4 двери.
 * Левая стена — «В ХОД». Правая — заколоченная (ближе к углу) и «Спортмастер».
 * Посреди пола — отдельно стоящая заколоченная дверь «Проекты».
 */
export class LobbyScene extends RoomScene {
  constructor() {
    super('Lobby');
  }

  protected build(): void {
    this.room = new IsoRoom(this, {
      cols: 10,
      rows: 10,
      floor: 'floor_lobby',
      wallLeft: 'wall_lobby_left',
      wallRight: 'wall_lobby_right',
    });
    const r = this.room;

    r.placeOnWall('sign_hello', 'left', 0, 6);

    // «В ХОД» — левая стена
    const vhod = r.placeOnWall('door_vhod', 'left', 7);
    const vhodSign = r.placeOnWall('sign_vhod', 'left', 6, 3, 1);
    const vhodIt = this.addInteractable({
      id: 'door_vhod',
      sprites: [vhod, vhodSign],
      approach: { x: 0, y: 7 },
      face: 'nw',
      onUse: () => this.enterDoor(vhod, 'vhod', vhodIt),
    });

    // Заколоченная дверь «Какая компания следующая?» — правая стена, ближе к углу
    const next = r.placeOnWall('door_boarded', 'right', 2);
    const nextPlaque = r.placeOnWall('plaque_next', 'right', 0, 5, 1);
    this.addInteractable({
      id: 'door_next',
      sprites: [next, nextPlaque],
      approach: { x: 2, y: 0 },
      face: 'ne',
      onUse: () => this.stumble(TEXTS.boardedNext),
    });

    // «Спортмастер» — правая стена
    const sport = r.placeOnWall('door_sport', 'right', 7);
    const sportSign = r.placeOnWall('sign_sport', 'right', 5, 5, 1);
    const sportIt = this.addInteractable({
      id: 'door_sport',
      sprites: [sport, sportSign],
      approach: { x: 7, y: 0 },
      face: 'ne',
      onUse: () => this.enterDoor(sport, 'sport', sportIt),
    });

    // «Проекты» — отдельно стоящая дверь посреди пола (2 клетки)
    const projects = r.place('door_free_boarded', 5.5, 5, {
      blocks: [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
      ],
    });
    this.addInteractable({
      id: 'door_projects',
      sprites: [projects],
      approach: { x: 5, y: 6 },
      face: 'ne',
      onUse: () => this.stumble(TEXTS.boardedProjects),
    });
  }

  protected spawnCell(data: RoomData): Cell {
    if (data.from === 'vhod') return { x: 1, y: 7 };
    if (data.from === 'sport') return { x: 7, y: 1 };
    return { x: 3, y: 4 };
  }

  protected onEnter(data: RoomData): void {
    if (!data.intro) {
      super.onEnter(data);
      return;
    }
    // Сразу после экрана загрузки: падение, затем (в первый раз) правила
    this.fallIn().then(() => {
      if (rulesSeen()) this.busy = false;
      else this.time.delayedCall(250, () => showRules(() => (this.busy = false)));
    });
  }
}
