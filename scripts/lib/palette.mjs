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

  // Проём открытой двери
  doorway: hex('#1d1828'),
  doorwayLight: hex('#38304f'),

  // «В ХОД»: технологичные неоновые акценты (поменяйте здесь на фирменные цвета)
  vhodNavy: hex('#1f2240'),
  vhodNavyDark: hex('#15172e'),
  vhodNeon: hex('#3de0e8'),
  vhodNeon2: hex('#ff4fd8'),

  // «Спортмастер»
  sportBlue: hex('#1d4fa0'),
  sportBlueLight: hex('#3a72c8'),
  sportBlueDark: hex('#133a7a'),
  sportRed: hex('#e0383e'),
  sportRedDark: hex('#a5262c'),

  // Стекло
  glass: hex('#bfe9f2'),
  glassLight: hex('#eafcff'),
  glassDark: hex('#8cc7d6'),

  // Полы комнат
  tile: hex('#e8ebf3'),
  tileLight: hex('#f6f7fb'),
  tileDark: hex('#d0d6e4'),
  parquet: hex('#d9a066'),
  parquetLight: hex('#e8b77f'),
  parquetDark: hex('#b47b45'),

  // Табличка «Выход»
  green: hex('#3fbf6a'),
  greenDark: hex('#25844a'),

  paper: hex('#fffaf0'),
  paperDark: hex('#e8dcc4'),

  // Офис
  leaf: hex('#4fae5a'),
  leafLight: hex('#7fd27a'),
  leafDark: hex('#2f7a45'),
  pot: hex('#e9e4dc'),
  potDark: hex('#bdb5a8'),
  desk: hex('#f4f1ea'),
  deskDark: hex('#c9c2b4'),
  deskSide: hex('#ddd7cb'),
  metal: hex('#3a3f55'),
  metalLight: hex('#565d7a'),
  metalDark: hex('#262a3b'),
  screen: hex('#2a3a66'),
  screenGlow: hex('#7ae8f0'),
  ledGreen: hex('#5cff8a'),
  ledOff: hex('#2d4a3a'),
  ledRed: hex('#ff5c6c'),
  noteYellow: hex('#ffe066'),
  notePink: hex('#ff9ec7'),
  noteBlue: hex('#9ed8ff'),
  noteGreen: hex('#b4f08c'),
  cork: hex('#c99a63'),
  corkDark: hex('#a77a48'),
  curtain: hex('#c8344a'),
  curtainDark: hex('#8f2236'),
  manila: hex('#f2c46d'),
  manilaDark: hex('#d39d3e'),

  shadow: hex('#231d33', 70),
  dust: hex('#e9e6f0'),
  dustDark: hex('#bdb7cc'),
};
