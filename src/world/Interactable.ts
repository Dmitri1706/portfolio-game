import Phaser from 'phaser';
import type { Cell } from '../iso';
import type { Dir } from './Player';
import { outlineTexture } from './outline';

type Obj = Phaser.GameObjects.Sprite;

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

  constructor(
    private scene: Phaser.Scene,
    readonly def: InteractableDef,
    onClick: (i: Interactable) => void,
  ) {
    for (const s of def.sprites) {
      s.setInteractive({ pixelPerfect: true, alphaTolerance: 1, useHandCursor: true });
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

  highlight(on: boolean): void {
    this.outlines.forEach((o) => o.destroy());
    this.outlines = [];
    if (!on || isTouchOnly()) return;
    for (const s of this.def.sprites) {
      const key = outlineTexture(this.scene, s.texture.key, s.frame.name);
      const o = this.scene.add.image(s.x, s.y, key);
      o.setDisplayOrigin(s.displayOriginX + 1, s.displayOriginY + 1);
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
    const s = this.def.sprites[0];
    const b = s.getBounds();
    for (let tries = 0; tries < 12; tries++) {
      const x = Phaser.Math.Between(Math.floor(b.left), Math.floor(b.right) - 1);
      const y = Phaser.Math.Between(Math.floor(b.top), Math.floor(b.bottom) - 1);
      const lx = Math.floor(x - b.left);
      const ly = Math.floor(y - b.top);
      const alpha = this.scene.textures.getPixelAlpha(lx, ly, s.texture.key, s.frame.name);
      if (alpha && alpha > 0) {
        const sp = this.scene.add.sprite(x, y, 'sparkle').setDepth(900000);
        sp.play('sparkle:loop');
        sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
        return;
      }
    }
  }

  destroy(): void {
    this.sparkTimer?.remove();
    this.highlight(false);
  }
}
