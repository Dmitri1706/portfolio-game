// Генератор пиксельных спрайтов: npm run sprites
// Рисует все спрайты кодом и сохраняет PNG в public/assets/sprites/.
// Размеры и раскладка берутся из src/assets/sprites.json (тот же файл читает игра).
//
// Чтобы генератор НЕ перезаписывал ваш собственный спрайт, впишите имя файла
// (например player.png) отдельной строкой в public/assets/sprites/custom-sprites.txt
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Canvas } from './lib/canvas.mjs';
import { P } from './lib/palette.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/sprites.json'), 'utf8'));
const outDir = path.join(root, 'public/assets/sprites');
const keepFile = path.join(outDir, 'custom-sprites.txt');
const keep = new Set(
  fs.existsSync(keepFile)
    ? fs.readFileSync(keepFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
    : [],
);

const WALL_H = 72;
const FLOOR_T = 6;

// ---------- Геометрия ромба 32×16 ----------
// В строке y ромб занимает столбцы [16 - hw, 15 + hw], где hw = 2*min(y, 15-y) + 1.
function diamondRow(y) {
  const yy = Math.min(y, 15 - y);
  const hw = 2 * yy + 1;
  return [16 - hw, 15 + hw];
}
// Первая (верхняя) строка ромба в столбце x
const topRowAt = (x) => (x < 16 ? Math.ceil((15 - x) / 2) : Math.ceil((x - 16) / 2));
// Последняя (нижняя) строка ромба в столбце x
const bottomRowAt = (x) => 15 - topRowAt(x);

// ---------- Пол ----------
function floorTile(base, edge, light) {
  const c = new Canvas(32, 16);
  for (let y = 0; y < 16; y++) {
    const [a, b] = diamondRow(y);
    for (let x = a; x <= b; x++) c.set(x, y, base);
    if (y < 8) c.set(a, y, light);
    if (y >= 8) {
      c.set(a, y, edge);
      c.set(b, y, edge);
    }
  }
  for (let x = 0; x < 32; x++) c.set(x, bottomRowAt(x), edge);
  return c;
}

function floorEdge(side) {
  const c = new Canvas(16, 16 + FLOOR_T);
  for (let k = 0; k < 16; k++) {
    const x = side === 'left' ? k : k + 16;
    const top = bottomRowAt(x) + 1;
    for (let t = 0; t < FLOOR_T; t++) {
      let col = side === 'left' ? P.gray2 : P.gray3;
      if (t === 0) col = side === 'left' ? P.gray3 : P.gray4;
      if (t === FLOOR_T - 1) col = P.gray5;
      c.set(k, top + t, col);
    }
  }
  return c;
}

// ---------- Стены ----------
function wall(side, base, cap, base2) {
  const c = new Canvas(16, WALL_H + 8);
  for (let k = 0; k < 16; k++) {
    const x = side === 'left' ? k : k + 16;
    const top = topRowAt(x);
    for (let t = 0; t < WALL_H; t++) {
      let col = base;
      if (t === 0) col = P.gray3;
      else if (t === 1) col = cap;
      else if (t >= WALL_H - 5) col = t === WALL_H - 5 ? P.gray3 : base2;
      c.set(k, top + t, col);
    }
  }
  return c;
}

// ---------- Отдельно стоящая заколоченная дверь ----------
// Плоскость двери идёт вдоль оси X сетки (сверху-слева вниз-направо), лицом к зрителю слева.
function doorFreeBoarded() {
  const c = new Canvas(36, 67);
  const H = 46;
  const H0 = 48;
  const plane = (ox, oy, colorAt) => {
    for (let k = 0; k < 32; k++) {
      for (let t = 0; t < H; t++) c.set(ox + k, oy + H0 + Math.floor(k / 2) - t, colorAt(k, t));
    }
  };
  // задняя плоскость = толщина двери
  plane(3, -1, () => P.woodDark);
  plane(1, 0, (k, t) => {
    const post = k <= 2 || k >= 29;
    const lintel = t >= H - 4;
    if (post || lintel) {
      if (k === 0 || (lintel && t === H - 1)) return P.woodLight;
      if (k === 31 || (lintel && t === H - 4 && !post)) return P.woodDark;
      return P.wood;
    }
    // доски крест-накрест
    for (const [t0, slope] of [
      [10, 0.75],
      [36, -0.75],
    ]) {
      const d = t - (t0 + slope * k);
      if (d >= -2 && d < 2) {
        if ((k === 5 || k === 26) && Math.floor(d) === 0) return P.nail;
        return d >= 1 ? P.woodLight : d < -1 ? P.woodDark : P.wood;
      }
    }
    // полотно двери
    if (k === 3 || t === H - 5) return P.gray3;
    if (k >= 6 && k <= 25 && (t === 6 || t === 38) ) return P.gray2;
    if (k === 22 && t >= 18 && t <= 20) return P.gray4; // ручка
    return k < 8 ? P.white : P.white2;
  });
  c.outline(P.outline);
  return c;
}

// ---------- Мелочи ----------
function shadow() {
  const c = new Canvas(16, 6);
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 16; x++) {
      const dx = (x - 7.5) / 8;
      const dy = (y - 2.5) / 3;
      if (dx * dx + dy * dy <= 1) c.set(x, y, P.shadow);
    }
  return c;
}

