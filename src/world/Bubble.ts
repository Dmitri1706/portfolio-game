import Phaser from 'phaser';

const INK = 0x231d33;
const PAPER = 0xffffff;

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
    const t = scene.add.text(0, 0, text, {
      fontFamily: 'Tiny5',
      fontSize: '8px',
      color: '#231d33',
      align: 'center',
      wordWrap: { width: 112, useAdvancedWrap: true },
      padding: { top: 1, bottom: 1 },
    });
    t.setOrigin(0, 0);
    const w = Math.ceil(t.width) + 10;
    const h = Math.ceil(t.height) + 6;
    const left = -Math.floor(w / 2);
    const top = -h - 4;
    t.setPosition(left + 5, top + 3);

    // пиксельное облачко: скруглённые на 1 пиксель углы, контур и хвостик вниз
    const g = scene.add.graphics();
    g.fillStyle(INK);
    g.fillRect(left + 1, top, w - 2, h);
    g.fillRect(left, top + 1, w, h - 2);
    g.fillStyle(PAPER);
    g.fillRect(left + 1, top + 1, w - 2, h - 2);
    // хвостик
    g.fillStyle(INK);
    g.fillRect(-3, top + h - 1, 7, 1);
    g.fillRect(-2, top + h, 5, 1);
    g.fillRect(-1, top + h + 1, 3, 1);
    g.fillRect(0, top + h + 2, 1, 1);
    g.fillStyle(PAPER);
    g.fillRect(-2, top + h - 1, 5, 1);
    g.fillRect(-1, top + h, 3, 1);
    g.fillRect(0, top + h + 1, 1, 1);

    this.container = scene.add.container(Math.round(x), Math.round(y), [g, t]);
    this.container.setDepth(1_000_000);
    this.container.setScale(0.3);
    scene.tweens.add({ targets: this.container, scale: 1, duration: 140, ease: 'Back.Out' });
    this.timer = scene.time.delayedCall(duration, () => this.destroy(true));
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(Math.round(x), Math.round(y));
  }

  destroy(animated = false): void {
    this.timer.remove();
    if (!this.container.active) return;
    if (animated) {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        y: this.container.y - 4,
        duration: 220,
        onComplete: () => this.container.destroy(),
      });
    } else this.container.destroy();
  }
}
