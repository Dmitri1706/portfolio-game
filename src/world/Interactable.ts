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
  /** Подпись над парящей стрелкой («Сайт», «Вебинар»…). Без подписи стрелки нет. */
  label?: string;
  /** Куда указывает стрелка (по умолчанию — верх первого спрайта). */
  markerAt?: { x: number; y: number };
}

/** Точка для стрелки у двери: на середине полотна, чтобы не закрывать вывеску. */
export function doorMarker(s: Obj): { x: number; y: number } {
  const b = s.getBounds();
  return { x: b.centerX, y: b.top + b.height * 0.45 };
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
  private marker?: Phaser.GameObjects.Container;
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
    if (def.label) this.marker = this.makeMarker(def.label);
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
    this.marker?.setVisible(on);
  }

  /** Парящая над предметом стрелка с подписью — сразу видно, куда нажимать. */
  private makeMarker(label: string): Phaser.GameObjects.Container {
    const scene = this.scene;
    const at = this.def.markerAt ?? (() => {
      const b = this.def.sprites[0].getBounds();
      return { x: b.centerX, y: b.top - 4 };
    })();
    // текст рисуется с запасом по чёткости: камера увеличивает игровые пиксели (а при постройке комнаты её зум ещё не задан)
    const res = Math.max(3, Math.ceil(scene.scale.height / 640) + 1);
    const t = scene.add.text(0, 0, label, {
      fontFamily: '"PT Sans", Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#fff3dc',
      resolution: res,
    });
    const w = Math.ceil(t.width) + 18;
    const h = Math.ceil(t.height) + 6;
    const top = -h - 20;
    t.setPosition(-t.width / 2, top + 3);
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2 + 1, top + 2, w, h, h / 2);
    g.fillStyle(0x1c1628, 0.86).fillRoundedRect(-w / 2, top, w, h, h / 2);
    g.lineStyle(1.5, 0xffc34d, 0.9).strokeRoundedRect(-w / 2, top, w, h, h / 2);
    // стрелка вниз
    g.fillStyle(0xffc34d, 1).fillTriangle(-8, -14, 8, -14, 0, -2);
    g.lineStyle(1.5, 0x1c1628, 1).strokeTriangle(-8, -14, 8, -14, 0, -2);
    const c = scene.add.container(at.x, at.y, [g, t]).setDepth(950000);
    scene.tweens.add({ targets: c, y: at.y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return c;
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
    this.marker?.destroy();
    for (const s of this.def.sprites) if (s.active) s.removeAllListeners().disableInteractive();
  }
}