function marker() {
  const c = new Canvas(64, 8);
  [7.5, 6.5, 5.5, 6.5].forEach((s, f) => {
    for (let x = 0; x < 16; x++) {
      const dist = Math.abs(x - 7.5);
      if (dist > s) continue;
      const yo = Math.floor((s - dist) / 2);
      const col = dist > s - 1.5 ? P.accentDark : P.accent;
      c.set(f * 16 + x, 3 - yo, col);
      c.set(f * 16 + x, 4 + yo, col);
    }
  });
  return c;
}

// ---------- Персонаж ----------
// Парень в очках, футболка, джинсы, белые кроссовки. Кадр 24×40, ноги стоят на строке 38.
// view: 'front' (смотрит вниз-вправо) или 'back' (вверх-вправо). Влево — зеркалим в игре.
function person({ view, bob = 0, liftL = 0, liftR = 0, arm = 0, blink = false }) {
  const c = new Canvas(24, 40);
  const y0 = 3 + bob;

  // ноги
  const leg = (x, lift) => {
    const top = y0 + 25;
    const bottom = 35 - lift;
    c.shadedRect(x, top, 4, bottom - top + 1, P.jeans, P.jeansLight, P.jeansDark);
  };
  leg(7, liftL);
  leg(13, liftR);
  // кроссовки
  const shoe = (x, lift) => {
    c.rect(x, 36 - lift, 5, 2, P.shoe);
    c.rect(x, 38 - lift, 5, 1, P.shoeDark);
    if (view === 'back') c.rect(x + 1, 36 - lift, 3, 1, P.shoeDark);
  };
  shoe(6, liftL);
  shoe(13, liftR);
  // пояс
  c.shadedRect(7, y0 + 23, 10, 2, P.jeans, P.jeansLight, P.jeansDark);

  // руки
  const armAt = (x, dy, light) => {
    c.rect(x, y0 + 13 + dy, 2, 4, light ? P.shirtLight : P.shirtDark);
    c.rect(x, y0 + 17 + dy, 2, 4, light ? P.skin : P.skinDark);
    c.rect(x, y0 + 20 + dy, 2, 1, P.skinDark);
  };
  armAt(4, arm, true);
  armAt(18, -arm, false);

  // туловище
  c.shadedRect(6, y0 + 13, 12, 10, P.shirt, P.shirtLight, P.shirtDark);
  c.rect(6, y0 + 22, 12, 1, P.shirtDark);
  c.rect(10, y0 + 12, 4, 1, P.skinDark); // шея

  if (view === 'front') {
    c.rect(10, y0 + 13, 4, 1, P.skinDark); // вырез футболки
    // голова
    c.rect(7, y0 + 4, 10, 8, P.skin);
    c.rect(7, y0 + 4, 1, 8, P.skinLight);
    c.rect(16, y0 + 4, 1, 8, P.skinDark);
    c.set(6, y0 + 7, P.skin);
    c.set(17, y0 + 7, P.skinDark);
    // волосы
    c.rect(8, y0, 8, 1, P.hair);
    c.rect(7, y0 + 1, 10, 3, P.hair);
    c.rect(9, y0 + 1, 3, 1, P.hairLight);
    c.rect(7, y0 + 4, 5, 1, P.hair);
    c.rect(7, y0 + 5, 2, 1, P.hair);
    c.set(16, y0 + 4, P.hairDark);
    c.set(16, y0 + 5, P.hairDark);
    // очки
    c.rect(8, y0 + 7, 8, 1, P.outline);
    const eye = blink ? P.lens : P.outline;
    [8, 12].forEach((x) => {
      c.set(x, y0 + 8, P.outline);
      c.set(x + 1, y0 + 8, P.lens);
      c.set(x + 2, y0 + 8, eye);
      c.set(x + 3, y0 + 8, P.outline);
      c.set(x + 1, y0 + 9, P.outline);
      c.set(x + 2, y0 + 9, P.outline);
    });
    // рот
    c.rect(11, y0 + 10, 2, 1, P.skinDark);
  } else {
    // затылок
    c.rect(8, y0, 8, 1, P.hair);
    c.rect(7, y0 + 1, 10, 10, P.hair);
    c.rect(8, y0 + 2, 3, 1, P.hairLight);
    c.rect(8, y0 + 3, 1, 3, P.hairLight);
    c.rect(16, y0 + 1, 1, 10, P.hairDark);
    c.rect(8, y0 + 11, 8, 1, P.skinDark);
    c.set(6, y0 + 7, P.skin);
    c.set(17, y0 + 7, P.skinDark);
    c.set(6, y0 + 6, P.outline); // дужки очков
    c.set(17, y0 + 6, P.outline);
  }

  c.outline(P.outline);
  return c;
}

