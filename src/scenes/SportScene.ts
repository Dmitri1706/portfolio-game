import Phaser from 'phaser';
import { DEPTH } from '../config';
import { type Cell, gridToScreen } from '../iso';
import { IsoRoom } from '../world/IsoRoom';
import { Player } from '../world/Player';
import { Wanderer } from '../world/Wanderer';
import type { Interactable } from '../world/Interactable';
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

/** Уровни полок — те же, что в генераторе спрайтов (SHELF_LEVELS) */
const SHELF_LEVELS = [8, 24, 40];
/** Секции мини-игры на правой стене: цвет кроссовка → плитка стены */
const SECTIONS = [
  { color: 0, x: 2 }, // красный
  { color: 1, x: 4 }, // синий
  { color: 2, x: 6 }, // зелёный
  { color: 3, x: 8 }, // жёлтый
];
const DECOR_SHELVES = [1, 3, 5, 7, 9, 10];

interface Section {
  color: number;
  x: number;
  slots: (Phaser.GameObjects.Sprite | null)[];
  it: Interactable;
}

interface FloorSneaker {
  color: number;
  cell: Cell;
  sprite: Phaser.GameObjects.Sprite;
  it: Interactable;
}

/**
 * Комната «Спортмастер»: торговый зал. Диалог продажи с покупателем, доска «Лучший продавец»
 * и бесконечная мини-игра «Порядок в зале» (расставить кроссовки по полкам).
 */
export class SportScene extends RoomScene {
  private sections: Section[] = [];
  private floor: FloorSneaker[] = [];
  private wanderers: Wanderer[] = [];
  private carrying: number | null = null;
  private heldSneaker?: Phaser.GameObjects.Sprite;
  private route?: Phaser.GameObjects.Graphics;
  private routeFrom = '';
  private ghost?: Phaser.GameObjects.Sprite;
  private arrow?: Phaser.GameObjects.Image;
  private npc!: Player;
  private icon!: Phaser.GameObjects.Sprite;

  constructor() {
    super('Sport');
  }

