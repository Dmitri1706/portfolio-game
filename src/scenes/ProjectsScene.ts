import Phaser from 'phaser';
import type { Cell } from '../iso';
import PROJECTS_ROOM from '../../rooms/projects.json';
import PROJECTS_LAYOUT from '../assets/rooms/projects.layout.json';
import { buildDiorama, type Layout, type RoomDef } from '../world/diorama';
import { RoomScene, type RoomData } from './RoomScene';
import { LABELS } from '../texts';
import { PROJECTS, type Project } from '../content';
import { achieve, explore, isExplored } from '../state';
import { showAchievement } from '../ui/toast';
import { openProjectWindow } from '../ui/caseWindows';
import { sfx } from '../audio';
import { track } from '../analytics';

const ROOM = 'projects';
const DEF = PROJECTS_ROOM as RoomDef;

/** Игровых пикселей на метр высоты (как в Blender: PPU · sin 60°) */
const PX_PER_M = 58.79;
/** Лестница: верх у левой стены (x = −0.5) на высоте 1.5 м, низ — у клетки x = 2.5 */
const STAIR_TOP = -0.5;
const STAIR_BOTTOM = 2.5;
const STAIR_RISE = 1.5;
/** Высота ступени под точкой gx (в игровых пикселях) */
const stairLift = (gx: number) =>
  Math.max(0, Math.min(1, (STAIR_BOTTOM - gx) / (STAIR_BOTTOM - STAIR_TOP))) * STAIR_RISE * PX_PER_M;

/**
 * Подвал «Проекты»: длинный коридор со шторками (рендер Blender, описание — rooms/projects.json).
 * Персонаж спускается по лестнице; за каждой шторкой — проект: он заглядывает туда, и открывается окно.
 * Дальний конец коридора уходит в темноту — там появятся новые проекты.
 */
export class ProjectsScene extends RoomScene {
  constructor() {
    super('Projects');
  }

  protected build(): void {
    const d = buildDiorama(this, DEF, PROJECTS_LAYOUT as Layout);
    this.room = d.room;

    // шторки: id на стене — curtain_<id проекта>
    for (const p of PROJECTS) {
      const w = d.walls.get(`curtain_${p.id}`);
      if (!w) continue;
      this.addInteractable({
        id: p.id,
        sprites: [w.sprite],
        label: p.label,
        approach: w.approach,
        face: w.face,
        onUse: () => this.peekIn(w.sprite, w.approach, w.at, p),
      });
    }

    // лестница наверх — выход в холл
    const stairs = d.layers.get('stairs');
    if (stairs) {
      this.addInteractable({
        id: 'exit',
        sprites: [stairs],
        label: LABELS.exit,
        markerAt: { x: stairs.getBounds().centerX, y: stairs.getBounds().top + 30 },
        approach: { x: 3, y: 1 },
        face: 'nw',
        onUse: () => this.climbUp(),
      });
    }
  }

  protected spawnCell(): Cell {
    return DEF.spawn;
  }

  protected progressText(): string {
    return `Изучено: ${this.explored()}/${PROJECTS.length}`;
  }

  private explored(): number {
    return PROJECTS.filter((p) => isExplored(ROOM, p.id)).length;
  }

  /** Вход — спуск по лестнице из проёма в стене. */
  protected onEnter(data: RoomData): void {
    this.cameras.main.fadeIn(400, 1, 1, 3);
    const p = this.player;
    p.gx = STAIR_TOP + 0.1;
    p.gy = 1;
    p.dir = 'se';
    p.setShadowVisible(false);
    p.setLift(stairLift(p.gx));
    p.play('walk_front');
    this.tweens.addCounter({ from: 0, to: 1, duration: 450, onUpdate: (tw) => p.setAlpha(tw.getValue() ?? 1) });
    this.walkStairs(DEF.spawn.x, 1500).then(() => {
      p.setShadowVisible(true);
      p.idle();
      this.busy = false;
      // пришли по ссылке «Смотреть проект» — сразу идём к нужной шторке
      const it = data.openProject ? this.interactableById(data.openProject) : undefined;
      if (it) this.use(it);
    });
  }

  /** Пройти по лестнице до точки gx (высота меняется по ступеням). */
  private walkStairs(toGx: number, ms: number): Promise<void> {
    const p = this.player;
    const from = p.gx;
    return new Promise((resolve) => {
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: ms,
        onUpdate: (tw) => {
          p.gx = from + (toGx - from) * (tw.getValue() ?? 0);
          p.setLift(stairLift(p.gx));
        },
        onComplete: () => resolve(),
      });
    });
  }

  /** Выход: подняться по лестнице и уйти в проём. */
  private async climbUp(): Promise<void> {
    this.busy = true;
    track('door_enter', { from: ROOM, to: 'lobby' });
    const p = this.player;
    p.dir = 'nw';
    p.setShadowVisible(false);
    p.play('walk_back');
    this.tweens.addCounter({ from: 1, to: 0, delay: 1000, duration: 400, onUpdate: (tw) => p.setAlpha(tw.getValue() ?? 0) });
    await this.walkStairs(STAIR_TOP + 0.1, 1400);
    this.goTo('lobby');
  }

  /** Заглянуть за шторку: персонаж наклоняется к ней, голова скрывается за тканью, открывается окно проекта. */
  private async peekIn(curtain: Phaser.GameObjects.Image, spot: Cell, at: number, project: Project): Promise<void> {
    this.busy = true;
    const p = this.player;
    p.face('ne');
    await p.slideTo(at, spot.y - 0.32, 260);
    sfx('pickup');
    // копия шторки поверх персонажа — только выше плеч: голова «уходит» за ткань
    const k = curtain.scaleX;
    const shoulders = p.sprite.y - 96;
    const cover = this.add
      .image(curtain.x, curtain.y, curtain.texture.key)
      .setOrigin(0, 0)
      .setScale(k)
      .setDepth(p.sprite.depth + 1);
    cover.setCrop(0, 0, cover.frame.width, Math.max(0, (shoulders - curtain.y) / k));
    // ткань колышется
    this.tweens.add({ targets: [cover, curtain], x: curtain.x + 1.2, duration: 120, yoyo: true, repeat: 2, ease: 'Sine.InOut' });
    this.time.delayedCall(380, () => {
      track('project_open', { id: project.id });
      openProjectWindow(project, async () => {
        cover.destroy();
        await p.slideTo(spot.x, spot.y, 260);
        p.idle();
        this.busy = false;
      });
      explore(ROOM, project.id);
      this.refreshHud();
      if (this.explored() >= PROJECTS.length && achieve('projects_done')) {
        this.time.delayedCall(500, () => showAchievement('Все проекты изучены ✓'));
      }
    });
  }
}
