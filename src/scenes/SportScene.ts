import { LABELS } from '../texts';
import Phaser from 'phaser';
import { DEPTH } from '../config';
import { type Cell, gridToScreen } from '../iso';
import SPORT from '../../rooms/sport.json';
import SPORT_LAYOUT from '../assets/rooms/sport.layout.json';
import { buildDiorama, type Layout, type RoomDef } from '../world/diorama';
import { Player } from '../world/Player';
import { Wanderer } from '../world/Wanderer';
import { doorMarker, type Interactable } from '../world/Interactable';
import { RoomScene } from './RoomScene';
import { sfx } from '../audio';
import { track } from '../analytics';
import { achieve, addCounter, counter, explore, isExplored } from '../state';
import { showAchievement } from '../ui/toast';
import { runSaleDialog } from '../ui/dialog';
import { openBestSellerWindow } from '../ui/caseWindows';

const ROOM = 'sport';
const PAIRS = 'sport_pairs';
/** Сколько пар нужно расставить, чтобы комната засчиталась */
const PAIRS_FOR_ROOM = 2;
/** Ачивка «Мерчендайзер месяца» */
const PAIRS_FOR_MERCH = 10;
/** Через сколько секунд после расстановки покупатель «покупает» кроссовок (от–до) */
const BUY_DELAY_MS: [number, number] = [20000, 30000];
/** Где в руках держится кроссовок: игровых пикселей над точкой, где стоят ноги */
const HELD_Y = 58;

type SportDef = RoomDef & {
  customer: Cell & { face: 'se' | 'sw' | 'ne' | 'nw'; approach: Cell };
  objects: (RoomDef['objects'][number] & { section?: number })[];
};
const DEF = SPORT as SportDef;
const LAYOUT = SPORT_LAYOUT as Layout & { points?: Record<string, number[][]> };

interface Section {
  color: number;
  /** клетка стеллажа у правой стены */
  x: number;
  /** места на полках (игровые пиксели), снизу вверх */
  points: { x: number; y: number }[];
  depth: number;
  slots: (Phaser.GameObjects.Image | null)[];
  it: Interactable;
}

interface FloorSneaker {
  color: number;
  cell: Cell;
  sprite: Phaser.GameObjects.Image;
  it: Interactable;
}

const sneakerKey = (color: number) => `held3d_sneaker${color}`;

/**
 * Комната «Спортмастер»: торговый зал-диорама (рендер Blender, описание — rooms/sport.json).
 * Диалог продажи с покупателем, доска «Лучший продавец» и бесконечная мини-игра «Порядок в зале».
 */
export class SportScene extends RoomScene {
  private sections: Section[] = [];
  private floor: FloorSneaker[] = [];
  private wanderers: Wanderer[] = [];
  private carrying: number | null = null;
  private heldSneaker?: Phaser.GameObjects.Image;
  private route?: Phaser.GameObjects.Graphics;
  private routeFrom = '';
  private ghost?: Phaser.GameObjects.Image;
  private arrow?: Phaser.GameObjects.Image;
  private npc!: Player;
  private icon!: Phaser.GameObjects.Image;

  constructor() {
    super('Sport');
  }