  protected build(): void {
    this.sections = [];
    this.floor = [];
    this.wanderers = [];
    this.carrying = null;
    this.heldSneaker = this.route = this.ghost = this.arrow = undefined;

    this.room = new IsoRoom(this, {
      cols: 12,
      rows: 10,
      floor: 'floor_sport',
      wallLeft: 'wall_sport_left',
      wallRight: 'wall_sport_right',
    });
    const r = this.room;

    // ---- правая стена: стеллажи с обувью ----
    for (const x of DECOR_SHELVES) {
      r.placeOnWall('shelf_wall', 'right', x).setFrame(0);
      SHELF_LEVELS.forEach((_, lvl) => this.shelfSneaker(x, lvl, 4 + Math.floor(Math.random() * 4)));
    }
    for (const s of SECTIONS) {
      const shelf = r.placeOnWall('shelf_wall', 'right', s.x).setFrame(s.color + 1);
      const section: Section = { color: s.color, x: s.x, slots: [], it: null! };
      // в начале 2 из 3 мест заняты
      const empty = Math.floor(Math.random() * 3);
      section.slots = SHELF_LEVELS.map((_, lvl) => (lvl === empty ? null : this.shelfSneaker(s.x, lvl, s.color)));
      section.it = this.addInteractable({
        id: `shelf_${s.color}`,
        sprites: [shelf],
        pixelPerfect: false,
        approach: { x: s.x, y: 0 },
        face: 'ne',
        onUse: () => this.placeSneaker(section),
      });
      section.it.setEnabled(false);
      this.sections.push(section);
    }

    // ---- левая стена ----
    const board = r.placeOnWall('board_best', 'left', 0, 4);
    this.addInteractable({
      id: 'board',
      sprites: [board],
      approach: { x: 0, y: 2 },
      face: 'nw',
      onUse: () => {
        this.busy = true;
        explore(ROOM, 'board');
        this.time.delayedCall(200, () => openBestSellerWindow(() => (this.busy = false)));
      },
    });
    r.placeObject('fitting_room', 0, 5);
    const exit = r.placeOnWall('door_exit', 'left', 8);
    const sign = r.placeOnWall('sign_exit', 'left', 7, 3, 1);
    const exitIt = this.addInteractable({
      id: 'exit',
      sprites: [exit, sign],
      approach: { x: 0, y: 8 },
      face: 'nw',
      onUse: () => this.enterDoor(exit, 'lobby', exitIt),
    });

    // ---- зал ----
    r.placeObject('clothes_rack', 4, 5);
    r.placeObject('clothes_rack', 4, 7);
    r.placeObject('cash_counter', 9, 7);
    r.placeObject('ball_basket', 11, 9);
    r.placeObject('plant', 11, 0);

    // ---- покупатель для диалога ----
    const npcCell = { x: 6, y: 2 };
    this.npc = new Player(this, npcCell, 'npc_customer');
    this.npc.face('sw');
    r.setBlocked(npcCell, true);
    const head = this.npc.headPoint;
    this.icon = this.add.sprite(head.x, head.y - 4, 'icon_talk').setDepth(DEPTH.objects + 2000);
    this.icon.setFrame(isExplored(ROOM, 'sale') ? 1 : 0);
    this.tweens.add({ targets: this.icon, y: head.y - 7, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.addInteractable({
      id: 'customer',
      sprites: [this.npc.sprite, this.icon],
      approach: { x: 6, y: 3 },
      face: 'ne',
      onUse: () => this.talk(),
    });

    // ---- кроссовки на полу: по одному каждого цвета ----
    for (const s of this.sections) this.spawnFloorSneaker(s.color, false);

    // ---- фоновые покупатели ----
    const pick = () => this.randomFreeCell(1);
    ['shopper1', 'shopper2', 'shopper3'].forEach((key) => {
      this.wanderers.push(new Wanderer(this, r, key, pick(), pick));
    });
  }

  protected spawnCell(): Cell {
    return { x: 7, y: 4 };
  }

  protected progressText(): string {
    const sale = isExplored(ROOM, 'sale') ? 'закрыта ✓' : 'не закрыта';
    return `Продажа: ${sale}\nРасставлено пар: ${counter(PAIRS)}`;
  }

  // ================= Диалог продажи =================

  private talk(): void {
    this.busy = true;
    this.npc.face('sw');
    runSaleDialog((res) => {
      this.busy = false;
      track('dialog_end', { closed: res.closed, scenario: res.scenario, upsell: !!res.bonus });
      if (!res.closed) return;
      explore(ROOM, 'sale');
      this.icon.setFrame(1);
      this.refreshHud();
      this.checkRoomDone();
    });
  }

  // ================= Мини-игра «Порядок в зале» =================

  /** Кроссовок на полке: секция (плитка стены x), уровень, цвет. */
  private shelfSneaker(x: number, lvl: number, color: number): Phaser.GameObjects.Sprite {
    const p = this.room.wallPoint('right', x, 8, SHELF_LEVELS[lvl]);
    return this.add
      .sprite(p.x, p.y, 'sneaker_iso', color)
      .setDisplayOrigin(7, 10)
      .setDepth(DEPTH.wall + 70);
  }

  private randomFreeCell(minY = 2): Cell {
    const taken = new Set(this.floor.map((f) => `${f.cell.x},${f.cell.y}`));
    const pc = this.player?.cell;
    const cells = this.room
      .walkableCells()
      .filter((c) => c.y >= minY && c.x >= 1 && !taken.has(`${c.x},${c.y}`) && !(pc && pc.x === c.x && pc.y === c.y));
    return cells[Math.floor(Math.random() * cells.length)] ?? { x: 7, y: 4 };
  }

  private spawnFloorSneaker(color: number, animated = true): void {
    const cell = this.randomFreeCell();
    const p = gridToScreen(cell.x, cell.y);
    const sprite = this.add
      .sprite(p.x, p.y, 'sneaker_iso', color)
      .setDisplayOrigin(7, 10)
      .setDepth(DEPTH.objects + p.y - 1);
    const f: FloorSneaker = { color, cell, sprite, it: null! };
    f.it = this.addInteractable({
      id: 'sneaker',
      sprites: [sprite],
      pixelPerfect: false,
      approach: cell,
      face: this.player?.dir ?? 'se',
      onUse: () => this.pickSneaker(f),
    });
    this.floor.push(f);
    if (animated) {
      sprite.y -= 14;
      sprite.setAlpha(0);
      this.tweens.add({ targets: sprite, y: p.y, alpha: 1, duration: 350, ease: 'Bounce.Out' });
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
    this.heldSneaker = this.add.sprite(0, 0, 'held_sneaker', f.color);
    this.showTarget();
    track('sneaker_pick', { color: f.color });
  }

  /** Подсветить нужное место на полке и включить полки для клика. */
  private showTarget(): void {
    const s = this.sections[this.carrying!];
    const lvl = s.slots.findIndex((x) => x === null);
    const p = this.room.wallPoint('right', s.x, 8, SHELF_LEVELS[lvl]);
    this.ghost = this.add
      .sprite(p.x, p.y, 'sneaker_iso', s.color)
      .setDisplayOrigin(7, 10)
      .setDepth(DEPTH.wall + 71)
      .setAlpha(0.35);
    this.tweens.add({ targets: this.ghost, alpha: 0.9, duration: 400, yoyo: true, repeat: -1 });
    this.arrow = this.add.image(p.x + 1, p.y - 16, 'arrow_down').setDepth(DEPTH.wall + 72);
    this.tweens.add({ targets: this.arrow, y: p.y - 12, duration: 350, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
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
    const path = this.room.findPath(from, { x: s.x, y: 0 });
    this.route?.destroy();
    this.route = this.add.graphics().setDepth(DEPTH.marker + 1);
    if (!path) return;
    this.route.fillStyle(0xffb627);
    for (let i = 0; i < path.length - 1; i++) {
      const a = gridToScreen(path[i].x, path[i].y);
      const b = gridToScreen(path[i + 1].x, path[i + 1].y);
      for (const t of [0, 0.33, 0.66]) {
        if (i === 0 && t === 0) continue;
        this.route.fillRect(Math.round(a.x + (b.x - a.x) * t) - 1, Math.round(a.y + (b.y - a.y) * t), 2, 1);
      }
    }
    const end = gridToScreen(s.x, 0);
    this.route.fillRect(end.x - 2, end.y - 1, 4, 3);
  }

  private placeSneaker(s: Section): void {
    if (this.carrying === null) return;
    if (this.carrying !== s.color) {
      this.say('Не та полка — нужна подсвеченная.');
      return;
    }
    const lvl = s.slots.findIndex((x) => x === null);
    s.slots[lvl] = this.shelfSneaker(s.x, lvl, s.color);
    const p = this.room.wallPoint('right', s.x, 8, SHELF_LEVELS[lvl]);
    this.carrying = null;
    this.player.carrying = false;
    this.player.idle();
    this.heldSneaker?.destroy();
    this.heldSneaker = undefined;
    this.hideTarget();
    sfx('place');
    this.burst(p.x, p.y - 4);
    this.floatText(p.x, p.y - 10, '+1');
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
      this.tweens.add({ targets: sp, y: sp.y - 6, alpha: 0, duration: 250, onComplete: () => sp.destroy() });
      // если сейчас несём такой же кроссовок — подсветка остаётся на месте, свободных мест стало больше
      this.time.delayedCall(1200, () => this.spawnFloorSneaker(s.color));
    };
    const w = this.wanderers.find((x) => !x.busy);
    if (!w) return take();
    const spot = this.player.cell.x === s.x && this.player.cell.y <= 1 ? { x: s.x, y: 1 } : { x: s.x, y: 0 };
    w.goTo(spot, 'ne', () => {
      this.time.delayedCall(600, () => {
        take();
        this.time.delayedCall(500, () => w.release());
      });
    });
  }

  private burst(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sp = this.add.sprite(x, y, 'sparkle').setDepth(900000);
      sp.play('sparkle:loop');
      this.tweens.add({ targets: sp, x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 8, duration: 450 });
      sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
    }
  }

  private floatText(x: number, y: number, text: string): void {
    const t = this.add
      .text(x, y, text, { fontFamily: 'Tiny5', fontSize: '16px', color: '#ffc94a', stroke: '#231d33', strokeThickness: 2 })
      .setOrigin(0.5, 1)
      .setDepth(1_000_000);
    this.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900, ease: 'Quad.Out', onComplete: () => t.destroy() });
  }

  private checkRoomDone(): void {
    if (isExplored(ROOM, 'sale') && counter(PAIRS) >= PAIRS_FOR_ROOM && achieve('sport_done')) {
      this.time.delayedCall(900, () => showAchievement('Кейс Спортмастер пройден! 🏆'));
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
        .setPosition(p.sprite.x, p.sprite.y - 19)
        .setFlipX(p.sprite.flipX)
        .setDepth(p.sprite.depth + (p.facingFront ? 0.5 : -0.5));
      this.drawRoute();
    }
  }
}
