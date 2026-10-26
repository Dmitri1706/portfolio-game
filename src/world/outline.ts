import Phaser from 'phaser';

export const OUTLINE_COLOR = [255, 182, 39] as const;

/**
 * Делает (один раз) текстуру-контур для кадра спрайта: кольцо в 1 пиксель вокруг непрозрачной части.
 * Контур на 1 пиксель больше кадра с каждой стороны.
 */
export function outlineTexture(scene: Phaser.Scene, key: string, frame: string | number): string {
  const outKey = `${key}#${frame}#outline`;
  if (scene.textures.exists(outKey)) return outKey;
  const f = scene.textures.getFrame(key, frame);
  const w = f.cutWidth;
  const h = f.cutHeight;
  const cv = document.createElement('canvas');
  cv.width = w + 2;
  cv.height = h + 2;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, w, h, 1, 1, w, h);
  const src = ctx.getImageData(0, 0, cv.width, cv.height);
  const out = ctx.createImageData(cv.width, cv.height);
  const a = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < cv.width && y < cv.height ? src.data[(y * cv.width + x) * 4 + 3] : 0;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (a(x, y) > 0) continue;
      if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) {
        const i = (y * cv.width + x) * 4;
        out.data[i] = OUTLINE_COLOR[0];
        out.data[i + 1] = OUTLINE_COLOR[1];
        out.data[i + 2] = OUTLINE_COLOR[2];
        out.data[i + 3] = 255;
      }
    }
  }
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.putImageData(out, 0, 0);
  scene.textures.addCanvas(outKey, cv);
  return outKey;
}
