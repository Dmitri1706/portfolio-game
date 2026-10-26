import Phaser from 'phaser';
import { BG_COLOR, DEPTH } from '../config';
import { type Cell, gridToScreen, screenToCell } from '../iso';
import { IsoRoom } from '../world/IsoRoom';
import { FALL_HEIGHT, Player, type Dir } from '../world/Player';
import { Interactable, type InteractableDef } from '../world/Interactable';
import { Bubble } from '../world/Bubble';
import { isUiOpen } from '../ui/modal';
import { sfx } from '../audio';
import { track } from '../analytics';

export type RoomId = 'lobby' | 'vhod' | 'sport';

export interface RoomData {
  /** Из какой комнаты пришли */
  from?: RoomId;
  /** Первый запуск после экрана загрузки */
  intro?: boolean;
}

const bg = Phaser.Display.Color.HexStringToColor(BG_COLOR);

/**
 * Общая основа всех комнат: пол и стены, персонаж, ходьба по клику, интерактивные предметы,
 * падение сверху при входе, облачка с текстом, переходы между комнатами.
 */
export abstract class RoomScene extends Phaser.Scene {
  protected room!: IsoRoom;
  protected player!: Player;
  /** Пока true — клики по полу и предметам игнорируются (идёт сценка) */
  protected busy = false;
  private marker!: Phaser.GameObjects.Sprite;
  private interactables: Interactable[] = [];
  private bubble?: Bubble;

  /** Построить комнату: this.room, предметы, двери. */
  protected abstract build(data: RoomData): void;
  /** Клетка, куда падает персонаж при входе. */
  protected abstract spawnCell(data: RoomData): Cell;

  create(data: RoomData = {}): void {
    this.busy = true;
    this.interactables = [];
    this.bubble = undefined;
    this.build(data);

    this.player = new Player(this, this.spawnCell(data));
    this.player.setAlpha(0);

    this.marker = this.add.sprite(0, 0, 'marker').setDepth(DEPTH.marker).setVisible(false);
    this.marker.play('marker:loop');

    const b = this.room.bounds();
    this.cameras.main.centerOn(Math.round(b.centerX), Math.round(b.centerY));

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.onFloorTap(p.worldX, p.worldY);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.interactables.forEach((i) => i.destroy());
      this.input.removeAllListeners();
    });

    this.onEnter(data);
  }

  /** Что происходит при входе в комнату. По умолчанию — падение сверху. */
  protected onEnter(_data: RoomData): void {
    this.cameras.main.fadeIn(300, bg.red, bg.green, bg.blue);
    this.fallIn().then(() => (this.busy = false));
  }

  /** Можно ли сейчас управлять персонажем */
  protected get canControl(): boolean {
    return !this.busy && !isUiOpen();
  }

  // ---------- Ходьба ----------

  private onFloorTap(wx: number, wy: number): void {
    if (!this.canControl) return;
    const target = this.room.nearestWalkable(screenToCell(wx, wy), 2);
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

  /** Дойти до клетки (по найденному пути) и повернуться. */
  protected walkTo(c: Cell, face?: Dir): Promise<boolean> {
    return new Promise((resolve) => {
      const path = this.room.findPath(this.player.cell, c);
      if (!path) return resolve(false);
      this.marker.setVisible(false);
      this.player.walk(path, () => {
        if (face) this.player.face(face);
        resolve(true);
      });
    });
  }

  // ---------- Предметы ----------

  protected addInteractable(def: InteractableDef): Interactable {
    const it = new Interactable(this, def, (i) => this.use(i));
    this.interactables.push(it);
    return it;
  }

  private async use(i: Interactable): Promise<void> {
    if (!this.canControl) return;
    // Если по дороге кликнуть в другое место, персонаж просто пойдёт туда — действие отменится
    const ok = await this.walkTo(i.def.approach, i.def.face);
    if (ok && this.canControl) {
      track('object_use', { room: this.scene.key, object: i.def.id });
      i.def.onUse();
    }
  }

  // ---------- Облачко над головой ----------

  protected say(text: string, duration?: number): void {
    this.bubble?.destroy();
    const h = this.player.headPoint;
    this.bubble = new Bubble(this, h.x, h.y, text, duration);
  }

  // ---------- Сценки ----------

  /** Падение сверху: растущая тень, приземление, облачко пыли, лёгкая тряска камеры. */
  protected fallIn(): Promise<void> {
    const p = this.player;
    p.dir = 'se';
    p.setAlpha(1);
    p.setLift(FALL_HEIGHT);
    p.play('fall');
    sfx('fall');
    return new Promise((resolve) => {
      this.tweens.add({
        targets: p,
        lift: 0,
        duration: 650,
        delay: 250,
        ease: 'Quad.In',
        onUpdate: () => p.setLift(p.lift),
        onComplete: async () => {
          sfx('land');
          this.cameras.main.shake(140, 0.006);
          const d = this.add.sprite(p.sprite.x, p.sprite.y + 1, 'dust').setOrigin(0.5, 1);
          d.setDepth(p.sprite.depth + 1);
          d.play('dust:loop');
          d.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => d.destroy());
          await p.playOnce('land');
          p.idle();
          resolve();
        },
      });
    });
  }

  /** Спотыкание о заколоченную дверь + облачко с текстом. */
  protected async stumble(text: string): Promise<void> {
    this.busy = true;
    const anim = this.player.facingFront ? 'stumble_front' : 'stumble_back';
    this.time.delayedCall(120, () => {
      sfx('bump');
      this.cameras.main.shake(90, 0.004);
    });
    await this.player.playOnce(anim);
    this.player.idle();
    this.say(text);
    this.busy = false;
  }

  /** Открыть дверь, зайти в проём и перейти в другую комнату. */
  protected async enterDoor(door: Phaser.GameObjects.Sprite, target: RoomId, it?: Interactable): Promise<void> {
    this.busy = true;
    track('door_enter', { from: this.scene.key, to: target });
    door.setFrame(1);
    it?.refresh();
    sfx('door');
    await new Promise((r) => this.time.delayedCall(220, r));
    const p = this.player;
    const dx = p.dir === 'nw' ? -0.9 : p.dir === 'se' ? 0.9 : 0;
    const dy = p.dir === 'ne' ? -0.9 : p.dir === 'sw' ? 0.9 : 0;
    p.play(p.facingFront ? 'walk_front' : 'walk_back');
    this.tweens.addCounter({
      from: 1,
      to: 0,
      delay: 200,
      duration: 300,
      onUpdate: (tw) => p.setAlpha(tw.getValue() ?? 0),
    });
    await p.slideTo(p.gx + dx, p.gy + dy, 500);
    this.cameras.main.fadeOut(300, bg.red, bg.green, bg.blue);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const scene = target === 'lobby' ? 'Lobby' : target === 'vhod' ? 'Vhod' : 'Sport';
      const from = this.scene.key.toLowerCase() as RoomId;
      this.scene.start(scene, { from } satisfies RoomData);
    });
  }

  update(_time: number, delta: number): void {
    this.player.update(Math.min(delta, 50));
  }
}
