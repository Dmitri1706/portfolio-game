import Phaser from 'phaser';

const INK = 0x231d33;
const PAPER = 0xfffaf0;

/** Облачко с текстом над головой персонажа. Само исчезает через несколько секунд. */
export class Bubble {
  readonly container: Phaser.GameObjects.Container;
  private timer: Phaser.Time.TimerEvent;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    duration = 3200,
  ) {
    // текст рисуется с запасом по чёткости: камера увеличивает игровые пиксели
    const res = Math.max(2, Math.ceil(scene.cameras.main.zoom * (window.devicePixelRatio || 1)));
    const t = scene.add.text(0, 0, text, {
      fontFamily: '"PT Sans", Arial, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#231d33',
      align: 'center',
      wordWrap: { width: 200, useAdvancedWrap: true },
      lineSpacing: 1,
      resolution: res,
    });
    const w = Math.ceil(t.width) + 24;
    const h = Math.ceil(t.height) + 14;
    const left = -Math.floor(w / 2);
    const top = -h - 12;
    t.setPosition(left + 12, top + 7);

    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.25).fillRoundedRect(left + 3, top + 4, w, h, 10);
    g.fillStyle(PAPER, 1).fillRoundedRect(left, top, w, h, 10);
    g.lineStyle(2.5, INK, 1).strokeRoundedRect(left, top, w, h, 10);
    // хвостик
    g.fillStyle(PAPER, 1).fillTriangle(-8, top + h - 1.5, 8, top + h - 1.5, 0, top + h + 10);
    g.lineStyle(2.5, INK, 1).lineBetween(-8, top + h, 0, top + h + 10).lineBetween(8, top + h, 0, top + h + 10);

    this.container = scene.add.container(x, y, [g, t]);
    this.container.setDepth(1_000_000);
    this.container.setScale(0.3);
    scene.tweens.add({ targets: this.container, scale: 1, duration: 180, ease: 'Back.Out' });
    this.timer = scene.time.delayedCall(duration, () => this.destroy(true));
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  destroy(animated = false): void {
    this.timer.remove();
    if (!this.container.active) return;
    if (animated) {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        y: this.container.y - 8,
        duration: 220,
        onComplete: () => this.container.destroy(),
      });
    } else this.container.destroy();
  }
}
