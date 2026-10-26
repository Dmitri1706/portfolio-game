/** Звуки игры. Сами звуки и кнопка 🔊 появятся на Этапе 5 — пока вызовы ничего не делают. */
export type Sfx =
  | 'step'
  | 'door'
  | 'fall'
  | 'land'
  | 'bump'
  | 'pickup'
  | 'place'
  | 'type'
  | 'applause'
  | 'achievement';

export function sfx(_name: Sfx): void {
  // Этап 5
}
