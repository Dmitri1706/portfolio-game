import type { Cell } from '../iso';
import LOBBY from '../../rooms/lobby.json';
import LOBBY_LAYOUT from '../assets/rooms/lobby.layout.json';
import { buildDiorama, type DioramaDoor, type Layout, type RoomDef } from '../world/diorama';
import { doorMarker, type Interactable } from '../world/Interactable';
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

/**
 * Лобби: уютный холл-диорама (рендер Blender, описание — rooms/lobby.json).
 * Левая стена — «В ХОД». Правая — заколоченная «Какая компания следующая?» (ближе к углу) и «Спортмастер».
 * Посреди пола — отдельно стоящая дверь «Проекты»: за ней лестница в подвал.
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
          if (target) this.enterDoor(dd, target, it);
          else this.stumble(text ?? '');
        },
      });
    };
    door('door_vhod', 'vhod');
    door('door_sport', 'sport');
    door('door_next', null, TEXTS.boardedNext);

    // «Проекты» — отдельно стоящая дверь посреди пола: за ней лестница в подвал
    const projects = d.doors.get('door_projects');
    if (projects) {
      const it = this.addInteractable({
        id: 'door_projects',
        sprites: [projects.sprite],
        label: LABELS.door,
        markerAt: doorMarker(projects.sprite),
        approach: projects.approach,
        face: 'ne',
        onUse: () => this.descend(projects, it),
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

  /**
   * Спуск в подвал: дверь открывается, персонаж шагает в проём и уходит вниз по ступеням —
   * виден только внутри проёма (маска), поэтому кажется, что он спускается под пол.
   */
  private async descend(door: DioramaDoor, it: Interactable): Promise<void> {
    this.busy = true;
    track('door_enter', { from: 'lobby', to: 'projects' });
    door.open();
    it.refresh();
    sfx('door');
    await new Promise((r) => this.time.delayedCall(250, r));
    const def = (LOBBY as RoomDef).objects.find((o) => o.id === 'door_projects');
    const cx = def ? def.x + ((def.w ?? 1) - 1) / 2 : this.player.gx;
    const gy = def?.y ?? this.player.gy - 1;
    const p = this.player;
    p.dir = 'ne';
    p.play('walk_back');
    await p.slideTo(cx, gy + 0.05, 380);
    // проём двери на экране: плоскость y = gy, ширина 1.25 м, высота 2.3 м
    const PX_PER_M = 58.79;
    const pt = (gx: number, z: number) => ({ x: 48 * (gx - gy), y: 24 * (gx + gy) - PX_PER_M * z });
    const a = pt(cx - 0.6, 0);
    const b = pt(cx + 0.6, 0);
    const c = pt(cx + 0.6, 2.3);
    const e = pt(cx - 0.6, 2.3);
    const shape = this.make.graphics({}, false);
    shape.fillStyle(0xffffff).fillPoints([a, b, c, e], true);
    p.sprite.setMask(shape.createGeometryMask());
    p.setShadowVisible(false);
    p.depthBias = 40; // поверх тёмного проёма двери
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1100,
      onUpdate: (tw) => {
        const u = tw.getValue() ?? 0;
        p.gy = gy + 0.05 - 0.45 * u;
        p.setLift(-95 * u);
        p.sprite.setAlpha(1 - 0.6 * u);
      },
      onComplete: () => this.goTo('projects'),
    });
  }

  protected spawnCell(data: RoomData): Cell {
    if (data.from === 'vhod') return { x: 1, y: 10 };
    if (data.from === 'sport') return { x: 10, y: 1 };
    if (data.from === 'projects') return { x: 10, y: 9 };
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
