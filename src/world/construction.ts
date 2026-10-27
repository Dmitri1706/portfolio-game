import Phaser from 'phaser';
import { outlineTexture } from './outline';

/**
 * Эффект «предмет прямо сейчас мастерят»: пульсирующая светящаяся обводка по контуру
 * и вспышки сварки с разлетающимися искрами в случайных точках контура.
 */
export function constructionFx(scene: Phaser.Scene, img: Phaser.GameObjects.Image): void {
  const pad = 10;
  const k = img.scaleX;
  // оранжевое «раскалённое» свечение — не путается с жёлтой подсветкой при наведении
  const key = outlineTexture(scene, img.texture.key, img.frame.name, pad, [255, 120, 30]);
  const glow = scene.add
    .image(img.x - pad * k, img.y - pad * k, key)
    .setOrigin(0, 0)
    .setScale(k)
    .setDepth(img.depth - 0.02)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: glow, alpha: { from: 0.12, to: 0.6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  // мелкое дрожание яркости, как от сварки
  scene.time.addEvent({ delay: 70, loop: true, callback: () => glow.setTint(Math.random() < 0.15 ? 0xbfe9ff : 0xffffff) });

  // точки контура (в мировых координатах): непрозрачный пиксель, рядом с которым прозрачно
  const tk = img.texture.key;
  const fr = img.frame.name;
  const W = img.frame.cutWidth;
  const H = img.frame.cutHeight;
  const opaque = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && (scene.textures.getPixelAlpha(x, y, tk, fr) ?? 0) > 100;
  const pts: { x: number; y: number }[] = [];
  const step = 4;
  for (let y = 0; y < H; y += step)
    for (let x = 0; x < W; x += step) {
      if (!opaque(x, y)) continue;
      if (!opaque(x + step, y) || !opaque(x - step, y) || !opaque(x, y + step) || !opaque(x, y - step)) {
        pts.push({ x: img.x + x * k, y: img.y + y * k });
      }
    }
  if (!pts.length) return;

  const weld = () => {
    const p = pts[Math.floor(Math.random() * pts.length)];
    const flash = scene.add
      .image(p.x, p.y, 'weld_flash')
      .setDepth(img.depth + 2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(Phaser.Math.FloatBetween(0.7, 1.2));
    scene.tweens.add({ targets: flash, alpha: { from: 1, to: 0 }, duration: 140, repeat: 1, onComplete: () => flash.destroy() });
    const n = Phaser.Math.Between(8, 16);
    for (let i = 0; i < n; i++) {
      const s = scene.add.image(p.x, p.y, 'spark').setDepth(img.depth + 1).setBlendMode(Phaser.BlendModes.ADD);
      s.setScale(Phaser.Math.FloatBetween(0.6, 1.1));
      const a = Phaser.Math.FloatBetween(-Math.PI * 0.95, -Math.PI * 0.05); // веером вверх
      const v = Phaser.Math.FloatBetween(70, 190);
      const vx = Math.cos(a) * v;
      const vy = Math.sin(a) * v;
      const life = Phaser.Math.Between(380, 750);
      scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: life,
        onUpdate: (tw) => {
          const u = tw.getValue() ?? 0;
          const t = (u * life) / 1000;
          s.setPosition(p.x + vx * t, p.y + vy * t + 0.5 * 420 * t * t);
          s.setAlpha(1 - u * u);
        },
        onComplete: () => s.destroy(),
      });
    }
  };
  // сварка идёт сериями: несколько вспышек подряд, потом пауза
  const burst = () => {
    const count = Phaser.Math.Between(2, 4);
    for (let i = 0; i < count; i++) scene.time.delayedCall(i * Phaser.Math.Between(90, 160), weld);
    scene.time.delayedCall(Phaser.Math.Between(700, 1600), burst);
  };
  burst();
}
