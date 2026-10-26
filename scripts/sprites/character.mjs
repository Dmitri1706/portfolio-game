// Персонаж игрока: парень в очках, футболка, джинсы, белые кроссовки.
// Кадр 24×40, ноги стоят на строке 38. Нарисован смотрящим вправо — влево игра его отражает.
import { Canvas } from '../lib/canvas.mjs';
import { P } from '../lib/palette.mjs';

/**
 * Рисует один кадр.
 * view   — 'front' (лицом к нам, вниз-вправо) или 'back' (спиной, вверх-вправо)
 * bob    — насколько опущено туловище (дыхание, шаг, присед)
 * lean   — наклон туловища вправо (спотыкание)
 * legs   — 'stand' | 'sit' | 'squat' | 'dangle'
 * arms   — 'down' | 'forward' | 'up' | 'flail' | 'out'
 */
export function person({
  view = 'front',
  bob = 0,
  lean = 0,
  legs = 'stand',
  liftL = 0,
  liftR = 0,
  arms = 'down',
  arm = 0,
  blink = false,
  mouth = false,
}) {
  const c = new Canvas(24, 40);
  const y0 = 3 + bob;
  const ux = lean;
  const front = view === 'front';

  // ----- ноги -----
  const leg = (x, top, bottom) => {
    if (bottom >= top) c.shadedRect(x, top, 4, bottom - top + 1, P.jeans, P.jeansLight, P.jeansDark);
  };
  const shoe = (x, y, w = 5) => {
    c.rect(x, y, w, 2, P.shoe);
    c.rect(x, y + 2, w, 1, P.shoeDark);
    if (!front) c.rect(x + 1, y, w - 2, 1, P.shoeDark);
  };
  if (legs === 'stand') {
    leg(7, y0 + 25, 35 - liftL);
    leg(13, y0 + 25, 35 - liftR);
    shoe(6, 36 - liftL);
    shoe(13, 36 - liftR);
  } else if (legs === 'squat') {
    leg(6, y0 + 25, 35);
    leg(14, y0 + 25, 35);
    c.rect(6, y0 + 25, 4, 1, P.jeansLight); // колени
    c.rect(14, y0 + 25, 4, 1, P.jeansLight);
    shoe(5, 36);
    shoe(14, 36);
  } else if (legs === 'dangle') {
    leg(8, y0 + 25, 34 - liftL);
    leg(12, y0 + 25, 34 - liftR);
    shoe(8, 35 - liftL, 4);
    shoe(12, 35 - liftR, 4);
  } else if (legs === 'sit' && front) {
    // бёдра «на нас» — короткие, голени вниз
    c.rect(7, y0 + 24, 10, 2, P.jeansLight);
    leg(7, y0 + 26, 35);
    leg(13, y0 + 26, 35);
    shoe(6, 36);
    shoe(13, 36);
  }
  // пояс
  c.shadedRect(7 + Math.sign(ux), y0 + 23, 10, 2, P.jeans, P.jeansLight, P.jeansDark);

  // ----- туловище -----
  c.shadedRect(6 + ux, y0 + 13, 12, 10, P.shirt, P.shirtLight, P.shirtDark);
  c.rect(6 + ux, y0 + 22, 12, 1, P.shirtDark);
  c.rect(10 + ux, y0 + 12, 4, 1, P.skinDark); // шея
  if (front) c.rect(10 + ux, y0 + 13, 4, 1, P.skinDark); // вырез

  // ----- руки -----
  const sleeve = (x, y, h, light) => c.rect(x + ux, y, 2, h, light ? P.shirtLight : P.shirtDark);
  const skin = (x, y, w, h, light) => c.rect(x + ux, y, w, h, light ? P.skin : P.skinDark);
  const armDown = (x, dy, light) => {
    sleeve(x, y0 + 13 + dy, 4, light);
    skin(x, y0 + 17 + dy, 2, 3, light);
    c.rect(x + ux, y0 + 20 + dy, 2, 1, P.skinDark);
  };
  const armUp = (x, dy, light) => {
    sleeve(x, y0 + 9 + dy, 5, light);
    skin(x, y0 + 5 + dy, 2, 4, light);
  };
  const armOut = (side) => {
    if (side < 0) {
      c.rect(1 + ux, y0 + 14, 5, 2, P.shirtLight);
      c.rect(0 + ux, y0 + 14, 1, 2, P.skin);
    } else {
      c.rect(18 + ux, y0 + 14, 3, 2, P.shirtDark);
      c.rect(21 + ux, y0 + 14, 2, 2, P.skinDark);
    }
  };
  if (arms === 'down') {
    armDown(4, arm, true);
    armDown(18, -arm, false);
  } else if (arms === 'forward') {
    sleeve(4, y0 + 13, 4, true);
    sleeve(18, y0 + 13, 4, false);
    if (front) {
      skin(5, y0 + 17, 4, 2, true);
      skin(15, y0 + 17, 4, 2, false);
    } else {
      skin(4, y0 + 17, 2, 1, true);
      skin(18, y0 + 17, 2, 1, false);
    }
  } else if (arms === 'up') {
    armUp(4, arm, true);
    armUp(18, -arm, false);
  } else if (arms === 'flail') {
    armUp(4, 0, true);
    armOut(1);
  } else if (arms === 'out') {
    armOut(-1);
    armOut(1);
  }

  // ----- голова -----
  if (front) {
    c.rect(7 + ux, y0 + 4, 10, 8, P.skin);
    c.rect(7 + ux, y0 + 4, 1, 8, P.skinLight);
    c.rect(16 + ux, y0 + 4, 1, 8, P.skinDark);
    c.set(6 + ux, y0 + 7, P.skin);
    c.set(17 + ux, y0 + 7, P.skinDark);
    // волосы
    c.rect(8 + ux, y0, 8, 1, P.hair);
    c.rect(7 + ux, y0 + 1, 10, 3, P.hair);
    c.rect(9 + ux, y0 + 1, 3, 1, P.hairLight);
    c.rect(7 + ux, y0 + 4, 5, 1, P.hair);
    c.rect(7 + ux, y0 + 5, 2, 1, P.hair);
    c.set(16 + ux, y0 + 4, P.hairDark);
    c.set(16 + ux, y0 + 5, P.hairDark);
    // очки: тонкая оправа, светлые стёкла, глаза смотрят вправо
    c.rect(8 + ux, y0 + 7, 3, 1, P.outline);
    c.rect(13 + ux, y0 + 7, 3, 1, P.outline);
    c.set(11 + ux, y0 + 8, P.outline);
    c.set(12 + ux, y0 + 8, P.outline);
    for (const x of [8, 13]) {
      c.set(x + ux, y0 + 8, P.lens);
      c.set(x + 1 + ux, y0 + 8, P.lens);
      c.set(x + 2 + ux, y0 + 8, blink ? P.lens : P.outline);
      c.rect(x + ux, y0 + 9, 3, 1, P.outline);
    }
    c.set(7 + ux, y0 + 8, P.outline);
    c.set(16 + ux, y0 + 8, P.outline);
    // рот
    if (mouth) c.rect(11 + ux, y0 + 10, 2, 2, P.skinDark);
    else c.rect(11 + ux, y0 + 10, 2, 1, P.skinDark);
  } else {
    c.rect(8 + ux, y0, 8, 1, P.hair);
    c.rect(7 + ux, y0 + 1, 10, 10, P.hair);
    c.rect(8 + ux, y0 + 2, 3, 1, P.hairLight);
    c.rect(8 + ux, y0 + 3, 1, 3, P.hairLight);
    c.rect(16 + ux, y0 + 1, 1, 10, P.hairDark);
    c.rect(8 + ux, y0 + 11, 8, 1, P.skinDark);
    c.set(6 + ux, y0 + 7, P.skin);
    c.set(17 + ux, y0 + 7, P.skinDark);
    c.set(6 + ux, y0 + 6, P.outline); // дужки очков
    c.set(17 + ux, y0 + 6, P.outline);
  }

  c.outline(P.outline);
  return c;
}

