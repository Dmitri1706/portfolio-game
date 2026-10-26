// Рисование текста пиксельными шрифтами (Tiny5, Press Start 2P) прямо в спрайты.
// Шрифты построены на сетке 8px, поэтому при размере 8 каждый пиксель шрифта = 1 пиксель спрайта.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Canvas } from './canvas.mjs';

const require = createRequire(import.meta.url);
const opentype = require('opentype.js');
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fonts');

function load(file) {
  const buf = fs.readFileSync(path.join(dir, file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
}

const FAMILIES = {
  tiny: { latin: load('tiny5-latin-400-normal.woff'), cyr: load('tiny5-cyrillic-400-normal.woff'), ascent: 7, lineHeight: 8 },
  press: {
    latin: load('press-start-2p-latin-400-normal.woff'),
    cyr: load('press-start-2p-cyrillic-400-normal.woff'),
    ascent: 7,
    lineHeight: 10,
  },
};
const SIZE = 8;

function fontFor(fam, ch) {
  const code = ch.codePointAt(0);
  return (code >= 0x400 && code <= 0x52f) || code === 0x2116 ? fam.cyr : fam.latin;
}

function advance(fam, ch) {
  const f = fontFor(fam, ch);
  return Math.round((f.charToGlyph(ch).advanceWidth * SIZE) / f.unitsPerEm);
}

export function measure(text, family = 'tiny') {
  const fam = FAMILIES[family];
  let w = 0;
  for (const ch of text) w += advance(fam, ch);
  return w;
}

export function lineHeight(family = 'tiny') {
  return FAMILIES[family].lineHeight;
}

/** Точка внутри многоугольников (правило ненулевой обмотки). */
function inside(polys, x, y) {
  let wind = 0;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      if (y1 <= y) {
        if (y2 > y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) > 0) wind++;
      } else if (y2 <= y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) < 0) wind--;
    }
  }
  return wind !== 0;
}

/** Рисует строку. (x, y) — левый верхний угол строки. Возвращает ширину. */
export function drawText(c, text, x, y, color, family = 'tiny') {
  const fam = FAMILIES[family];
  const baseline = y + fam.ascent;
  let pen = x;
  for (const ch of text) {
    const f = fontFor(fam, ch);
    const p = f.charToGlyph(ch).getPath(pen, baseline, SIZE);
    const polys = [];
    let cur = null;
    for (const cmd of p.commands) {
      if (cmd.type === 'M') {
        cur = [[cmd.x, cmd.y]];
        polys.push(cur);
      } else if (cmd.type !== 'Z' && cur) cur.push([cmd.x, cmd.y]);
    }
    const adv = advance(fam, ch);
    if (polys.length) {
      const b = p.getBoundingBox();
      const pixels = [];
      for (let py = Math.floor(b.y1); py <= Math.ceil(b.y2); py++)
        for (let px = Math.floor(b.x1); px <= Math.ceil(b.x2); px++)
          if (inside(polys, px + 0.5, py + 0.5)) {
            c.set(px, py, color);
            pixels.push([px, py]);
          }
      if (pixels.length) c.spans.push({ cx: pen + Math.floor(adv / 2), pixels });
    }
    pen += adv;
  }
  return pen - x;
}

/** Текст в отдельный холст (несколько строк по центру). */
export function textBlock(lines, color, family = 'tiny') {
  const w = Math.max(...lines.map((l) => measure(l, family)));
  const lh = lineHeight(family);
  // +1 сверху — место для «й» и «ё»
  const c = new Canvas(w, lh * lines.length + 2);
  lines.forEach((l, i) => drawText(c, l, Math.floor((w - measure(l, family)) / 2), i * lh + 1, color, family));
  return c;
}
