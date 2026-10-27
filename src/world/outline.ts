import Phaser from 'phaser';

export const OUTLINE_COLOR = [255, 190, 60] as const;

/**
 * Делает (один раз) текстуру-контур для кадра спрайта: кольцо толщиной pad пикселей вокруг непрозрачной части,
 * к краю — мягко затухающее. Контур на pad пикселей больше кадра с каждой стороны.
 */
export function outlineTexture(
  scene: Phaser.Scene,
  key: string,
  frame: string | number,
  pad = 1,
  color: readonly [number, number, number] = OUTLINE_COLOR,
): string {
  const outKey = `${key}#${frame}#outline${pad}#${color.join(',')}`;
  if (scene.textures.exists(outKey)) return outKey;
  const f = scene.textures.getFrame(key, frame);
  const w = f.cutWidth;
  const h = f.cutHeight;
  const W = w + pad * 2;
  const H = h + pad * 2;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, w, h, pad, pad, w, h);
  const src = ctx.getImageData(0, 0, W, H).data;
  // dist: на каком шаге расширения пиксель попал в контур (0 — сам предмет)
  const dist = new Int16Array(W * H).fill(-1);
  let front: number[] = [];
  for (let i = 0; i < W * H; i++) if (src[i * 4 + 3] > 96) {
    dist[i] = 0;
    front.push(i);
  }
  for (let step = 1; step <= pad; step++) {
    const next: number[] = [];
    for (const i of front) {
      const x = i % W;
      const y = (i - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (dist[j] !== -1) continue;
        dist[j] = step;
        next.push(j);
      }
    }
    front = next;
  }
  const out = ctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    if (dist[i] <= 0) continue;
    const a = pad === 1 ? 255 : Math.round(255 * Math.min(1, 1.6 - (dist[i] - 1) / pad));
    out.data[i * 4] = color[0];
    out.data[i * 4 + 1] = color[1];
    out.data[i * 4 + 2] = color[2];
    out.data[i * 4 + 3] = a;
  }
  ctx.clearRect(0, 0, W, H);
  ctx.putImageData(out, 0, 0);
  scene.textures.addCanvas(outKey, cv);
  return outKey;
}
