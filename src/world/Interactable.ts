import Phaser from 'phaser';
import type { Cell } from '../iso';
import type { Dir } from './Player';
import { outlineTexture } from './outline';

type Obj = Phaser.GameObjects.Image;

export interface InteractableDef {
  /** Спрайты, по которым можно кликнуть (например, дверь и вывеска над ней) */
  sprites: Obj[];
  /** Клетка, куда подходит персонаж */
  approach: Cell;
  /** Куда он поворачивается, когда подошёл */
  face: Dir;
  /** Что происходит, когда персонаж подошёл */
  onUse: () => void;
  /** Название для аналитики */
  id: string;
  /** false — кликать можно по всему прямоугольнику спрайта, а не только по нарисованным пикселям */
  pixelPerfect?: boolean;
}

/** На устройствах без мышки (телефон, планшет) подсветки при наведении нет — вместо неё искорки. */
export const isTouchOnly = (): boolean => window.matchMedia('(hover: none)').matches;

/**
 * Интерактивный предмет: подсвечивается контуром при наведении, курсор — «рука».
 * На телефоне вокруг него время от времени вспыхивают искорки.
 */
export class Interactable {
  private outlines: Phaser.GameObjects.Image[] = [];
  private sparkTimer?: Phaser.Time.TimerEvent;
  enabled = true;

  constructor(
    private scene: Phaser.Scene,
    readonly def: InteractableDef,
    onClick: (i: Interactable) => void,
  ) {
    for (const s of def.sprites) {
      this.makeInteractive(s);
      s.on('pointerover', () => this.highlight(true));
      s.on('pointerout', () => this.highlight(false));
      s.on('pointerdown', () => onClick(this));
    }
    if (isTouchOnly()) {
      this.sparkTimer = scene.time.addEvent({
        delay: 1100 + Math.random() * 500,
        loop: true,
        callback: () => this.sparkle(),
      });
    }
  }

  private makeInteractive(s: Obj): void {
    if (this.def.pixelPerfect === false) s.setInteractive({ useHandCursor: true });
    else s.setInteractive({ pixelPerfect: true, alphaTolerance: 1, useHandCursor: true });
  }

  /** Включить/выключить предмет (выключенный не подсвечивается и не нажимается). */
  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    for (const s of this.def.sprites) {
      if (on) this.makeInteractive(s);
      else s.disableInteractive();
    }
    if (!on) this.highlight(false);
  }

  highlight(on: boolean): void {
    this.outlines.forEach((o) => o.destroy());
    this.outlines = [];
    if (!on || isTouchOnly()) return;
    for (const s of this.def.sprites) {
      // у крупных картинок из Blender (показаны уменьшенными) контур толще и мягче
      const pad = s.scaleX < 1 ? 6 : 1;
      const key = outlineTexture(this.scene, s.texture.key, s.frame.name, pad);
      const o = this.scene.add.image(s.x, s.y, key);
      o.setDisplayOrigin(s.displayOriginX + pad, s.displayOriginY + pad);
      o.setScale(s.scaleX, s.scaleY);
      o.setFlipX(s.flipX);
      o.setDepth(s.depth - 0.01);
      this.outlines.push(o);
    }
  }

  /** Обновить контур (например, если у двери сменился кадр). */
  refresh(): void {
    if (this.outlines.length) this.highlight(true);
  }

  private sparkle(): void {
    if (!this.enabled) return;
    const s = this.def.sprites[0];
    const b = s.getBounds();
    for (let tries = 0; tries < 12; tries++) {
      const x = Phaser.Math.Between(Math.floor(b.left), Math.floor(b.right) - 1);
      const y = Phaser.Math.Between(Math.floor(b.top), Math.floor(b.bottom) - 1);
      const lx = Math.floor((x - b.left) / s.scaleX);
      const ly = Math.floor((y - b.top) / s.scaleY);
      const alpha = this.scene.textures.getPixelAlpha(lx, ly, s.texture.key, s.frame.name);
      if (alpha && alpha > 0) {
        const sp = this.scene.add.image(x, y, 'sparkle3d').setDepth(900000).setScale(0).setAngle(Phaser.Math.Between(0, 45));
        this.scene.tweens.add({ targets: sp, scale: 1, angle: '+=45', duration: 300, yoyo: true, ease: 'Sine.Out', onComplete: () => sp.destroy() });
        return;
      }
    }
  }

  destroy(): void {
    this.sparkTimer?.remove();
    this.highlight(false);
    for (const s of this.def.sprites) if (s.active) s.removeAllListeners().disableInteractive();
  }
}
