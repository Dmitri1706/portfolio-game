import type { Cell } from '../iso';
import LOBBY from '../../rooms/lobby.json';
import LOBBY_LAYOUT from '../assets/rooms/lobby.layout.json';
import { buildDiorama, type DioramaDoor, type Layout, type RoomDef } from '../world/diorama';
import { doorMarker, type Interactable } from '../world/Interactable';
import { constructionFx } from '../world/construction';
import { RoomScene, type RoomData, type RoomId } from './RoomScene';
import { rulesSeen, showRules } from '../ui/rules';
import { introSeen, showIntro } from '../ui/intro';
import { LABELS, TEXTS } from '../texts';
import { hasAchievement } from '../state';
import { load, save } from '../storage';
import { track } from '../analytics';
import { sfx } from '../audio';
import { el, openModal } from '../ui/modal';
import { openContacts } from '../ui/contacts';
import { openResumeWindow } from '../ui/caseWindows';
import { SETTINGS, asset } from '../content';

/** Комнаты, уже переведённые в новую графику. Двери в остальные пока только открываются и закрываются. */
const READY_ROOMS = new Set<RoomId>(['vhod', 'sport']);

/**
 * Лобби: уютный холл-диорама (рендер Blender, описание — rooms/lobby.json).
 * Левая стена — «В ХОД». Правая — заколоченная «Какая компания следующая?» (ближе к углу) и «Спортмастер».
 * Посреди пола — отдельно стоящая заколоченная дверь «Проекты».
 */
export class LobbyScene extends RoomScene {
  constructor() {
    super('Lobby');
  }

  protected build(): void {
    const d = buildDiorama(this, LOBBY as RoomDef, LOBBY_LAYOUT as Layout);
    this.room = d.room;

    const door = (id: string, target: RoomId | null, text?: string) => {
      const dd = d.doors.get(id);
      if (!dd) return;
      const it = this.addInteractable({
        id,
        sprites: [dd.sprite],
        approach: dd.approach,
        face: dd.face,
        ...(target ? { label: LABELS.door, markerAt: doorMarker(dd.sprite) } : {}),
        onUse: () => {
          if (target && READY_ROOMS.has(target)) this.enterDoor(dd, target, it);
          else if (target) this.peekDoor(dd, it);
          else this.stumble(text ?? '');
        },
      });
    };
    door('door_vhod', 'vhod');
    door('door_sport', 'sport');
    door('door_next', null, TEXTS.boardedNext);

    // «Проекты» — отдельно стоящая дверь посреди пола
    const projects = d.layers.get('door_projects');
    const def = (LOBBY as RoomDef).objects.find((o) => o.id === 'door_projects');
    if (projects) constructionFx(this, projects); // «тут кипит работа»: обводка и искры сварки
    if (projects && def?.approach) {
      this.addInteractable({
        id: 'door_projects',
        sprites: [projects],
        approach: def.approach,
        face: 'ne',
        onUse: () => this.stumble(TEXTS.boardedProjects),
      });
    }

    // Папка с резюме на подставке: персонаж берёт её в руки
    const folder = d.layers.get('item_folder');
    const folderDef = (LOBBY as RoomDef).objects.find((o) => o.id === 'item_folder');
    if (folder && folderDef?.interact) {
      const ia = folderDef.interact;
      const stand = d.layers.get('resume_stand');
      this.addInteractable({
        id: 'resume',
        sprites: stand ? [folder, stand] : [folder],
        label: LABELS.resume,
        approach: ia.approach,
        face: ia.face,
        onUse: () => {
          this.pickUp(folder, 'held3d_folder');
          this.time.delayedCall(280, () => openResumeWindow(() => this.putDown(folder, ia.face)));
        },
      });
    }
  }

  /** Комната ещё переезжает в новую графику: дверь открывается, персонаж заглядывает и говорит об этом. */
  private peekDoor(door: DioramaDoor, it: Interactable): void {
    this.busy = true;
    door.open();
    it.refresh();
    sfx('door');
    this.time.delayedCall(500, () => {
      this.say('Комната переезжает в новую графику — скоро откроется!');
      this.time.delayedCall(1400, () => {
        door.close();
        it.refresh();
        this.busy = false;
      });
    });
  }

  protected spawnCell(data: RoomData): Cell {
    if (data.from === 'vhod') return { x: 1, y: 10 };
    if (data.from === 'sport') return { x: 10, y: 1 };
    return (LOBBY as RoomDef).spawn;
  }

  protected onEnter(data: RoomData): void {
    if (!data.intro) {
      this.cameras.main.fadeIn(300, 0x2b, 0x26, 0x40);
      this.fallIn().then(() => {
        this.busy = false;
        this.maybeShowFinal();
      });
      return;
    }
    // Сразу после экрана загрузки: падение, затем (в первый раз) вступление и «Как пользоваться»
    this.fallIn().then(() => {
      const rules = () => {
        if (rulesSeen()) {
          this.busy = false;
          this.maybeShowFinal();
        } else this.time.delayedCall(200, () => showRules(() => (this.busy = false)));
      };
      if (introSeen()) rules();
      else this.time.delayedCall(250, () => showIntro(rules));
    });
  }

  /** Обе комнаты пройдены — один раз показываем финальное окно. */
  private maybeShowFinal(): void {
    if (!hasAchievement('vhod_done') || !hasAchievement('sport_done') || load('finalShown', false)) return;
    save('finalShown', true);
    track('final_window');
    this.time.delayedCall(400, () => {
      const body = el('div', 'final');
      body.appendChild(el('div', 'final__rate', 'Конверсия визита: 100% ✓'));
      body.appendChild(el('p', '', 'Вы прошли обе комнаты. Если хотите обсудить работу — буду рад знакомству!'));
      sfx('achievement');
      openModal({
        title: 'Спасибо, что заглянули!',
        content: body,
        backLabel: 'Продолжить осмотр',
        buttons: [
          {
            label: 'Связаться',
            onClick: (close) => {
              close();
              openContacts();
            },
          },
          { label: 'Скачать резюме (PDF) ⬇', ghost: true, href: asset(SETTINGS.resume.pdf), download: true },
        ],
      });
    });
  }
}
