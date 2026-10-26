// Простой «пиксельный холст» для рисования спрайтов кодом и сохранения в PNG.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

/** '#rrggbb' (+ прозрачность 0..255) → [r, g, b, a] */
export function hex(s, a = 255) {
  const n = parseInt(s.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

export class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
    /**
     * «Неразрывные» группы пикселей (буквы, значки): { cx, pixels: [[x, y], …] }.
     * При переносе на изометрическую стену группа сдвигается целиком (по своему центру cx),
     * чтобы буквы не ломались лесенкой.
     */
    this.spans = [];
  }

  /** Отметить прямоугольник как неразрывную группу (все непрозрачные пиксели в нём). */
  keepTogether(x, y, w, h) {
    const pixels = [];
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.get(i, j)) pixels.push([i, j]);
    this.spans.push({ cx: x + Math.floor(w / 2), pixels });
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (!c || !this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = c[3] ?? 255;
  }

  /** Цвет пикселя или null, если он прозрачный. */
  get(x, y) {
    if (!this.inside(x, y)) return null;
    const i = (y * this.w + x) * 4;
    if (this.data[i + 3] === 0) return null;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  /** Прямоугольник со светом сверху слева: левый столбец светлее, правый и нижний — темнее. */
  shadedRect(x, y, w, h, base, light, dark) {
    this.rect(x, y, w, h, base);
    if (light) this.rect(x, y, 1, h, light);
    if (dark) {
      this.rect(x + w - 1, y, 1, h, dark);
    }
  }

  /** Обводка: каждый прозрачный пиксель рядом с непрозрачным красится в цвет контура. */
  outline(c) {
    const marks = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) {
          marks.push([x, y]);
        }
      }
    }
    for (const [x, y] of marks) this.set(x, y, c);
  }

  /** Копирует другой холст в этот (прозрачные пиксели пропускаются). */
  blit(src, dx, dy, flipX = false) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(flipX ? src.w - 1 - x : x, y);
        if (c) this.set(dx + x, dy + y, c);
      }
    }
    if (!flipX) {
      for (const s of src.spans) this.spans.push({ cx: s.cx + dx, pixels: s.pixels.map(([x, y]) => [x + dx, y + dy]) });
    }
  }

  /** Увеличенная копия (каждый пиксель → k×k). */
  scaled(k) {
    const c = new Canvas(this.w * k, this.h * k);
    for (let y = 0; y < c.h; y++)
      for (let x = 0; x < c.w; x++) {
        const col = this.get(Math.floor(x / k), Math.floor(y / k));
        if (col) c.set(x, y, col);
      }
    return c;
  }

  png() {
    const png = new PNG({ width: this.w, height: this.h });
    png.data = Buffer.from(this.data);
    return PNG.sync.write(png);
  }

  save(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, this.png());
  }
}
