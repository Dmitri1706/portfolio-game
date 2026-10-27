import Phaser from 'phaser';
import { DEPTH, PLAYER_SPEED } from '../config';
import { type Cell, gridToScreen } from '../iso';
import { SPRITES } from '../assets/manifest';
import { CHARACTERS } from './characters';

/** 4 изометрических направления: юго-восток (вниз-вправо), юго-запад, северо-восток, северо-запад */
export type Dir = 'se' | 'sw' | 'ne' | 'nw';

/** Высота, с которой персонаж падает в комнату (игровые пиксели) */
export const FALL_HEIGHT = 520;

/** Персонажи из Blender: у каждой анимации свои кадры для всех 4 направлений */
const IS_3D = (key: string) => key in CHARACTERS;

export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  /** Положение на сетке (дробное, пока идёт между клетками) */
  gx: number;
  gy: number;
  /** Высота над полом (пока падает сверху) */
  lift = 0;
  dir: Dir = 'se';
  /** Несёт предмет перед собой (кроссовок): другие анимации ходьбы и стойки */
  carrying = false;
  private path: Cell[] = [];
  private onArrive?: () => void;
  private readonly is3d: boolean;

  constructor(
    private scene: Phaser.Scene,
    start: Cell,
    /** Ключ листа кадров: player, shopper1, npc_customer… */
    readonly key = 'player',
  ) {
    this.gx = start.x;
    this.gy = start.y;
    this.is3d = IS_3D(key);
    if (this.is3d) {
      const m = CHARACTERS[key];
      this.shadow = scene.add.image(0, 0, 'shadow3d');
      this.sprite = scene.add.sprite(0, 0, `${key}_idle`);
      this.sprite.setOrigin(m.anchorX / m.frameW, m.anchorY / m.frameH).setScale(1 / m.tex);
    } else {
      const s = SPRITES[key];
      this.shadow = scene.add.image(0, 0, 'shadow');
      this.sprite = scene.add.sprite(0, 0, key);
      this.sprite.setDisplayOrigin(s.width / 2, (s.anchorY ?? s.height) + 1);
    }
    this.idle();
    this.sync();
  }

  get cell(): Cell {
    return { x: Math.round(this.gx), y: Math.round(this.gy) };
  }

  get moving(): boolean {
    return this.path.length > 0;
  }

  /** Экранная точка над головой (для облачков) */
  get headPoint(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y - (this.is3d ? 128 : 40) };
  }

  get facingFront(): boolean {
    return this.dir === 'se' || this.dir === 'sw';
  }

  /** Идти по пути (список клеток, первая — текущая). */
  walk(path: Cell[], onArrive?: () => void): void {
    // Первая клетка — та, где персонаж уже стоит; её пропускаем, если путь не из одной клетки
    this.path = path.length > 1 ? path.slice(1) : path.slice();
    this.onArrive = onArrive;
    if (this.path.length === 0) {
      this.arrive();
      return;
    }
    this.play(this.walkAnim());
  }

  stop(): void {
    this.path = [];
    this.onArrive = undefined;
    this.idle();
  }

  face(dir: Dir): void {
    this.dir = dir;
    this.idle();
  }

  idle(): void {
    this.play(`${this.carrying ? 'hold' : 'idle'}_${this.facingFront ? 'front' : 'back'}`);
  }

  private walkAnim(): string {
    return `${this.carrying ? 'carry' : 'walk'}_${this.facingFront ? 'front' : 'back'}`;
  }

  /**
   * Включить анимацию по имени (например 'sit_front' или 'fall').
   * У 3D-персонажа «_front/_back» не нужны — берётся кадр для текущего направления взгляда.
   * Старые пиксельные персонажи зеркалятся по направлению взгляда.
   */
  play(anim: string): void {
    this.sprite.play(this.animKey(anim), true);
    if (!this.is3d) this.sprite.setFlipX(this.dir === 'sw' || this.dir === 'nw');
  }

  /** Проиграть анимацию один раз и дождаться её конца. */
  playOnce(anim: string): Promise<void> {
    return new Promise((resolve) => {
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => resolve());
      this.sprite.play(this.animKey(anim));
      if (!this.is3d) this.sprite.setFlipX(this.dir === 'sw' || this.dir === 'nw');
    });
  }

  private animKey(anim: string): string {
    if (!this.is3d) return `${this.key}:${anim}`;
    return `${this.key}:${anim.replace(/_(front|back)$/, '')}_${this.dir}`;
  }

  setLift(px: number): void {
    this.lift = px;
    this.sync();
  }

  /** Плавно переместить персонажа в точку сетки (без поиска пути) — например, внутрь дверного проёма. */
  slideTo(gx: number, gy: number, ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        gx,
        gy,
        duration: ms,
        onUpdate: () => this.sync(),
        onComplete: () => resolve(),
      });
    });
  }

  setShadowVisible(v: boolean): void {
    this.shadow.setVisible(v);
  }

  setAlpha(a: number): void {
    this.sprite.setAlpha(a);
    this.shadow.setAlpha(a);
  }

  update(dtMs: number): void {
    if (this.path.length === 0) return;
    let budget = (PLAYER_SPEED * dtMs) / 1000;
    while (budget > 0 && this.path.length > 0) {
      const next = this.path[0];
      const dx = next.x - this.gx;
      const dy = next.y - this.gy;
      const dist = Math.hypot(dx, dy);
      if (dist > 1e-4) this.turnTowards(dx, dy);
      if (dist <= budget) {
        this.gx = next.x;
        this.gy = next.y;
        budget -= dist;
        this.path.shift();
      } else {
        this.gx += (dx / dist) * budget;
        this.gy += (dy / dist) * budget;
        budget = 0;
      }
    }
    this.sync();
    if (this.path.length === 0) this.arrive();
  }

  private arrive(): void {
    this.idle();
    const cb = this.onArrive;
    this.onArrive = undefined;
    cb?.();
  }

  /** Поворот по направлению движения на сетке. */
  private turnTowards(dgx: number, dgy: number): void {
    const sx = dgx - dgy; // движение по экрану вправо/влево
    const sy = dgx + dgy; // движение по экрану вниз/вверх
    const eps = 1e-3;
    const front = sy > eps ? true : sy < -eps ? false : this.facingFront;
    const east = sx > eps ? true : sx < -eps ? false : this.dir === 'se' || this.dir === 'ne';
    const dir: Dir = front ? (east ? 'se' : 'sw') : east ? 'ne' : 'nw';
    if (dir !== this.dir) {
      this.dir = dir;
      this.play(this.walkAnim());
    }
  }

  private sync(): void {
    const p = gridToScreen(this.gx, this.gy);
    // пиксельные персонажи — по целым пикселям, 3D — плавно
    const x = this.is3d ? p.x : Math.round(p.x);
    const y = this.is3d ? p.y : Math.round(p.y);
    this.sprite.setPosition(x, y - this.lift);
    this.shadow.setPosition(x, y);
    // тень растёт по мере приближения к полу
    const k = Math.min(1, this.lift / FALL_HEIGHT);
    this.shadow.setScale(1 - 0.7 * k);
    this.shadow.setAlpha(this.sprite.alpha * (1 - 0.5 * k));
    this.sprite.setDepth(DEPTH.objects + p.y);
    this.shadow.setDepth(DEPTH.objects + p.y - 0.5);
  }
}