  protected build(): void {
    this.sections = [];
    this.floor = [];
    this.wanderers = [];
    this.carrying = null;
    this.heldSneaker = this.route = this.ghost = this.arrow = undefined;

    const d = buildDiorama(this, DEF, LAYOUT);
    this.room = d.room;

    // ---- стеллажи с обувью: секции мини-игры ----
    for (const o of DEF.objects) {
      if (o.section == null || !o.id) continue;
      const shelf = d.layers.get(o.id);
      const pts = LAYOUT.points?.[o.id] ?? [];
      if (!shelf || !pts.length) continue;
      const section: Section = {
        color: o.section,
        x: o.x,
        points: pts.map(([x, y]) => ({ x, y })),
        depth: shelf.depth,
        slots: [],
        it: null!,
      };
      // в начале 2 из 3 мест заняты
      const empty = Math.floor(Math.random() * section.points.length);
      section.slots = section.points.map((_, lvl) => (lvl === empty ? null : this.shelfSneaker(section, lvl)));
      section.it = this.addInteractable({
        id: `shelf_${o.section}`,
        sprites: [shelf],
        label: LABELS.shelf,
        markerAt: { x: section.points[0].x, y: Math.min(...section.points.map((p) => p.y)) - 40 },
        approach: { x: o.x, y: o.y + 1 },
        face: 'ne',
        onUse: () => this.placeSneaker(section),
      });
      section.it.setEnabled(false);
      this.sections.push(section);
    }
    this.sections.sort((a, b) => a.color - b.color);

    // ---- доска «Лучший продавец» ----
    const board = d.walls.get('board');
    if (board) {
      this.addInteractable({
        id: 'board',
        sprites: [board.sprite],
        label: LABELS.board,
        approach: board.approach,
        face: board.face,
        onUse: () => {
          this.busy = true;
          explore(ROOM, 'board');
          this.time.delayedCall(200, () => openBestSellerWindow(() => (this.busy = false)));
        },
      });
    }

    // ---- дверь выхода ----
    const exit = d.doors.get('exit');
    if (exit) {
      const exitIt = this.addInteractable({
        id: 'exit',
        sprites: [exit.sprite],
        label: LABELS.exit,
        markerAt: doorMarker(exit.sprite),
        approach: exit.approach,
        face: exit.face,
        onUse: () => this.enterDoor(exit, 'lobby', exitIt),
      });
    }

    // ---- покупатель для диалога ----
    const c = DEF.customer;
    this.npc = new Player(this, c, 'customer');
    this.npc.face(c.face);
    this.room.setBlocked(c, true);
    const head = this.npc.headPoint;
    this.icon = this.add
      .image(head.x, head.y - 6, isExplored(ROOM, 'sale') ? 'talk_dots' : 'talk_alert')
      .setDepth(DEPTH.objects + 5000);
    this.tweens.add({ targets: this.icon, y: head.y - 14, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.addInteractable({
      id: 'customer',
      sprites: [this.npc.sprite, this.icon],
      label: LABELS.customer,
      markerAt: { x: head.x, y: head.y - 34 },
      approach: c.approach,
      face: 'ne',
      onUse: () => this.talk(),
    });

    // ---- кроссовки на полу: по одному каждого цвета ----
    for (const s of this.sections) this.spawnFloorSneaker(s.color, false);

    // ---- фоновые покупатели ----
    const pick = () => this.randomFreeCell(1);
    ['shopper1', 'shopper2', 'shopper3'].forEach((key) => {
      this.wanderers.push(new Wanderer(this, this.room, key, pick(), pick));
    });
  }

  protected spawnCell(): Cell {
    return DEF.spawn;
  }

  protected progressText(): string {
    const sale = isExplored(ROOM, 'sale') ? 'закрыта ✓' : 'не закрыта';
    return `Продажа: ${sale}\nРасставлено пар: ${counter(PAIRS)}`;
  }

  // ================= Диалог продажи =================

  private talk(): void {
    this.busy = true;
    this.npc.face(DEF.customer.face);
    runSaleDialog((res) => {
      this.busy = false;
      track('dialog_end', { closed: res.closed, scenario: res.scenario, upsell: !!res.bonus });
      if (!res.closed) return;
      explore(ROOM, 'sale');
      this.icon.setTexture('talk_dots');
      this.refreshHud();
      this.checkRoomDone();
    });
  }

  // ================= Мини-игра «Порядок в зале» =================

  /** Кроссовок на полке секции (уровень lvl снизу вверх). */
  private shelfSneaker(s: Section, lvl: number): Phaser.GameObjects.Image {
    const p = s.points[lvl];
    return this.add.image(p.x, p.y, sneakerKey(s.color)).setScale(0.5).setDepth(s.depth + 0.5);
  }

  private randomFreeCell(minY = 2): Cell {
    const taken = new Set(this.floor.map((f) => `${f.cell.x},${f.cell.y}`));
    const pc = this.player?.cell;
    const cells = this.room
      .walkableCells()
      .filter((c) => c.y >= minY && c.x >= 1 && !taken.has(`${c.x},${c.y}`) && !(pc && pc.x === c.x && pc.y === c.y));
    return cells[Math.floor(Math.random() * cells.length)] ?? DEF.spawn;
  }

  private spawnFloorSneaker(color: number, animated = true): void {
    const cell = this.randomFreeCell();
    const p = gridToScreen(cell.x, cell.y);
    const sprite = this.add
      .image(p.x, p.y, sneakerKey(color))
      .setScale(0.5)
      .setAngle(Phaser.Math.Between(-12, 12))
      .setDepth(DEPTH.objects + p.y - 1);
    const f: FloorSneaker = { color, cell, sprite, it: null! };
    f.it = this.addInteractable({
      id: 'sneaker',
      sprites: [sprite],
      label: LABELS.sneaker,
      markerAt: { x: p.x, y: p.y - 12 },
      pixelPerfect: false,
      approach: cell,
      face: this.player?.dir ?? 'se',
      onUse: () => this.pickSneaker(f),
    });
    this.floor.push(f);
    if (animated) {
      sprite.y -= 30;
      sprite.setAlpha(0);
      this.tweens.add({ targets: sprite, y: p.y, alpha: 1, duration: 420, ease: 'Bounce.Out' });
    }
  }

  private pickSneaker(f: FloorSneaker): void {
    sfx('pickup');
    this.removeInteractable(f.it);
    f.sprite.destroy();
    this.floor = this.floor.filter((x) => x !== f);
    this.carrying = f.color;
    this.player.carrying = true;
    this.player.idle();
    this.heldSneaker = this.add.image(0, 0, sneakerKey(f.color)).setScale(0.5);
    this.showTarget();
    track('sneaker_pick', { color: f.color });
  }

  /** Подсветить нужное место на полке и включить полки для клика. */
  private showTarget(): void {
    const s = this.sections[this.carrying!];
    const lvl = s.slots.findIndex((x) => x === null);
    const p = s.points[lvl];
    this.ghost = this.add
      .image(p.x, p.y, sneakerKey(s.color))
      .setScale(0.5)
      .setDepth(s.depth + 0.6)
      .setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.ghost, alpha: 0.95, duration: 400, yoyo: true, repeat: -1 });
    this.arrow = this.add.image(p.x, p.y - 34, 'arrow3d').setDepth(DEPTH.objects + 5000);
    this.tweens.add({ targets: this.arrow, y: p.y - 26, duration: 350, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.sections.forEach((sec) => sec.it.setEnabled(true));
    this.routeFrom = '';
  }

  private hideTarget(): void {
    this.ghost?.destroy();
    this.arrow?.destroy();
    this.route?.destroy();
    this.ghost = this.arrow = this.route = undefined;
    this.sections.forEach((sec) => sec.it.setEnabled(false));
  }

  /** Пунктирный маршрут от персонажа до нужной полки (обновляется, пока он идёт). */
  private drawRoute(): void {
    if (this.carrying === null) return;
    const from = this.player.cell;
    const key = `${from.x},${from.y}`;
    if (key === this.routeFrom) return;
    this.routeFrom = key;
    const s = this.sections[this.carrying];
    const target = { x: s.x, y: 1 };
    const path = this.room.findPath(from, target);
    this.route?.destroy();
    this.route = this.add.graphics().setDepth(DEPTH.marker + 1);
    if (!path) return;
    this.route.fillStyle(0xffb627, 0.95);
    for (let i = 0; i < path.length - 1; i++) {
      const a = gridToScreen(path[i].x, path[i].y);
      const b = gridToScreen(path[i + 1].x, path[i + 1].y);
      for (const t of [0, 0.33, 0.66]) {
        if (i === 0 && t === 0) continue;
        this.route.fillEllipse(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 8, 4);
      }
    }
    const end = gridToScreen(target.x, target.y);
    this.route.lineStyle(3, 0xffb627, 1).strokeEllipse(end.x, end.y, 40, 20);
  }

  private placeSneaker(s: Section): void {
    if (this.carrying === null) return;
    if (this.carrying !== s.color) {
      this.say('Не та полка — нужна подсвеченная.');
      return;
    }
    const lvl = s.slots.findIndex((x) => x === null);
    s.slots[lvl] = this.shelfSneaker(s, lvl);
    const p = s.points[lvl];
    this.carrying = null;
    this.player.carrying = false;
    this.player.idle();
    this.heldSneaker?.destroy();
    this.heldSneaker = undefined;
    this.hideTarget();
    sfx('place');
    this.burst(p.x, p.y - 6);
    this.floatText(p.x, p.y - 20, '+1');
    const n = addCounter(PAIRS);
    this.refreshHud();
    track('sneaker_place', { color: s.color, total: n });
    if (n >= PAIRS_FOR_MERCH && achieve('merchandiser')) {
      this.time.delayedCall(400, () => showAchievement('Мерчендайзер месяца 🏅'));
    }
    this.checkRoomDone();
    this.time.delayedCall(Phaser.Math.Between(...BUY_DELAY_MS), () => this.buySneaker());
  }

  /** Фоновый покупатель «покупает» кроссовок с полки — на полу появляется новый. */
  private buySneaker(): void {
    const withShoes = this.sections.filter((s) => s.slots.some(Boolean));
    if (!withShoes.length) return;
    const s = withShoes[Math.floor(Math.random() * withShoes.length)];
    const take = () => {
      const lvl = s.slots.map((x, i) => (x ? i : -1)).filter((i) => i >= 0).pop()!;
      const sp = s.slots[lvl]!;
      s.slots[lvl] = null;
      this.tweens.add({ targets: sp, y: sp.y - 12, alpha: 0, duration: 250, onComplete: () => sp.destroy() });
      // если сейчас несём такой же кроссовок — подсветка остаётся на месте, свободных мест стало больше
      this.time.delayedCall(1200, () => this.spawnFloorSneaker(s.color));
    };
    const w = this.wanderers.find((x) => !x.busy);
    if (!w) return take();
    const pc = this.player.cell;
    const spot = pc.x === s.x && pc.y === 1 ? { x: s.x, y: 2 } : { x: s.x, y: 1 };
    w.goTo(spot, 'ne', () => {
      this.time.delayedCall(600, () => {
        take();
        this.time.delayedCall(500, () => w.release());
      });
    });
  }

  private burst(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sp = this.add.image(x, y, 'sparkle3d').setDepth(900000).setScale(0.3);
      this.tweens.add({
        targets: sp,
        x: x + Math.cos(a) * 30,
        y: y + Math.sin(a) * 18,
        scale: 0.9,
        alpha: 0,
        angle: 90,
        duration: 520,
        ease: 'Quad.Out',
        onComplete: () => sp.destroy(),
      });
    }
  }

  private floatText(x: number, y: number, text: string): void {
    const t = this.add
      .text(x, y, text, {
        fontFamily: '"PT Sans", Arial, sans-serif',
        fontStyle: 'bold',
        fontSize: '26px',
        color: '#ffc94a',
        stroke: '#231d33',
        strokeThickness: 5,
        resolution: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(1_000_000);
    this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 1000, ease: 'Quad.Out', onComplete: () => t.destroy() });
  }

  private checkRoomDone(): void {
    if (isExplored(ROOM, 'sale') && counter(PAIRS) >= PAIRS_FOR_ROOM && achieve('sport_done')) {
      this.time.delayedCall(900, () => showAchievement('Все кейсы Спортмастера изучены ✓'));
    }
  }

  /** С кроссовком в руках можно только идти к полкам. */
  protected canUse(i: Interactable): boolean {
    if (this.carrying !== null && !i.def.id.startsWith('shelf_')) {
      this.say('Сначала поставлю кроссовок на место');
      return false;
    }
    return true;
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const dt = Math.min(delta, 50);
    this.wanderers.forEach((w) => w.update(dt));
    if (this.heldSneaker) {
      const p = this.player;
      this.heldSneaker
        .setPosition(p.sprite.x, p.sprite.y - HELD_Y)
        .setDepth(p.sprite.depth + (p.facingFront ? 0.5 : -0.5));
      this.drawRoute();
    }
  }
}
