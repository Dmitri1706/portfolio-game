// Заглушки материалов: npm run placeholders
// Создаёт в public/materials/ PDF и картинку-скриншот, ТОЛЬКО если такого файла ещё нет.
// Ваши настоящие файлы скрипт никогда не перезаписывает.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { Canvas } from './lib/canvas.mjs';
import { P } from './lib/palette.mjs';
import { drawText, measure } from './lib/text.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/materials');
fs.mkdirSync(out, { recursive: true });

const center = (c, text, y, color, fam) => drawText(c, text, Math.floor((c.w - measure(text, fam)) / 2), y, color, fam);

function slide(n, total) {
  const c = new Canvas(320, 180);
  c.rect(0, 0, 320, 180, P.white);
  c.rect(0, 0, 320, 28, P.vhodNavy);
  c.rect(0, 28, 320, 2, P.vhodNeon);
  drawText(c, `Слайд ${n} из ${total}`, 12, 10, P.white, 'press');
  if (n === total) {
    center(c, 'Спасибо!', 80, P.vhodNavy, 'press');
    center(c, 'Вопросы?', 100, P.gray4, 'tiny');
  } else {
    [20, 34, 46, 62, 80].slice(0, 2 + n).forEach((h, i) => c.rect(30 + i * 22, 150 - h, 14, h, i % 2 ? P.vhodNeon2 : P.vhodNeon));
    drawText(c, 'Это заглушка презентации.', 170, 60, P.outline);
    drawText(c, 'Положите свой PDF в', 170, 76, P.gray4);
    drawText(c, 'public/materials/', 170, 88, P.gray4);
    drawText(c, 'presentation.pdf', 170, 100, P.gray4);
  }
  return c;
}

function a4(title, n, total, lines) {
  const c = new Canvas(210, 297);
  c.rect(0, 0, 210, 297, P.white);
  center(c, title, 16, P.outline, 'press');
  c.rect(14, 30, 182, 1, P.outline);
  c.rect(14, 32, 182, 1, P.outline);
  lines.forEach((l, i) => drawText(c, l, 18, 44 + i * 12, P.gray5));
  for (let i = 0; i < 12; i++) c.rect(18, 110 + i * 12, i % 4 === 3 ? 90 : 170, 4, P.gray1);
  center(c, `${n} / ${total}`, 280, P.gray4);
  return c;
}

async function pdf(file, pages) {
  const dest = path.join(out, file);
  if (fs.existsSync(dest)) return console.log(`• ${file} уже есть — не трогаю`);
  const doc = await PDFDocument.create();
  for (const { canvas, k } of pages) {
    const big = canvas.scaled(k);
    const img = await doc.embedPng(big.png());
    const page = doc.addPage([big.w, big.h]);
    page.drawImage(img, { x: 0, y: 0, width: big.w, height: big.h });
  }
  fs.writeFileSync(dest, await doc.save());
  console.log(`✓ ${file}`);
}

const T = 6;
await pdf(
  'presentation.pdf',
  Array.from({ length: T }, (_, i) => ({ canvas: slide(i + 1, T), k: 4 })),
);
await pdf(
  'mediakit.pdf',
  [1, 2, 3, 4].map((n) => ({
    canvas: a4('МЕДИАКИТ', n, 4, ['Заглушка медиакита.', 'Положите свой PDF:', 'public/materials/mediakit.pdf']),
    k: 3,
  })),
);
await pdf('resume.pdf', [
  { canvas: a4('РЕЗЮМЕ', 1, 1, ['Дмитрий Мельшин', 'Product / Маркетолог', 'Заглушка: public/materials/resume.pdf']), k: 3 },
]);

const shot = path.join(out, 'site-screenshot.png');
if (fs.existsSync(shot)) console.log('• site-screenshot.png уже есть — не трогаю');
else {
  const c = new Canvas(320, 1000);
  c.rect(0, 0, 320, 1000, P.white2);
  c.rect(0, 0, 320, 20, P.vhodNavy);
  drawText(c, 'В ХОД', 10, 6, P.white, 'press');
  c.rect(0, 20, 320, 140, P.vhodNavyDark);
  center(c, 'Скриншот сайта (заглушка)', 70, P.vhodNeon, 'tiny');
  center(c, 'public/materials/site-screenshot.png', 86, P.gray2, 'tiny');
  for (let s = 0; s < 5; s++) {
    const y = 190 + s * 160;
    c.rect(20, y, 280, 130, P.white);
    c.rect(20, y, 280, 1, P.gray2);
    drawText(c, `Блок ${s + 1}`, 32, y + 12, P.outline, 'press');
    for (let i = 0; i < 6; i++) c.rect(32, y + 34 + i * 12, i === 5 ? 120 : 250, 4, P.gray1);
    c.rect(32, y + 104, 70, 16, P.vhodNeon2);
  }
  c.scaled(3).save(shot);
  console.log('✓ site-screenshot.png');
}