function walkCycle(view, arms = 'down') {
  return [
    { view, arms, liftL: 2, arm: 1 },
    { view, arms, bob: 1 },
    { view, arms, liftR: 2, arm: -1 },
    { view, arms, bob: 1 },
  ];
}

function stumble(view) {
  return [
    { view, lean: 1, liftR: 3, arms: 'out' },
    { view, lean: 2, bob: 1, liftL: 2, arms: 'flail', mouth: true },
    { view, lean: 2, bob: 3, legs: 'squat', arms: 'flail', mouth: true },
    { view, lean: 1, bob: 1, arms: 'out' },
    { view },
  ];
}

/** Кадры каждой анимации. Имена совпадают с anims в src/assets/sprites.json. */
export const PLAYER_FRAMES = {
  idle_front: [{ view: 'front' }, { view: 'front', blink: true }],
  idle_back: [{ view: 'back' }, { view: 'back', bob: 1 }],
  walk_front: walkCycle('front'),
  walk_back: walkCycle('back'),
  sit_front: [{ view: 'front', legs: 'sit', bob: 6, arms: 'forward' }],
  sit_back: [{ view: 'back', legs: 'sit', bob: 6, arms: 'forward' }],
  hold_front: [{ view: 'front', arms: 'forward' }, { view: 'front', arms: 'forward', bob: 1 }],
  hold_back: [{ view: 'back', arms: 'forward' }, { view: 'back', arms: 'forward', bob: 1 }],
  carry_front: walkCycle('front', 'forward'),
  carry_back: walkCycle('back', 'forward'),
  stumble_front: stumble('front'),
  stumble_back: stumble('back'),
  fall: [
    { view: 'front', legs: 'dangle', arms: 'up', mouth: true },
    { view: 'front', legs: 'dangle', arms: 'up', arm: 1, liftL: 1, mouth: true },
  ],
  land: [
    { view: 'front', legs: 'squat', bob: 4, arms: 'out' },
    { view: 'front', legs: 'squat', bob: 2 },
    { view: 'front', bob: 1 },
  ],
};

export function playerSheet(s) {
  const rows = Math.max(...Object.values(s.anims).map((a) => a.row)) + 1;
  const sheet = new Canvas(s.width * s.columns, s.height * rows);
  for (const [name, a] of Object.entries(s.anims)) {
    const list = PLAYER_FRAMES[name];
    if (!list) throw new Error(`Нет рисунка для анимации ${name}`);
    list.slice(0, a.frames).forEach((opts, i) => sheet.blit(person(opts), i * s.width, a.row * s.height));
  }
  return sheet;
}
