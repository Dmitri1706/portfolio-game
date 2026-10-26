// Единая палитра всех спрайтов игры. Свет падает сверху слева.
import { hex } from './canvas.mjs';

export const P = {
  outline: hex('#231d33'),

  // Белые и серые (лобби)
  white: hex('#ffffff'),
  white2: hex('#f3f4f8'),
  gray1: hex('#e2e5ee'),
  gray2: hex('#c9cedb'),
  gray3: hex('#a3aabd'),
  gray4: hex('#767e96'),
  gray5: hex('#4c5369'),

  // Кожа
  skin: hex('#f2c6a0'),
  skinLight: hex('#fbdcbf'),
  skinDark: hex('#d39874'),

  // Волосы
  hair: hex('#4a3226'),
  hairLight: hex('#6b4a38'),
  hairDark: hex('#2f1f18'),

  // Очки
  lens: hex('#c8e7ff'),

  // Футболка
  shirt: hex('#3f8f8a'),
  shirtLight: hex('#5fb3a9'),
  shirtDark: hex('#2b6563'),

  // Джинсы
  jeans: hex('#3d4c74'),
  jeansLight: hex('#56679a'),
  jeansDark: hex('#2a3452'),

  // Кроссовки
  shoe: hex('#f4f4f6'),
  shoeDark: hex('#b9bdcb'),

  // Дерево
  wood: hex('#b07a4f'),
  woodLight: hex('#cf9a68'),
  woodDark: hex('#7c5237'),
  nail: hex('#5c5f6e'),

  // Акцент (маркер, подсветки)
  accent: hex('#ffc94a'),
  accentDark: hex('#f08a24'),

  shadow: hex('#231d33', 70),
};