function playerSheet(s) {
  const frames = {
    idle_front: [{ view: 'front' }, { view: 'front', blink: true }],
    idle_back: [{ view: 'back' }, { view: 'back', bob: 1 }],
    walk_front: walkCycle('front'),
    walk_back: walkCycle('back'),
  };
  const rows = Math.max(...Object.values(s.anims).map((a) => a.row)) + 1;
  const sheet = new Canvas(s.width * s.columns, s.height * rows);
  for (const [name, a] of Object.entries(s.anims)) {
    const list = frames[name];
    if (!list) throw new Error(`Нет рисунка для анимации ${name}`);
    list.slice(0, a.frames).forEach((opts, i) => sheet.blit(person(opts), i * s.width, a.row * s.height));
  }
  return sheet;
}

function walkCycle(view) {
  return [
    { view, liftL: 2, arm: 1 },
    { view, bob: 1 },
    { view, liftR: 2, arm: -1 },
    { view, bob: 1 },
  ];
}

// ---------- Сборка ----------
const drawers = {
  floor_lobby: () => floorTile(P.white2, P.gray1, P.white),
  floor_edge_left: () => floorEdge('left'),
  floor_edge_right: () => floorEdge('right'),
  wall_lobby_left: () => wall('left', P.gray1, P.white2, P.gray2),
  wall_lobby_right: () => wall('right', P.white, P.white, P.gray1),
  door_free_boarded: doorFreeBoarded,
  shadow,
  marker,
  player: () => playerSheet(spec.player),
};

let made = 0;
for (const [key, s] of Object.entries(spec)) {
  const draw = drawers[key];
  if (!draw) {
    console.warn(`⚠ Для «${key}» нет рисовальщика — пропускаю`);
    continue;
  }
  if (keep.has(s.file)) {
    console.log(`• ${s.file} — оставляю ваш файл (custom-sprites.txt)`);
    continue;
  }
  const c = draw();
  const expectW = s.columns ? s.width * s.columns : s.frames ? s.width * s.frames : s.width;
  if (c.w !== expectW || (!s.anims && c.h !== s.height)) {
    console.warn(`⚠ ${s.file}: размер ${c.w}×${c.h} не совпадает с sprites.json`);
  }
  c.save(path.join(outDir, s.file));
  made++;
}
console.log(`Готово: ${made} спрайтов в public/assets/sprites/`);
