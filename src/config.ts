// Базовое разрешение игры в «игровых пикселях». Экран масштабирует его целиком.
export const GAME_W = 480;
export const GAME_H = 270;

// Изометрическая плитка: ромб 2:1
export const TILE_W = 32;
export const TILE_H = 16;

// Высота стен и толщина пола в пикселях (должны совпадать с генератором спрайтов)
export const WALL_H = 72;
export const FLOOR_T = 6;

// Скорость персонажа, клеток в секунду
export const PLAYER_SPEED = 3.4;

// Слои глубины. Всё, что стоит на полу, сортируется по экранной Y своей «точки опоры».
export const DEPTH = {
  floor: -100000,
  wall: -90000,
  marker: -80000,
  /** к этому прибавляется экранная Y предмета/персонажа */
  objects: 0,
};

export const BG_COLOR = '#2b2640';
